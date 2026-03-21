---
title: "How to Connect WhatsApp to DeepSeek"
sidebar_label: Connect to DeepSeek
sidebar_position: 15
description: "Build a WhatsApp chatbot powered by DeepSeek using whatsmeow-node and the OpenAI SDK. DeepSeek uses an OpenAI-compatible API."
keywords: [connect whatsapp to deepseek, whatsapp deepseek bot, deepseek whatsapp nodejs, whatsapp deepseek integration, deepseek chatbot whatsapp]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-deepseek.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-deepseek.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Connect WhatsApp to DeepSeek",
      "description": "Build a WhatsApp chatbot powered by DeepSeek using whatsmeow-node and the OpenAI SDK. DeepSeek uses an OpenAI-compatible API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-deepseek.png",
      "step": [
        {"@type": "HowToStep", "name": "Set Up Both Clients", "text": "Initialize WhatsmeowClient with createClient() and OpenAI client pointing to DeepSeek's base URL."},
        {"@type": "HowToStep", "name": "Handle Incoming Messages", "text": "Listen for the message event, skip own messages, show typing, and extract text."},
        {"@type": "HowToStep", "name": "Send to DeepSeek", "text": "Call openai.chat.completions.create() with the deepseek-chat model and send the response back via sendMessage."},
        {"@type": "HowToStep", "name": "Add Conversation History", "text": "Store message history per user JID in a Map and pass it to DeepSeek for multi-turn conversations."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Connect WhatsApp to DeepSeek",
      "description": "Build a WhatsApp chatbot powered by DeepSeek using whatsmeow-node and the OpenAI SDK. DeepSeek uses an OpenAI-compatible API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-deepseek.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Connect WhatsApp to DeepSeek](/img/guides/connect-to-deepseek.png)
![How to Connect WhatsApp to DeepSeek](/img/guides/connect-to-deepseek-light.png)

# How to Connect WhatsApp to DeepSeek

DeepSeek exposes an OpenAI-compatible API, so you can use the same `openai` npm package — just point it at DeepSeek's endpoint. This makes it easy to swap between OpenAI, DeepSeek, and other compatible providers.

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))
- A DeepSeek API key (set as `DEEPSEEK_API_KEY` environment variable) — get one at [platform.deepseek.com](https://platform.deepseek.com/)
- The OpenAI SDK: `npm install openai`

## Step 1: Set Up Both Clients

The only difference from OpenAI is the `baseURL` and API key:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import OpenAI from "openai";

const client = createClient({ store: "session.db" });
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

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

  const reply = await askDeepSeek(info.sender, text);
  await client.sendMessage(info.chat, { conversation: reply });
});
```

## Step 3: Send to DeepSeek

```typescript
async function askDeepSeek(userJid: string, userMessage: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  return response.choices[0].message.content ?? "I couldn't generate a response.";
}
```

:::info
DeepSeek also offers `deepseek-reasoner` for complex reasoning tasks. Swap the model name to try it.
:::

## Step 4: Add Conversation History

Since DeepSeek uses the OpenAI-compatible format, the history pattern is identical:

```typescript
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const conversations = new Map<string, ChatCompletionMessageParam[]>();
const MAX_HISTORY = 20;

async function askDeepSeek(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
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
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";

const conversations = new Map<string, ChatCompletionMessageParam[]>();
const MAX_HISTORY = 20;

async function askDeepSeek(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
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
    const reply = await askDeepSeek(info.sender, text);
    await client.sendMessage(info.chat, { conversation: reply });
    console.log(`→ ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error("DeepSeek API error:", err);
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
  console.log("DeepSeek bot is online!");

  process.on("SIGINT", async () => {
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Switching Between Providers

Since DeepSeek, OpenAI, and many other providers use the same API format, you can make the provider configurable:

```typescript
const openai = new OpenAI({
  baseURL: process.env.AI_BASE_URL ?? "https://api.openai.com/v1",
  apiKey: process.env.AI_API_KEY,
});

const model = process.env.AI_MODEL ?? "gpt-4o";
```

This works with any OpenAI-compatible provider — DeepSeek, Groq, Together AI, Mistral, and more.

## Common Pitfalls

:::warning Echo loops
Always check `info.isFromMe` first. Without this, the bot replies to its own messages forever.
:::

:::warning API key exposure
Never hardcode your API key in the source. Use environment variables or a `.env` file (added to `.gitignore`).
:::

<RelatedGuides slugs={["connect-to-chatgpt", "connect-to-ai", "connect-to-ollama"]} />
