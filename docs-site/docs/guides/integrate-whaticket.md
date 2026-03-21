---
title: "How to Use whatsmeow-node with Whaticket"
sidebar_label: Whaticket Integration
sidebar_position: 21
description: "Replace whatsapp-web.js with whatsmeow-node in Whaticket — drop Puppeteer, cut memory usage, and get a more stable WhatsApp connection for your helpdesk."
keywords: [whaticket whatsmeow, whaticket sem baileys, whaticket whatsapp-web.js alternative, whaticket whatsmeow-node, whaticket estável, whaticket sem puppeteer]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-whaticket.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-whaticket.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Use whatsmeow-node with Whaticket",
      "description": "Replace whatsapp-web.js with whatsmeow-node in Whaticket — drop Puppeteer, cut memory usage, and get a more stable WhatsApp connection for your helpdesk.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-whaticket.png",
      "step": [
        {"@type": "HowToStep", "name": "Install whatsmeow-node", "text": "Add whatsmeow-node to the Whaticket backend and remove whatsapp-web.js and Puppeteer."},
        {"@type": "HowToStep", "name": "Create the WhatsApp Service", "text": "Build a service module that wraps whatsmeow-node and exposes send/receive methods for Whaticket."},
        {"@type": "HowToStep", "name": "Handle QR Pairing", "text": "Emit QR codes to the Whaticket frontend via the existing WebSocket connection."},
        {"@type": "HowToStep", "name": "Route Messages to Tickets", "text": "Listen for incoming messages and create or update tickets in the database."},
        {"@type": "HowToStep", "name": "Send Replies", "text": "When agents reply in the Whaticket UI, send the message via whatsmeow-node."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Use whatsmeow-node with Whaticket",
      "description": "Replace whatsapp-web.js with whatsmeow-node in Whaticket — drop Puppeteer, cut memory usage, and get a more stable WhatsApp connection for your helpdesk.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-whaticket.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Use whatsmeow-node with Whaticket](/img/guides/integrate-whaticket.png)
![How to Use whatsmeow-node with Whaticket](/img/guides/integrate-whaticket-light.png)

# How to Use whatsmeow-node with Whaticket

[Whaticket](https://github.com/canove/whaticket-community) is an open-source WhatsApp helpdesk built with Express + React. It uses whatsapp-web.js (Puppeteer-based) for WhatsApp connectivity, which is heavy (~500 MB RAM), breaks on WhatsApp Web updates, and requires a headless browser.

whatsmeow-node is a direct replacement — same event-driven pattern, same Node.js runtime, but 10-20 MB RAM instead of 500 MB, no browser, and a more stable protocol.

## Why Replace whatsapp-web.js in Whaticket?

| | whatsapp-web.js (current) | whatsmeow-node |
|---|---|---|
| **Memory per session** | 200-500 MB (Chromium) | ~10-20 MB |
| **Startup** | 5-15s (browser launch) | Under 1 second |
| **Stability** | Breaks on WhatsApp Web updates | Stable upstream (whatsmeow) |
| **Docker image** | ~1 GB+ (needs Chrome) | ~50 MB |
| **Protocol** | Web client automation | Native multi-device |

For multi-session Whaticket deployments, this means running 10+ WhatsApp connections on a single 1 GB VPS instead of needing 4+ GB.

## Architecture Overview

Whaticket's WhatsApp integration is in the Express backend:

```
Whaticket Frontend (React)
  ↕ WebSocket + REST
Whaticket Backend (Express)
  ↕ WhatsApp Service
whatsapp-web.js → Replace with whatsmeow-node
  ↕
WhatsApp
```

The swap happens at the WhatsApp service layer — everything above (tickets, contacts, UI) stays the same.

## Step 1: Install whatsmeow-node

In the Whaticket backend directory:

```bash
# Remove whatsapp-web.js and Puppeteer
npm uninstall whatsapp-web.js puppeteer

# Install whatsmeow-node
npm install @whatsmeow-node/whatsmeow-node
```

## Step 2: Create the WhatsApp Service

Replace the whatsapp-web.js service with a whatsmeow-node wrapper:

```typescript
// src/services/WhatsappService.ts
import { createClient, WhatsmeowClient } from "@whatsmeow-node/whatsmeow-node";
import { EventEmitter } from "events";

export class WhatsappService extends EventEmitter {
  private client: WhatsmeowClient;
  private jid: string | null = null;

  constructor(sessionId: string, storePath: string) {
    super();
    this.client = createClient({ store: `${storePath}/${sessionId}.db` });
    this.setupListeners();
  }

  private setupListeners() {
    this.client.on("qr", ({ code }) => {
      this.emit("qr", code);
    });

    this.client.on("connected", ({ jid }) => {
      this.jid = jid;
      this.emit("ready", jid);
    });

    this.client.on("message", ({ info, message }) => {
      if (info.isFromMe) return;
      this.emit("message", { info, message });
    });

    this.client.on("disconnected", () => {
      this.emit("disconnected");
    });

    this.client.on("logged_out", ({ reason }) => {
      this.emit("logged_out", reason);
    });
  }

  async start() {
    const { jid } = await this.client.init();
    if (jid) {
      this.jid = jid;
      await this.client.connect();
      return { paired: true, jid };
    }
    // Not paired — start QR flow
    await this.client.getQRChannel();
    await this.client.connect();
    return { paired: false };
  }

  async sendText(to: string, text: string) {
    return this.client.sendMessage(to, { conversation: text });
  }

  async sendMedia(to: string, filePath: string, mediaType: "image" | "video" | "audio" | "document", caption?: string) {
    const media = await this.client.uploadMedia(filePath, mediaType);
    const typeKey = `${mediaType}Message`;
    return this.client.sendRawMessage(to, {
      [typeKey]: {
        URL: media.URL,
        directPath: media.directPath,
        mediaKey: media.mediaKey,
        fileEncSHA256: media.fileEncSHA256,
        fileSHA256: media.fileSHA256,
        fileLength: String(media.fileLength),
        mimetype: this.getMimeType(filePath, mediaType),
        ...(caption && { caption }),
      },
    });
  }

  async markRead(messageId: string, chat: string, sender?: string) {
    await this.client.markRead([messageId], chat, sender);
  }

  async disconnect() {
    await this.client.sendPresence("unavailable");
    await this.client.disconnect();
    this.client.close();
  }

  getJid() {
    return this.jid;
  }

  private getMimeType(filePath: string, mediaType: string): string {
    const ext = filePath.split(".").pop()?.toLowerCase();
    const mimes: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
      mp4: "video/mp4", mp3: "audio/mpeg", ogg: "audio/ogg",
      pdf: "application/pdf", doc: "application/msword",
    };
    return mimes[ext ?? ""] ?? `${mediaType}/*`;
  }
}
```

## Step 3: Handle QR Pairing via WebSocket

Whaticket shows QR codes in the admin UI. Forward them through the existing WebSocket:

```typescript
// In your session initialization handler
import { WhatsappService } from "./services/WhatsappService";

const sessions = new Map<string, WhatsappService>();

function initSession(sessionId: string, io: SocketIO.Server) {
  const service = new WhatsappService(sessionId, "./sessions");

  service.on("qr", (code) => {
    // Send QR to the admin UI via WebSocket
    io.to(sessionId).emit("whatsapp:qr", { code });
  });

  service.on("ready", (jid) => {
    io.to(sessionId).emit("whatsapp:ready", { jid });
    // Update session status in database
    updateSessionStatus(sessionId, "connected", jid);
  });

  service.on("message", async ({ info, message }) => {
    // Route to ticket system
    await handleIncomingMessage(sessionId, info, message);
  });

  service.on("disconnected", () => {
    io.to(sessionId).emit("whatsapp:disconnected");
    updateSessionStatus(sessionId, "disconnected");
  });

  service.start();
  sessions.set(sessionId, service);
}
```

## Step 4: Route Messages to Tickets

Convert incoming WhatsApp messages into Whaticket tickets:

```typescript
async function handleIncomingMessage(
  sessionId: string,
  info: { chat: string; sender: string; pushName: string; id: string; isGroup: boolean },
  message: Record<string, unknown>,
) {
  const contactJid = info.isGroup ? info.sender : info.chat;

  // Find or create contact
  const contact = await findOrCreateContact(contactJid, info.pushName);

  // Find open ticket or create new one
  const ticket = await findOrCreateTicket(contact.id, sessionId);

  // Extract message text
  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text ??
    "[media]";

  // Save message to ticket
  await createMessage({
    ticketId: ticket.id,
    contactId: contact.id,
    body: text,
    fromMe: false,
    messageId: info.id,
  });

  // Notify agents via WebSocket
  io.to(`ticket:${ticket.id}`).emit("ticket:message", {
    ticketId: ticket.id,
    message: text,
    contact: contact.name,
  });
}
```

## Step 5: Send Replies

When an agent replies from the Whaticket UI:

```typescript
// In your message sending endpoint
app.post("/api/messages/:ticketId", async (req, res) => {
  const { ticketId } = req.params;
  const { body, mediaPath, mediaType } = req.body;

  const ticket = await getTicket(ticketId);
  const session = sessions.get(ticket.sessionId);
  if (!session) return res.status(400).json({ error: "Session not connected" });

  let response;
  if (mediaPath) {
    response = await session.sendMedia(ticket.contactJid, mediaPath, mediaType, body);
  } else {
    response = await session.sendText(ticket.contactJid, body);
  }

  // Save outgoing message
  await createMessage({
    ticketId: ticket.id,
    body,
    fromMe: true,
    messageId: response.id,
  });

  res.json({ sent: true, id: response.id });
});
```

## Multi-Session Management

Whaticket supports multiple WhatsApp numbers. whatsmeow-node handles this with separate client instances:

```typescript
// Each session gets its own client + database
const session1 = new WhatsappService("support", "./sessions");   // sessions/support.db
const session2 = new WhatsappService("sales", "./sessions");     // sessions/sales.db
const session3 = new WhatsappService("marketing", "./sessions"); // sessions/marketing.db

// Total memory: ~30-60 MB for 3 sessions
// With whatsapp-web.js: ~1.5 GB for 3 sessions
```

## Docker Cleanup

Remove Chromium from your Dockerfile:

```dockerfile
# Before (whatsapp-web.js)
FROM node:20
RUN apt-get update && apt-get install -y chromium
# Image size: ~1.2 GB

# After (whatsmeow-node)
FROM node:20-slim
# Image size: ~200 MB
```

## Common Pitfalls

:::warning Session migration
whatsapp-web.js sessions cannot be migrated. Each WhatsApp number needs to re-pair by scanning a QR code. Chat history and contacts are unaffected.
:::

:::warning JID format change
whatsapp-web.js uses `number@c.us` for contacts. whatsmeow-node uses `number@s.whatsapp.net`. Update any stored JIDs in your database.
:::

:::warning Media handling
whatsapp-web.js gives you `msg.downloadMedia()` which returns base64. whatsmeow-node's `downloadAny()` saves to a temp file. Adjust your media pipeline accordingly.
:::

<RelatedGuides slugs={["migrate-from-whatsapp-web-js", "send-notifications", "whatsmeow-in-node", "automate-group-messages"]} />
