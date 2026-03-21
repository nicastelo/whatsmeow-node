---
title: "How to Connect WhatsApp to Ollama (Local AI)"
sidebar_label: Connect to Ollama
sidebar_position: 16
description: "Build a WhatsApp chatbot powered by a local AI model using whatsmeow-node and Ollama. No API key needed — runs entirely on your machine."
keywords: [connect whatsapp to ollama, whatsapp local ai bot, whatsapp ollama bot nodejs, whatsapp llama bot, whatsapp local llm, self hosted whatsapp ai]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-ollama.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-ollama.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Connect WhatsApp to Ollama (Local AI)",
      "description": "Build a WhatsApp chatbot powered by a local AI model using whatsmeow-node and Ollama. No API key needed — runs entirely on your machine.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-ollama.png",
      "step": [
        {"@type": "HowToStep", "name": "Install Ollama and Pull a Model", "text": "Install Ollama from ollama.com and pull a model like llama3.2 or gemma3."},
        {"@type": "HowToStep", "name": "Set Up Both Clients", "text": "Initialize WhatsmeowClient with createClient() and Ollama client with new Ollama()."},
        {"@type": "HowToStep", "name": "Handle Incoming Messages", "text": "Listen for the message event, skip own messages, show typing, and extract text."},
        {"@type": "HowToStep", "name": "Send to Ollama", "text": "Call ollama.chat() with the user message and send the response back via sendMessage."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Connect WhatsApp to Ollama (Local AI)",
      "description": "Build a WhatsApp chatbot powered by a local AI model using whatsmeow-node and Ollama. No API key needed — runs entirely on your machine.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/connect-to-ollama.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Connect WhatsApp to Ollama (Local AI)](/img/guides/connect-to-ollama.png)
![How to Connect WhatsApp to Ollama (Local AI)](/img/guides/connect-to-ollama-light.png)

# How to Connect WhatsApp to Ollama (Local AI)

Run your WhatsApp chatbot entirely on your own machine — no API keys, no cloud costs, no data leaving your network. Ollama makes it easy to run open-source models like Llama, Gemma, and Mistral locally.

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))
- [Ollama](https://ollama.com/) installed and running
- A model pulled: `ollama pull llama3.2`
- The Ollama SDK: `npm install ollama`

## Step 1: Pull a Model

```bash
# Install Ollama from https://ollama.com, then:
ollama pull llama3.2
```

Other good choices for chat:
- `gemma3` — Google's open model, fast and capable
- `mistral` — Strong for its size
- `llama3.2:1b` — Smallest Llama, fastest responses

## Step 2: Set Up Both Clients

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { Ollama } from "ollama";

const client = createClient({ store: "session.db" });
const ollama = new Ollama({ host: "http://localhost:11434" });

const MODEL = "llama3.2";
const SYSTEM_PROMPT = "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";
```

## Step 3: Handle Incoming Messages

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  await client.sendChatPresence(info.chat, "composing");

  const reply = await askOllama(info.sender, text);
  await client.sendMessage(info.chat, { conversation: reply });
});
```

## Step 4: Send to Ollama

```typescript
async function askOllama(userJid: string, userMessage: string): Promise<string> {
  const response = await ollama.chat({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  return response.message.content;
}
```

## Step 5: Add Conversation History

```typescript
import type { Message } from "ollama";

const conversations = new Map<string, Message[]>();
const MAX_HISTORY = 20;

async function askOllama(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const reply = response.message.content;
  history.push({ role: "assistant", content: reply });
  conversations.set(userJid, history);

  return reply;
}
```

## Complete Example

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { Ollama } from "ollama";
import type { Message } from "ollama";

const client = createClient({ store: "session.db" });
const ollama = new Ollama({ host: "http://localhost:11434" });

const MODEL = "llama3.2";
const SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";

const conversations = new Map<string, Message[]>();
const MAX_HISTORY = 20;

async function askOllama(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const reply = response.message.content;
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
    const reply = await askOllama(info.sender, text);
    await client.sendMessage(info.chat, { conversation: reply });
    console.log(`→ ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error("Ollama error:", err);
    await client.sendMessage(info.chat, {
      conversation: "Sorry, I'm having trouble right now. Make sure Ollama is running.",
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
  console.log(`Ollama bot is online! (model: ${MODEL})`);

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

:::warning Ollama must be running
Make sure the Ollama server is running (`ollama serve`) before starting the bot. If it's not running, all requests will fail.
:::

:::warning Response time depends on hardware
Local models run on your CPU/GPU. Smaller models like `llama3.2:1b` respond in 1-3 seconds on modern hardware. Larger models may take 10+ seconds — the typing indicator keeps the user informed while they wait.
:::

:::warning Echo loops
Always check `info.isFromMe` first. Without this, the bot replies to its own messages forever.
:::

:::warning Model must be pulled first
Run `ollama pull llama3.2` before starting the bot. If the model isn't downloaded, requests will fail.
:::

<RelatedGuides slugs={["connect-to-ai", "connect-to-chatgpt", "connect-to-gemini", "connect-to-deepseek"]} />
