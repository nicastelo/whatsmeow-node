---
title: "How to Connect WhatsApp to Google Gemini"
sidebar_label: Connect to Gemini
sidebar_position: 14
description: "Build a WhatsApp chatbot powered by Google Gemini using whatsmeow-node and the Google GenAI SDK. Includes conversation history and typing indicators."
keywords: [connect whatsapp to gemini, whatsapp gemini bot, whatsapp google ai bot nodejs, gemini whatsapp integration, whatsapp gemini typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-gemini.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-gemini.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Connect WhatsApp to Google Gemini",
      "description": "Build a WhatsApp chatbot powered by Google Gemini using whatsmeow-node and the Google GenAI SDK. Includes conversation history and typing indicators.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-gemini.png",
      "step": [
        {"@type": "HowToStep", "name": "Set Up Both Clients", "text": "Initialize WhatsmeowClient with createClient() and Google GenAI with new GoogleGenAI()."},
        {"@type": "HowToStep", "name": "Handle Incoming Messages", "text": "Listen for the message event, skip own messages, show typing, and extract text."},
        {"@type": "HowToStep", "name": "Send to Gemini", "text": "Call ai.models.generateContent() with the user message and send the response back via sendMessage."},
        {"@type": "HowToStep", "name": "Add Conversation History", "text": "Use Gemini's multi-turn chat feature to maintain conversation context per user."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Connect WhatsApp to Google Gemini",
      "description": "Build a WhatsApp chatbot powered by Google Gemini using whatsmeow-node and the Google GenAI SDK. Includes conversation history and typing indicators.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-gemini.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Connect WhatsApp to Google Gemini](/img/guides/connect-to-gemini.png)
![How to Connect WhatsApp to Google Gemini](/img/guides/connect-to-gemini-light.png)

# How to Connect WhatsApp to Google Gemini

Combine whatsmeow-node with the Google GenAI SDK to build a WhatsApp chatbot powered by Gemini. Messages come in via WhatsApp, get sent to Gemini for a response, and the reply goes back to the user — with typing indicators while the model thinks.

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))
- A Google AI API key (set as `GEMINI_API_KEY` environment variable) — get one at [ai.google.dev](https://ai.google.dev/)
- The Google GenAI SDK: `npm install @google/genai`

## Step 1: Set Up Both Clients

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { GoogleGenAI } from "@google/genai";

const client = createClient({ store: "session.db" });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  const reply = await askGemini(info.sender, text);
  await client.sendMessage(info.chat, { conversation: reply });
});
```

## Step 3: Send to Gemini

```typescript
async function askGemini(userJid: string, userMessage: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userMessage,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    },
  });

  return response.text ?? "I couldn't generate a response.";
}
```

## Step 4: Add Conversation History

Gemini supports multi-turn chat via the `chats.create()` API. Store a chat session per user:

```typescript
import type { Chat } from "@google/genai";

const chats = new Map<string, Chat>();

function getChat(userJid: string): Chat {
  let chat = chats.get(userJid);
  if (!chat) {
    chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });
    chats.set(userJid, chat);
  }
  return chat;
}

async function askGemini(userJid: string, userMessage: string): Promise<string> {
  const chat = getChat(userJid);
  const response = await chat.sendMessage({ message: userMessage });
  return response.text ?? "I couldn't generate a response.";
}
```

## Complete Example

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { GoogleGenAI } from "@google/genai";
import type { Chat } from "@google/genai";

const client = createClient({ store: "session.db" });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";

const chats = new Map<string, Chat>();

function getChat(userJid: string): Chat {
  let chat = chats.get(userJid);
  if (!chat) {
    chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });
    chats.set(userJid, chat);
  }
  return chat;
}

async function askGemini(userJid: string, userMessage: string): Promise<string> {
  const chat = getChat(userJid);
  const response = await chat.sendMessage({ message: userMessage });
  return response.text ?? "I couldn't generate a response.";
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
    const reply = await askGemini(info.sender, text);
    await client.sendMessage(info.chat, { conversation: reply });
    console.log(`→ ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error("Gemini API error:", err);
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
  console.log("Gemini bot is online!");

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
Always check `info.isFromMe` first. Without this, the bot sends a message, sees its own message, sends it to Gemini, and replies again — forever.
:::

:::warning API key exposure
Never hardcode your API key in the source. Use environment variables (`GEMINI_API_KEY`) or a `.env` file (added to `.gitignore`).
:::

:::warning Chat history is in-memory
The `Chat` objects are stored in a `Map` and lost on restart. For persistence, store conversation history in a database and recreate chats with the `history` option.
:::

<RelatedGuides slugs={["connect-to-ai", "connect-to-chatgpt", "connect-to-ollama", "connect-to-deepseek"]} />
