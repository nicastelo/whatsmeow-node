---
title: "How to Use whatsmeow-node with Typebot"
sidebar_label: Typebot Integration
sidebar_position: 24
description: "Connect whatsmeow-node to Typebot for WhatsApp chatbot flows — replace Evolution API with a lighter, more stable WhatsApp backend."
keywords: [typebot whatsapp, typebot whatsmeow, typebot evolution api alternative, typebot whatsapp bot, typebot whatsapp integration, typebot whatsapp nodejs]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-typebot.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-typebot.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Use whatsmeow-node with Typebot",
      "description": "Connect whatsmeow-node to Typebot for WhatsApp chatbot flows — replace Evolution API with a lighter, more stable WhatsApp backend.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-typebot.png",
      "step": [
        {"@type": "HowToStep", "name": "Build a whatsmeow-node REST API", "text": "Create an Express server that bridges WhatsApp messages to Typebot via HTTP."},
        {"@type": "HowToStep", "name": "Start a Typebot Flow", "text": "POST the first message to Typebot's API to start a conversation flow."},
        {"@type": "HowToStep", "name": "Continue the Conversation", "text": "Send user replies to Typebot's continueChat endpoint and relay bot responses to WhatsApp."},
        {"@type": "HowToStep", "name": "Handle Rich Messages", "text": "Parse Typebot's response blocks (text, image, input) and send appropriate WhatsApp messages."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Use whatsmeow-node with Typebot",
      "description": "Connect whatsmeow-node to Typebot for WhatsApp chatbot flows — replace Evolution API with a lighter, more stable WhatsApp backend.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-typebot.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Use whatsmeow-node with Typebot](/img/guides/integrate-typebot.png)
![How to Use whatsmeow-node with Typebot](/img/guides/integrate-typebot-light.png)

# How to Use whatsmeow-node with Typebot

[Typebot](https://typebot.io) is an open-source chatbot builder with a visual flow editor. It's typically connected to WhatsApp through [Evolution API](https://github.com/EvolutionAPI/evolution-api) (which uses Baileys). You can replace that entire layer with whatsmeow-node for a lighter, more stable connection.

## How It Works

```
WhatsApp User
  ↕
whatsmeow-node Bridge (Express)
  ↕ Typebot API
Typebot Flow Engine
```

Instead of `WhatsApp → Evolution API (Baileys) → Typebot`, you use `WhatsApp → whatsmeow-node → Typebot` directly. Fewer moving parts, less memory, more stability.

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))
- A Typebot instance (self-hosted or cloud) with a published flow
- Express: `npm install express`

## Step 1: Get Your Typebot ID

1. Open your Typebot flow in the editor
2. Click **Share** and note the typebot ID from the URL or embed settings
3. Your Typebot API base URL is `https://typebot.io` (cloud) or your self-hosted URL

## Step 2: Build the Bridge

The bridge manages conversations — it starts a Typebot session per WhatsApp user and relays messages back and forth:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

const TYPEBOT_URL = process.env.TYPEBOT_URL ?? "https://typebot.io";
const TYPEBOT_ID = process.env.TYPEBOT_ID!;

// Track active Typebot sessions per WhatsApp user
const sessions = new Map<string, string>(); // JID → sessionId

// --- Start or continue a Typebot conversation ---
async function handleMessage(jid: string, text: string): Promise<string[]> {
  const sessionId = sessions.get(jid);

  let response;

  if (!sessionId) {
    // Start a new Typebot session
    response = await fetch(`${TYPEBOT_URL}/api/v1/typebots/${TYPEBOT_ID}/startChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { type: "text", text } }),
    }).then((r) => r.json());

    if (response.sessionId) {
      sessions.set(jid, response.sessionId);
    }
  } else {
    // Continue existing session
    response = await fetch(`${TYPEBOT_URL}/api/v1/sessions/${sessionId}/continueChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { type: "text", text } }),
    }).then((r) => r.json());
  }

  // Extract text messages from Typebot response
  return extractMessages(response);
}

