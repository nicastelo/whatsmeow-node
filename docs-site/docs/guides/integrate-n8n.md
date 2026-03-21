---
title: "How to Use whatsmeow-node with n8n"
sidebar_label: n8n Integration
sidebar_position: 22
description: "Connect whatsmeow-node to n8n for WhatsApp workflow automation — send messages, receive webhooks, and build automated flows without the official Cloud API."
keywords: [whatsmeow-node n8n, n8n whatsapp bot, n8n whatsapp integration, n8n whatsapp without cloud api, n8n whatsapp free, whatsapp automation n8n]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-n8n.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-n8n.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Use whatsmeow-node with n8n",
      "description": "Connect whatsmeow-node to n8n for WhatsApp workflow automation — send messages, receive webhooks, and build automated flows without the official Cloud API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-n8n.png",
      "step": [
        {"@type": "HowToStep", "name": "Create a whatsmeow-node REST API", "text": "Wrap whatsmeow-node in an Express server with send and webhook endpoints."},
        {"@type": "HowToStep", "name": "Forward Messages to n8n", "text": "POST incoming WhatsApp messages to an n8n webhook trigger URL."},
        {"@type": "HowToStep", "name": "Send Messages from n8n", "text": "Use n8n's HTTP Request node to call the whatsmeow-node REST API."},
        {"@type": "HowToStep", "name": "Build Automated Flows", "text": "Create n8n workflows that process messages, query databases, call APIs, and reply."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Use whatsmeow-node with n8n",
      "description": "Connect whatsmeow-node to n8n for WhatsApp workflow automation — send messages, receive webhooks, and build automated flows without the official Cloud API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-n8n.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Use whatsmeow-node with n8n](/img/guides/integrate-n8n.png)
![How to Use whatsmeow-node with n8n](/img/guides/integrate-n8n-light.png)

# How to Use whatsmeow-node with n8n

[n8n](https://n8n.io) is a self-hosted workflow automation platform — like Zapier, but open source. Its built-in WhatsApp node requires the official Cloud API (Meta Business verification, per-message pricing). With whatsmeow-node, you can connect n8n to WhatsApp for free using a simple REST bridge.

## How It Works

```
n8n Workflow
  ↕ HTTP requests / webhooks
whatsmeow-node REST API (Express)
  ↕
WhatsApp
```

1. **Receiving**: whatsmeow-node gets a WhatsApp message → POSTs it to an n8n webhook
2. **Sending**: n8n workflow makes an HTTP request → whatsmeow-node REST API sends the message

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))
- n8n running (self-hosted or cloud) — `npx n8n` for a quick start
- Express: `npm install express`

## Step 1: Create the whatsmeow-node REST API

This server does two things: sends messages via REST and forwards incoming messages to n8n.

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import express from "express";

const client = createClient({ store: "session.db" });
const app = express();
app.use(express.json());

// n8n webhook URL — you'll set this up in Step 3
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL ?? "http://localhost:5678/webhook/whatsapp";

// --- Sending endpoint (n8n calls this) ---
app.post("/api/send", async (req, res) => {
  const { phone, message, groupJid } = req.body;
  const jid = groupJid ?? `${phone}@s.whatsapp.net`;

  try {
    const resp = await client.sendMessage(jid, { conversation: message });
    res.json({ sent: true, id: resp.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to send" });
  }
});

// --- Forward incoming messages to n8n ---
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  // POST to n8n webhook
  try {
    await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: info.sender,
        chat: info.chat,
        pushName: info.pushName,
        messageId: info.id,
        text: text ?? null,
        isGroup: info.isGroup,
        timestamp: info.timestamp,
        hasMedia: !!(
          message.imageMessage ??
          message.videoMessage ??
          message.audioMessage ??
          message.documentMessage
        ),
      }),
    });
  } catch (err) {
    console.error("Failed to forward to n8n:", err);
  }
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired!");
    process.exit(1);
  }
  await client.connect();
  app.listen(3000, () => console.log("WhatsApp API on :3000"));
}

main().catch(console.error);
```

## Step 2: Set Up the n8n Webhook Trigger

In n8n, create a new workflow:

1. Add a **Webhook** node as the trigger
2. Set method to `POST`
3. Set path to `whatsapp` (makes the URL `http://localhost:5678/webhook/whatsapp`)
4. Set the webhook URL as `N8N_WEBHOOK_URL` in your REST API environment

Now every incoming WhatsApp message triggers this n8n workflow.

## Step 3: Send Messages from n8n

Add an **HTTP Request** node to your n8n workflow:

- **Method**: POST
- **URL**: `http://localhost:3000/api/send`
- **Body (JSON)**:
```json
{
  "phone": "{{ $json.from.replace('@s.whatsapp.net', '') }}",
  "message": "Thanks for your message! We'll get back to you soon."
}
```

## Example: Auto-Reply Workflow

A complete n8n workflow that auto-replies to messages:

```
[Webhook Trigger] → [IF: text contains "price"] → [HTTP Request: send reply]
                  → [IF: text contains "help"]  → [HTTP Request: send help menu]
                  → [Default]                    → [HTTP Request: send acknowledgment]
```

## Example: CRM Integration

Forward WhatsApp messages to a CRM and reply with the ticket number:

```
[Webhook Trigger] → [HTTP Request: create CRM ticket]
                  → [Set: extract ticket ID]
                  → [HTTP Request: send "Your ticket #{{ ticketId }} has been created"]
```

## Example: AI-Powered Auto-Reply

Combine with OpenAI in n8n:

```
[Webhook Trigger] → [OpenAI Chat: generate reply]
                  → [HTTP Request: send AI reply via whatsmeow-node]
```

## Adding More Endpoints

Extend the REST API for n8n workflows that need more features:

```typescript
// Send media
app.post("/api/send-media", async (req, res) => {
  const { phone, filePath, mediaType, caption } = req.body;
  const jid = `${phone}@s.whatsapp.net`;
  const media = await client.uploadMedia(filePath, mediaType);
  await client.sendRawMessage(jid, {
    [`${mediaType}Message`]: {
      URL: media.URL,
      directPath: media.directPath,
      mediaKey: media.mediaKey,
      fileEncSHA256: media.fileEncSHA256,
      fileSHA256: media.fileSHA256,
      fileLength: String(media.fileLength),
      mimetype: `${mediaType}/*`,
      ...(caption && { caption }),
    },
  });
  res.json({ sent: true });
});

// Send to group
app.post("/api/send-group", async (req, res) => {
  const { groupJid, message } = req.body;
  const resp = await client.sendMessage(groupJid, { conversation: message });
  res.json({ sent: true, id: resp.id });
});

// Mark as read
app.post("/api/read", async (req, res) => {
  const { messageId, chat, sender } = req.body;
  await client.markRead([messageId], chat, sender);
  res.json({ ok: true });
});
```

## Common Pitfalls

:::warning Keep both services running
The whatsmeow-node REST API and n8n must both be running. Use PM2 or Docker Compose to manage them together.
:::

:::warning Webhook URL must be reachable
n8n's webhook URL must be accessible from the whatsmeow-node server. In Docker, use the container name or network alias, not `localhost`.
:::

:::warning Rate limiting
n8n workflows can execute very fast. If your workflow sends multiple messages, add a **Wait** node (1-3 seconds) between sends to avoid WhatsApp rate limiting.
:::

<RelatedGuides slugs={["send-notifications", "integrate-whaticket", "build-a-bot", "connect-to-chatgpt"]} />
