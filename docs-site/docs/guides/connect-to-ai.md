---
title: "How to Connect WhatsApp to Claude AI"
sidebar_label: Connect to AI
sidebar_position: 7
description: "Build an AI-powered WhatsApp chatbot by connecting whatsmeow-node to Claude via the Anthropic SDK. Includes conversation history and typing indicators."
keywords: [connect whatsapp to claude, whatsapp ai bot, claude whatsapp integration, whatsapp chatbot ai nodejs]
---

import Head from '@docusaurus/Head';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-ai.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-ai.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Connect WhatsApp to Claude AI",
      "description": "Build an AI-powered WhatsApp chatbot by connecting whatsmeow-node to Claude via the Anthropic SDK. Includes conversation history and typing indicators.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-ai.png",
      "step": [
        {"@type": "HowToStep", "name": "Set Up Both Clients", "text": "Initialize WhatsmeowClient with createClient() and Anthropic client with new Anthropic()."},
        {"@type": "HowToStep", "name": "Handle Incoming Messages", "text": "Listen for the message event, skip own messages, show typing, and extract text."},
        {"@type": "HowToStep", "name": "Send to Claude", "text": "Call anthropic.messages.create() with the user message and send the response back via sendMessage."},
        {"@type": "HowToStep", "name": "Add Conversation History", "text": "Store message history per user JID in a Map and pass it to Claude for multi-turn conversations."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Connect WhatsApp to Claude AI",
      "description": "Build an AI-powered WhatsApp chatbot by connecting whatsmeow-node to Claude via the Anthropic SDK. Includes conversation history and typing indicators.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-ai.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Connect WhatsApp to Claude AI](/img/guides/connect-to-ai.png)
![How to Connect WhatsApp to Claude AI](/img/guides/connect-to-ai-light.png)

# How to Connect WhatsApp to Claude AI

Combine whatsmeow-node with the Anthropic SDK to build a WhatsApp chatbot powered by Claude. Messages come in via WhatsApp, get sent to Claude for a response, and the reply goes back to the user — with typing indicators while Claude thinks.

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))
- An Anthropic API key (set as `ANTHROPIC_API_KEY` environment variable)
- The Anthropic SDK: `npm install @anthropic-ai/sdk`

## Step 1: Set Up Both Clients

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import Anthropic from "@anthropic-ai/sdk";

const client = createClient({ store: "session.db" });
const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const SYSTEM_PROMPT = "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";
```

## Step 2: Handle Incoming Messages

```typescript
client.on("message", async ({ info, message }) => {
  // Skip own messages to avoid loops
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  // Show typing while Claude thinks
  await client.sendChatPresence(info.chat, "composing");

  // Get response from Claude
  const reply = await askClaude(info.sender, text);

  // Send the reply
  await client.sendMessage(info.chat, { conversation: reply });
});
```

## Step 3: Send to Claude

```typescript
async function askClaude(userJid: string, userMessage: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "I couldn't generate a response.";
}
```

## Step 4: Add Conversation History

For multi-turn conversations, store message history per user:

```typescript
type Message = { role: "user" | "assistant"; content: string };
const conversations = new Map<string, Message[]>();
const MAX_HISTORY = 20;

async function askClaude(userJid: string, userMessage: string): Promise<string> {
  // Get or create conversation history
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  // Trim to last N messages to control token usage
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  const block = response.content[0];
  const reply = block.type === "text" ? block.text : "I couldn't generate a response.";

  // Store the assistant's reply
  history.push({ role: "assistant", content: reply });
  conversations.set(userJid, history);

  return reply;
}
```

## Complete Example

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import Anthropic from "@anthropic-ai/sdk";

const client = createClient({ store: "session.db" });
const anthropic = new Anthropic();

const SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";

type Message = { role: "user" | "assistant"; content: string };
const conversations = new Map<string, Message[]>();
const MAX_HISTORY = 20;

async function askClaude(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  const block = response.content[0];
  const reply = block.type === "text" ? block.text : "I couldn't generate a response.";

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

  // Show typing while Claude thinks
  await client.sendChatPresence(info.chat, "composing");

  try {
    const reply = await askClaude(info.sender, text);
    await client.sendMessage(info.chat, { conversation: reply });
    console.log(`→ ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error("Claude API error:", err);
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
  console.log("AI bot is online!");

  process.on("SIGINT", async () => {
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Enhancements

Here are a few ideas to extend this further:

- **Image understanding** — download incoming images with `downloadAny()`, read the file, and send to Claude as a base64 image block
- **Rate limiting** — track message counts per user to prevent API abuse
- **Reset command** — add a `!reset` command to clear conversation history
- **Persistent history** — store conversations in a database instead of in-memory for persistence across restarts

## Common Pitfalls

:::warning Echo loops
Always check `info.isFromMe` first. Without this, the bot sends a message, sees its own message, sends it to Claude, and replies again — forever.
:::

:::warning API key exposure
Never hardcode your API key in the source. Use environment variables (`ANTHROPIC_API_KEY`) or a `.env` file (added to `.gitignore`).
:::

:::warning Rate limits on both sides
Both the Anthropic API and WhatsApp have rate limits. For the Anthropic API, handle `429` errors with exponential backoff. For WhatsApp, avoid sending too many messages too quickly — see [Rate Limiting](/docs/rate-limiting).
:::

## Next Steps

- [How to Build a Bot](build-a-bot) — fundamentals of message handling and commands
- [How to Show Typing Indicators](typing-indicators) — make the AI feel more natural
- [Echo Bot Example](/docs/examples/bots-and-resilience#echo-bot) — full-featured reference bot
- [Rate Limiting](/docs/rate-limiting) — understand WhatsApp's sending limits