// --- Parse Typebot response blocks into text messages ---
function extractMessages(response: Record<string, unknown>): string[] {
  const messages: string[] = [];
  const msgs = (response.messages as Array<{ type: string; content?: { richText?: Array<{ children: Array<{ text?: string }> }> } }>) ?? [];

  for (const msg of msgs) {
    if (msg.type === "text" && msg.content?.richText) {
      const text = msg.content.richText
        .map((block) => block.children.map((c) => c.text ?? "").join(""))
        .join("\n");
      if (text.trim()) messages.push(text);
    }
  }

  return messages;
}

// --- Listen for WhatsApp messages ---
client.on("message", async ({ info, message }) => {
  if (info.isFromMe || info.isGroup) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  await client.sendChatPresence(info.chat, "composing");

  try {
    const replies = await handleMessage(info.sender, text);

    for (const reply of replies) {
      await client.sendMessage(info.chat, { conversation: reply });
      // Small delay between multiple messages
      if (replies.length > 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  } catch (err) {
    console.error("Typebot error:", err);
    await client.sendMessage(info.chat, {
      conversation: "Sorry, I'm having trouble right now. Try again in a moment.",
    });
  }
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired!");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  console.log("Typebot bridge is online!");

  process.on("SIGINT", async () => {
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Handling Input Types

Typebot flows can request different input types. Handle them by checking the `input` block:

```typescript
function extractMessages(response: Record<string, unknown>): string[] {
  const messages: string[] = [];
  const msgs = (response.messages as Array<Record<string, unknown>>) ?? [];

  for (const msg of msgs) {
    if (msg.type === "text" && (msg.content as Record<string, unknown>)?.richText) {
      const richText = (msg.content as Record<string, unknown>).richText as Array<{ children: Array<{ text?: string }> }>;
      const text = richText
        .map((block) => block.children.map((c) => c.text ?? "").join(""))
        .join("\n");
      if (text.trim()) messages.push(text);
    }
  }

  // If the flow expects input, prompt the user
  const input = response.input as Record<string, unknown> | undefined;
  if (input) {
    const inputType = input.type as string;
    if (inputType === "choice input") {
      const items = (input.items as Array<{ content: string }>) ?? [];
      const options = items.map((item, i) => `${i + 1}. ${item.content}`).join("\n");
      messages.push(options);
    }
  }

  return messages;
}
```

## Resetting Conversations

Add a `!reset` command to restart the Typebot flow:

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe || info.isGroup) return;

  const text = /* ... extract text ... */;
  if (!text) return;

  if (text.toLowerCase() === "!reset") {
    sessions.delete(info.sender);
    await client.sendMessage(info.chat, {
      conversation: "Conversation reset! Send a message to start over.",
    });
    return;
  }

  // ... handle message as before
});
```

## Evolution API vs whatsmeow-node

If you're currently using Evolution API with Typebot, here's what changes:

| | Evolution API | whatsmeow-node bridge |
|---|---|---|
| **WhatsApp backend** | Baileys | whatsmeow (Go) |
| **Memory** | ~50-100 MB | ~10-20 MB |
| **Architecture** | Separate service | Embedded in bridge |
| **Setup** | Docker + config | `npm install` + 50 lines |
| **Stability** | Baileys fork updates | Stable upstream |

## Common Pitfalls

:::warning Session expiration
Typebot sessions can expire. If `continueChat` returns an error, delete the session from the map and start a new one.
:::

:::warning Rate limiting
Typebot flows can send multiple messages in sequence. Add a small delay (1 second) between messages to avoid WhatsApp rate limiting.
:::

:::warning Rich content
Typebot supports images, videos, and buttons in flows. The basic bridge above only handles text. Extend `extractMessages()` to handle media blocks and send them via `uploadMedia()` + `sendRawMessage()`.
:::

<RelatedGuides slugs={["integrate-whaticket", "integrate-n8n", "connect-to-chatgpt", "build-a-bot"]} />
