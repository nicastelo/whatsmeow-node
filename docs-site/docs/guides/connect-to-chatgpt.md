---
title: "How to Connect WhatsApp to ChatGPT (OpenAI)"
sidebar_label: Connect to ChatGPT
sidebar_position: 13
description: "Build a WhatsApp chatbot powered by ChatGPT using whatsmeow-node and the OpenAI SDK. Includes conversation history, typing indicators, and GPT-4.1."
keywords: [connect whatsapp to chatgpt, whatsapp chatgpt bot, whatsapp openai bot nodejs, whatsapp gpt bot typescript, chatgpt whatsapp integration]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-chatgpt.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-chatgpt.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Connect WhatsApp to ChatGPT (OpenAI)",
      "description": "Build a WhatsApp chatbot powered by ChatGPT using whatsmeow-node and the OpenAI SDK. Includes conversation history, typing indicators, and GPT-4.1.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-chatgpt.png",
      "step": [
        {"@type": "HowToStep", "name": "Set Up Both Clients", "text": "Initialize WhatsmeowClient with createClient() and OpenAI client with new OpenAI()."},
        {"@type": "HowToStep", "name": "Handle Incoming Messages", "text": "Listen for the message event, skip own messages, show typing, and extract text."},
        {"@type": "HowToStep", "name": "Send to ChatGPT", "text": "Call openai.chat.completions.create() with the user message and send the response back via sendMessage."},
        {"@type": "HowToStep", "name": "Add Conversation History", "text": "Store message history per user JID in a Map and pass it to ChatGPT for multi-turn conversations."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Connect WhatsApp to ChatGPT (OpenAI)",
      "description": "Build a WhatsApp chatbot powered by ChatGPT using whatsmeow-node and the OpenAI SDK. Includes conversation history, typing indicators, and GPT-4.1.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-chatgpt.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Connect WhatsApp to ChatGPT (OpenAI)](/img/guides/connect-to-chatgpt.png)
![How to Connect WhatsApp to ChatGPT (OpenAI)](/img/guides/connect-to-chatgpt-light.png)

# How to Connect WhatsApp to ChatGPT (OpenAI)

Combine whatsmeow-node with the OpenAI SDK to build a WhatsApp chatbot powered by GPT-4.1. Messages come in via WhatsApp, get sent to OpenAI for a response, and the reply goes back to the user — with typing indicators while the model thinks.

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))
- An OpenAI API key (set as `OPENAI_API_KEY` environment variable)
- The OpenAI SDK: `npm install openai`

## Step 1: Set Up Both Clients

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import OpenAI from "openai";

const client = createClient({ store: "session.db" });
const openai = new OpenAI(); // reads OPENAI_API_KEY from env

const SYSTEM_PROMPT = "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";
```

## Step 2: Handle Incoming Messages

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  await client.sendChatPresence(info.chat, "composing");

  const reply = await askChatGPT(info.sender, text);
  await client.sendMessage(info.chat, { conversation: reply });
});
```

## Step 3: Send to ChatGPT

```typescript
async function askChatGPT(userJid: string, userMessage: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  return response.choices[0].message.content ?? "I couldn't generate a response.";
}
```

## Step 4: Add Conversation History

For multi-turn conversations, store message history per user:

```typescript
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const conversations = new Map<string, ChatCompletionMessageParam[]>();
const MAX_HISTORY = 20;

async function askChatGPT(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const reply = response.choices[0].message.content ?? "I couldn't generate a response.";

  history.push({ role: "assistant", content: reply });
  conversations.set(userJid, history);

  return reply;
}
```

## Complete Example

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const client = createClient({ store: "session.db" });
const openai = new OpenAI();

const SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";

const conversations = new Map<string, ChatCompletionMessageParam[]>();
const MAX_HISTORY = 20;

async function askChatGPT(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const reply = response.choices[0].message.content ?? "I couldn't generate a response.";

  history.push({ role: "assistant", content: reply });
  conversations.set(userJid, history);

  return reply;
}

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  console.log(`${info.pushName}: ${text}`);
  await client.sendChatPresence(info.chat, "composing");

  try {
    const reply = await askChatGPT(info.sender, text);
    await client.sendMessage(info.chat, { conversation: reply });
    console.log(`→ ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error("OpenAI API error:", err);
    await client.sendMessage(info.chat, {
      conversation: "Sorry, I'm having trouble right now. Try again in a moment.",
    });
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
  await client.sendPresence("available");
  console.log("ChatGPT bot is online!");

  process.on("SIGINT", async () => {
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Common Pitfalls

:::warning Echo loops
Always check `info.isFromMe` first. Without this, the bot sends a message, sees its own message, sends it to ChatGPT, and replies again — forever.
:::

:::warning API key exposure
Never hardcode your API key in the source. Use environment variables (`OPENAI_API_KEY`) or a `.env` file (added to `.gitignore`).
:::

:::warning Rate limits on both sides
Both the OpenAI API and WhatsApp have rate limits. For the OpenAI API, handle `429` errors with exponential backoff. For WhatsApp, avoid sending too many messages too quickly — see [Rate Limiting](/docs/rate-limiting).
:::

<RelatedGuides slugs={["connect-to-ai", "connect-to-gemini", "connect-to-ollama", "connect-to-deepseek"]} />
