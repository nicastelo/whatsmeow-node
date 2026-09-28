---
title: "How to Triage WhatsApp Messages with Jev"
sidebar_label: Triage with Jev
sidebar_position: 29
description: "Route, prioritize, and moderate incoming WhatsApp messages with TypeSafe's Jev decision model and whatsmeow-node — and only call an LLM when a written reply is actually needed."
keywords: [whatsapp message triage, jev typesafe, typesafe ai system one, whatsapp message routing nodejs, whatsapp spam moderation bot, whatsapp llm router, classify whatsapp messages typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/triage-messages-with-jev.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/triage-messages-with-jev.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Triage WhatsApp Messages with Jev",
      "description": "Route, prioritize, and moderate incoming WhatsApp messages with TypeSafe's Jev decision model and whatsmeow-node — and only call an LLM when a written reply is actually needed.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/triage-messages-with-jev.png",
      "step": [
        {"@type": "HowToStep", "name": "Set Up Both Clients", "text": "Initialize WhatsmeowClient with createClient() and the Jev client with new TypeSafeClient(), pinning a model version."},
        {"@type": "HowToStep", "name": "Pass Recent Conversation as State", "text": "Keep the last N messages per chat and send them, plus the latest message and the message it replies to, as Jev state."},
        {"@type": "HowToStep", "name": "Route with a Choice Question", "text": "Ask a Choice question (billing, support, sales, human) and hand off to a person when confidence is below a threshold."},
        {"@type": "HowToStep", "name": "Score Urgency", "text": "Ask a Score question with an urgency rubric and escalate messages above a chosen level."},
        {"@type": "HowToStep", "name": "Moderate Groups with a Noul Question", "text": "Ask a yes/no Noul question for spam or abuse in groups and call revokeMessage() when the probability is above a high threshold."},
        {"@type": "HowToStep", "name": "Gate the LLM", "text": "Only call ChatGPT or Claude when Jev says the message needs a written answer, and reply with a quoted message."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Triage WhatsApp Messages with Jev",
      "description": "Route, prioritize, and moderate incoming WhatsApp messages with TypeSafe's Jev decision model and whatsmeow-node — and only call an LLM when a written reply is actually needed.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/triage-messages-with-jev.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Triage WhatsApp Messages with Jev](/img/guides/triage-messages-with-jev.png)
![How to Triage WhatsApp Messages with Jev](/img/guides/triage-messages-with-jev-light.png)

# How to Triage WhatsApp Messages with Jev

:::note SDK version
This guide was written against `@typesafe-ai/sdk` 0.6.0 from [TypeSafe AI](https://typesafe.ai). The SDK is still pre-1.0, so check the [TypeSafe docs](https://docs.typesafe.ai/) if something here no longer matches.
:::

[Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev) is a "System One" model: it doesn't write text. You send it a `state` (text, a JSON object, or an array) and a set of named, typed questions, and it returns structured answers:

- **Choice** — picks one option from a set (up to 255), with per-option probabilities and a confidence value
- **Score** — places the state on an ordered rubric of 2–10 levels
- **Noul** — a yes/no question answered as a probability from 0 to 1

That makes it a good fit for the decisions a WhatsApp bot makes on every message — which team should see this, how urgent is it, is it spam, does it need a reply at all — and a poor fit for writing the reply itself. This guide uses Jev for the decisions and an LLM only for the replies that need one.

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))
- A TypeSafe API key (set as `TYPESAFE_API_KEY` environment variable)
- The TypeSafe SDK (Node.js 20+): `npm install @typesafe-ai/sdk`
- For the LLM step: an OpenAI API key and `npm install openai` (see [Connect to ChatGPT](connect-to-chatgpt)) — or swap in Claude ([Connect to Claude AI](connect-to-ai))

## Step 1: Set Up Both Clients

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { TypeSafeClient } from "@typesafe-ai/sdk";

const client = createClient({ store: "session.db" });

// Reads TYPESAFE_API_KEY from env. The default model is "jev-latest",
// which can change under you — pin a version for stable behavior.
const jev = new TypeSafeClient({ defaultModel: "jev-1.13.0", timeout: 3_000 });
```

`timeout` is per attempt, in milliseconds. By default the SDK retries timeouts, connection errors, and `408`, `429`, and `5xx` responses twice, with backoff.

## Step 2: Pass Recent Conversation as State

A single message is often ambiguous ("yes please", "still broken"). Keep the last few messages per chat and send them as state, with the latest message separated out so your questions can refer to it:

```typescript
import type { MessageInfo } from "@whatsmeow-node/whatsmeow-node";

const HISTORY_SIZE = 10;

type ChatLine = { id: string; from: string; fromMe: boolean; text: string };
const history = new Map<string, ChatLine[]>();

function remember(chat: string, line: ChatLine) {
  const lines = history.get(chat) ?? [];
  lines.push(line);
  if (lines.length > HISTORY_SIZE) lines.splice(0, lines.length - HISTORY_SIZE);
  history.set(chat, lines);
}

function extractText(message: Record<string, unknown>) {
  const ext = message.extendedTextMessage as
    | { text?: string; contextInfo?: { stanzaID?: string } }
    | undefined;
  return {
    text: (message.conversation as string | undefined) ?? ext?.text,
    quotedId: ext?.contextInfo?.stanzaID,
  };
}

function buildState(info: MessageInfo, text: string, quotedId?: string) {
  const lines = history.get(info.chat) ?? [];
  const quoted = quotedId ? lines.find((l) => l.id === quotedId) : undefined;
  return {
    recentMessages: lines.map((l) => ({ from: l.fromMe ? "business" : l.from, text: l.text })),
    latestMessage: { from: info.pushName, text, repliesTo: quoted?.text ?? null },
  };
}
```

Plain text arrives as `message.conversation`; replies, links, and mentions arrive as `message.extendedTextMessage.text`. When the user replies to an earlier message, `extendedTextMessage.contextInfo.stanzaID` holds that message's ID — note the capital `ID`, matching the WhatsApp protobuf JSON name. Looking it up in the history lets Jev see what "yes please" is answering.

TypeSafe recommends a JSON object with descriptive keys over a bare string, and sending only what the questions need: extra context can lower accuracy.

Jev's primary training language is English. TypeSafe's [model docs](https://docs.typesafe.ai/models) say other languages are handled but not equally well, so if your chats aren't in English, test on real messages before you trust any threshold, especially the revoke one.

## Step 3: Route with a Choice Question

A Choice question picks one label. Describe each label so Jev knows where the boundaries are, and give yourself an explicit `human` option:

```typescript
import { choice } from "@typesafe-ai/sdk";

const ROUTE_MIN_CONFIDENCE = 0.5; // below this, a person decides

const route = choice("Which team should handle the latest message?", {
  billing: "Payments, invoices, refunds, double charges, or subscriptions",
  support: "Bugs, errors, how-to questions, or problems using the product",
  sales: "Pricing, plans, demos, or wanting to buy",
  human: "Complaints, legal threats, cancellations, or sensitive personal matters",
});

const { answers } = await jev.systemOne({
  state: buildState(info, text, quotedId),
  questions: { route },
});

answers.route.choice; // "billing" | "support" | "sales" | "human"
answers.route.confidence; // 0–1
answers.route.probabilities; // { billing: 0.91, support: 0.05, ... }

if (answers.route.choice === "human" || answers.route.confidence < ROUTE_MIN_CONFIDENCE) {
  // hand off to a person (see the complete example)
}
```

The SDK infers the answer types from the question, so `answers.route.choice` is typed as the union of your labels — a typo in a label comparison is a compile error.

`confidence` summarizes how concentrated the probabilities are. TypeSafe's [docs](https://docs.typesafe.ai/confidence) describe three ranges (act automatically at high confidence, proceed with caution at medium, and route to a person at low) and leave the boundaries to you, because they depend on the stakes. The numbers in this guide are its own starting points: 0.5 as the routing floor, because forwarding a message to a team chat is cheap to get wrong, and 0.9 for revoking a group message, which can't be undone. Tune them on your own data.

## Step 4: Score Urgency

A Score question places the state on a rubric you write, from level 0 upward (2–10 levels):

```typescript
import { score } from "@typesafe-ai/sdk";

const URGENT_SCORE = 2; // on the 0–3 rubric below

const urgency = score("How urgent is the latest message?", [
  "Not urgent; can wait a few days",
  "Normal; should be answered today",
  "Urgent; the customer is blocked or losing money",
  "Critical; outage, security incident, or safety concern",
]);

const { answers } = await jev.systemOne({ state, questions: { urgency } });

// answers.urgency.score is a probability-weighted average — e.g. 1.43
if (answers.urgency.score >= URGENT_SCORE) {
  // escalate to a person
}
```

`score` can fall between levels, so you can sort a queue by it or compare it against a threshold. Round it if your code needs a single level.

## Step 5: Moderate Groups with a Noul Question

A Noul question returns a single probability, `noul`, from 0 to 1 (there's no separate confidence value). In groups, use it to catch spam and abuse, and revoke the message only when the probability is high:

```typescript
import { noul } from "@typesafe-ai/sdk";

const ABUSE_REVOKE_THRESHOLD = 0.9; // revoking is destructive — keep the bar high

const abusive = noul("The latest message is spam, a scam, phishing, harassment, or abuse");

if (info.isGroup) {
  const { answers } = await jev.systemOne({ state, questions: { abusive } });
  if (answers.abusive.noul >= ABUSE_REVOKE_THRESHOLD) {
    await client.revokeMessage(info.chat, info.sender, info.id);
  }
}
```

`revokeMessage(chat, sender, id)` deletes the message for everyone. Passing another member's JID as `sender` sends an admin revoke, which only works if your account is an admin of the group.

## Step 6: Use Jev as a Cheap Gate in Front of an LLM

Many incoming messages don't need a generated answer: "thanks", "got it", "see you tomorrow", or something a person has to handle anyway. Calling an LLM for every one of them costs money and adds seconds of latency. Ask Jev first, and only call the LLM when it says a written reply is needed:

```typescript
const NEEDS_REPLY_THRESHOLD = 0.7;

const needsReply = noul("The latest message asks a question that needs a written answer", {
  true: "A question or request the business should answer in words",
  false: "Greetings, thanks, acknowledgements, or messages that only need routing",
});

const { answers, usage } = await jev.systemOne({
  state,
  questions: { route, urgency, needsReply },
});

if (answers.needsReply.noul >= NEEDS_REPLY_THRESHOLD) {
  await client.sendChatPresence(info.chat, "composing");
  await replyTo(info, message, await draftReply(info.chat, answers.route.choice));
}

console.log(`Jev used ${usage.input_tokens} input tokens`);
```

Jev answers every question in the request against the same state, and TypeSafe says extra questions add little latency. Asking `route`, `urgency`, and `needsReply` in one call costs about the same time as asking one.

Why this saves money and time, based on TypeSafe's published figures (their claims, not independent benchmarks):

- **Cost:** TypeSafe lists Jev at $0.042 per million input tokens, with output tokens free. A state of ten short WhatsApp messages plus three questions is roughly 1,000 input tokens, which works out to about $0.00004 per message — around $42 per million messages. Log `usage.input_tokens` to measure your real numbers.
- **Latency:** TypeSafe quotes 70–500 ms end to end. A generated LLM reply usually takes seconds, so skipping the LLM for messages that don't need an answer makes those messages resolve faster too.

Each skipped LLM call saves far more than the Jev call costs, so the gate pays for itself as long as a meaningful share of your traffic doesn't need a generated reply. Log the `needsReply` probabilities for a few days before you pick the threshold.

`draftReply` is an ordinary chat completion over the same history (see [Connect to ChatGPT](connect-to-chatgpt) or [Connect to Claude AI](connect-to-ai)), and `replyTo` sends a quoted reply by setting `contextInfo.stanzaID` to the incoming message's ID. Both are in the complete example below.

## Complete Example

Groups get moderation only. Direct messages are routed, scored, and answered by the LLM only when Jev says a written reply is needed. If Jev fails, the message goes to a person.

```typescript
import { createClient, type MessageInfo } from "@whatsmeow-node/whatsmeow-node";
import { TypeSafeClient, TypeSafeError, choice, noul, score } from "@typesafe-ai/sdk";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const client = createClient({ store: "session.db" });
const jev = new TypeSafeClient({ defaultModel: "jev-1.13.0", timeout: 3_000 });
const openai = new OpenAI();

// Where routed conversations go (a group or an agent's chat)
const TEAM_CHATS = {
  billing: "120363000000000001@g.us",
  support: "120363000000000002@g.us",
  sales: "120363000000000003@g.us",
} as const;
const HUMAN_CHAT = "5989XXXXXXXX@s.whatsapp.net";

const ROUTE_MIN_CONFIDENCE = 0.5; // below this, a person decides
const URGENT_SCORE = 2; // on the 0–3 urgency rubric
const NEEDS_REPLY_THRESHOLD = 0.7; // wake the LLM only above this
const ABUSE_REVOKE_THRESHOLD = 0.9; // revoking is destructive — keep the bar high
const HISTORY_SIZE = 10;

// ── Conversation history (last N messages per chat) ──

type ChatLine = { id: string; from: string; fromMe: boolean; text: string };
const history = new Map<string, ChatLine[]>();

function remember(chat: string, line: ChatLine) {
  const lines = history.get(chat) ?? [];
  lines.push(line);
  if (lines.length > HISTORY_SIZE) lines.splice(0, lines.length - HISTORY_SIZE);
  history.set(chat, lines);
}

function extractText(message: Record<string, unknown>) {
  const ext = message.extendedTextMessage as
    | { text?: string; contextInfo?: { stanzaID?: string } }
    | undefined;
  return {
    text: (message.conversation as string | undefined) ?? ext?.text,
    quotedId: ext?.contextInfo?.stanzaID,
  };
}

function buildState(info: MessageInfo, text: string, quotedId?: string) {
  const lines = history.get(info.chat) ?? [];
  const quoted = quotedId ? lines.find((l) => l.id === quotedId) : undefined;
  return {
    recentMessages: lines.map((l) => ({ from: l.fromMe ? "business" : l.from, text: l.text })),
    latestMessage: { from: info.pushName, text, repliesTo: quoted?.text ?? null },
  };
}

// ── Jev questions ──

const triageQuestions = {
  route: choice("Which team should handle the latest message?", {
    billing: "Payments, invoices, refunds, double charges, or subscriptions",
    support: "Bugs, errors, how-to questions, or problems using the product",
    sales: "Pricing, plans, demos, or wanting to buy",
    human: "Complaints, legal threats, cancellations, or sensitive personal matters",
  }),
  urgency: score("How urgent is the latest message?", [
    "Not urgent; can wait a few days",
    "Normal; should be answered today",
    "Urgent; the customer is blocked or losing money",
    "Critical; outage, security incident, or safety concern",
  ]),
  needsReply: noul("The latest message asks a question that needs a written answer", {
    true: "A question or request the business should answer in words",
    false: "Greetings, thanks, acknowledgements, or messages that only need routing",
  }),
};

const moderationQuestions = {
  abusive: noul("The latest message is spam, a scam, phishing, harassment, or abuse"),
};

// ── WhatsApp helpers ──

async function replyTo(info: MessageInfo, message: Record<string, unknown>, text: string) {
  const sent = await client.sendMessage(info.chat, {
    extendedTextMessage: {
      text,
      contextInfo: { stanzaID: info.id, participant: info.sender, quotedMessage: message },
    },
  });
  remember(info.chat, { id: sent.id, from: "business", fromMe: true, text });
}

async function handOff(
  info: MessageInfo,
  message: Record<string, unknown>,
  text: string,
  reason: string,
) {
  await client.sendMessage(HUMAN_CHAT, {
    conversation: `[handoff: ${reason}] ${info.pushName} (${info.sender}):\n${text}`,
  });
  await replyTo(info, message, "Thanks! A member of our team will reply here shortly.");
}

async function draftReply(chat: string, team: string): Promise<string> {
  const messages: ChatCompletionMessageParam[] = (history.get(chat) ?? []).map((l) => ({
    role: l.fromMe ? "assistant" : "user",
    content: l.text,
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-6-astra",
    messages: [
      {
        role: "system",
        content: `You are the ${team} assistant for our business on WhatsApp. Answer in under 500 characters.`,
      },
      ...messages,
    ],
  });
  return response.choices[0].message.content ?? "Let me get someone to help you with that.";
}

// ── Message handler ──

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const { text, quotedId } = extractText(message);
  if (!text) return;

  const state = buildState(info, text, quotedId);
  remember(info.chat, { id: info.id, from: info.pushName, fromMe: false, text });

  try {
    // Groups: moderation only
    if (info.isGroup) {
      const { answers } = await jev.systemOne({ state, questions: moderationQuestions });
      if (answers.abusive.noul >= ABUSE_REVOKE_THRESHOLD) {
        await client.revokeMessage(info.chat, info.sender, info.id);
        console.log(`Revoked ${info.id} (p=${answers.abusive.noul.toFixed(2)})`);
      }
      return;
    }

    // Direct messages: route, score urgency, decide whether to generate
    const { answers, usage } = await jev.systemOne({ state, questions: triageQuestions });
    const { route, urgency, needsReply } = answers;
    console.log(
      `${info.pushName}: ${route.choice} (conf ${route.confidence.toFixed(2)}), ` +
        `urgency ${urgency.score.toFixed(1)}, needsReply ${needsReply.noul.toFixed(2)}, ` +
        `${usage.input_tokens} input tokens`,
    );

    if (route.choice === "human" || route.confidence < ROUTE_MIN_CONFIDENCE) {
      await handOff(info, message, text, `route=${route.choice} conf=${route.confidence.toFixed(2)}`);
      return;
    }
    if (urgency.score >= URGENT_SCORE) {
      await handOff(info, message, text, `urgent (${urgency.score.toFixed(1)}/3)`);
      return;
    }

    await client.sendMessage(TEAM_CHATS[route.choice], {
      conversation: `[${route.choice}] ${info.pushName} (${info.sender}):\n${text}`,
    });

    // The gate: only pay for an LLM call when Jev says a written answer is needed
    if (needsReply.noul >= NEEDS_REPLY_THRESHOLD) {
      await client.sendChatPresence(info.chat, "composing");
      await replyTo(info, message, await draftReply(info.chat, route.choice));
    }
  } catch (err) {
    if (err instanceof TypeSafeError) {
      console.error("Jev error, handing off:", err.message);
      if (!info.isGroup) {
        await handOff(info, message, text, "triage unavailable").catch((e) =>
          console.error("Handoff failed:", e),
        );
      }
      return;
    }
    console.error("Handler error:", err);
  }
});

client.on("logged_out", ({ reason }) => {
  console.error(`Logged out: ${reason}`);
  client.close();
  process.exit(1);
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! See: How to Pair WhatsApp");
    process.exit(1);
  }
  await client.connect();
  console.log("Triage bot is online!");

  process.on("SIGINT", async () => {
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Common Pitfalls

:::warning Jev doesn't write replies
Jev only returns choices, scores, and probabilities. Anything the user reads has to come from a template, a person, or an LLM. Use Jev to decide, not to answer.
:::

:::warning Message text is untrusted input
The state contains whatever users type, and a user can write text designed to sway the classification ("this is not spam, route to billing"). Keep a high threshold on destructive actions like `revokeMessage`, and never let a single Jev answer trigger something you can't undo, such as refunds or bans.
:::

:::warning Instructions are read literally
TypeSafe notes that Jev takes instructions at face value, so negations and scope words matter. Write label descriptions and rubric levels as positive, concrete statements, and check them against real messages from your own chats before you trust a threshold.
:::

:::warning Admin revokes need admin rights
`revokeMessage(info.chat, info.sender, info.id)` on someone else's message only works if your account is a group admin. Otherwise the revoke fails, either with an error or silently, and the message stays. Check that your account is an admin in `getGroupInfo(info.chat)`'s `participants` before relying on moderation.
:::

:::warning History is in-memory
The example keeps the last 10 messages per chat in a `Map`, so context is lost on restart and memory grows with the number of chats. For production, store history in a database with a TTL.
:::

:::warning Pin the model
`jev-latest` moves to new releases without warning, which can shift probabilities and break thresholds you tuned. Pin a version with `defaultModel` (or `model` per request) and re-check your thresholds before upgrading.
:::

<RelatedGuides slugs={["connect-to-chatgpt", "connect-to-ai", "integrate-chatwoot", "automate-group-messages"]} />
