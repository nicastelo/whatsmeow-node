---
title: FAQs
sidebar_label: FAQs
sidebar_position: 6
description: "Frequently asked questions about whatsmeow-node — requirements, WhatsApp account types, deployment, multi-device, serverless, and more."
keywords: [whatsmeow-node faq, whatsapp bot questions, whatsapp nodejs faq, whatsmeow-node requirements]
---

import Head from '@docusaurus/Head';

<Head>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {"@type": "Question", "name": "What is whatsmeow-node?", "acceptedAnswer": {"@type": "Answer", "text": "whatsmeow-node is a TypeScript/Node.js client for WhatsApp Web. It wraps whatsmeow, a Go library that implements the WhatsApp Web multi-device protocol. You get whatsmeow's reliability with TypeScript's developer experience — 100 typed async methods, typed events, and typed errors."}},
        {"@type": "Question", "name": "Is this the official WhatsApp API?", "acceptedAnswer": {"@type": "Answer", "text": "No. whatsmeow-node is an unofficial client that connects as a linked device (like WhatsApp Web). The only official API is the WhatsApp Business Cloud API from Meta, which requires business verification and has per-conversation pricing."}},
        {"@type": "Question", "name": "Can my account get banned?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Using unofficial clients violates WhatsApp's Terms of Service, and your account may be banned. This risk applies to all unofficial libraries (Baileys, whatsapp-web.js, etc.), not just whatsmeow-node."}},
        {"@type": "Question", "name": "Is whatsmeow-node free?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. whatsmeow-node is MIT-licensed and free to use. The upstream whatsmeow library is MPL-2.0 licensed."}},
        {"@type": "Question", "name": "Do I need Go installed?", "acceptedAnswer": {"@type": "Answer", "text": "No. Precompiled Go binaries are bundled for all supported platforms (macOS, Linux, Windows — x64 and arm64). The correct binary is installed automatically via npm's optionalDependencies."}},
        {"@type": "Question", "name": "Do I need a WhatsApp Business account?", "acceptedAnswer": {"@type": "Answer", "text": "No. whatsmeow-node works with any regular WhatsApp account. It connects as a linked device, the same way WhatsApp Web or Desktop does."}},
        {"@type": "Question", "name": "Does the phone need to stay online?", "acceptedAnswer": {"@type": "Answer", "text": "No. WhatsApp's multi-device protocol allows linked devices to operate independently. Your phone can be offline, turned off, or disconnected — the linked device session stays active."}},
        {"@type": "Question", "name": "Can I use multiple WhatsApp accounts?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Create a separate client instance for each account, each with its own store path. Each client spawns its own Go process."}},
        {"@type": "Question", "name": "Does it work with serverless (AWS Lambda, Vercel)?", "acceptedAnswer": {"@type": "Answer", "text": "It depends on the use case. For fire-and-forget tasks like sending an OTP, serverless works. For long-running bots, serverless is a poor fit because whatsmeow-node maintains a persistent WebSocket connection. For always-on bots, a persistent server tends to work better."}},
        {"@type": "Question", "name": "Does it work with Docker?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Use a Node.js base image. The Go binary is included in the npm package — no additional setup needed."}},
        {"@type": "Question", "name": "How much memory does it use?", "acceptedAnswer": {"@type": "Answer", "text": "The Go binary uses ~10-20 MB of RAM. Total process memory (Node.js + Go) is typically 50-80 MB, compared to 200-500 MB for browser-based solutions."}},
        {"@type": "Question", "name": "How is this different from Baileys?", "acceptedAnswer": {"@type": "Answer", "text": "Baileys implements the WhatsApp protocol in pure JavaScript. whatsmeow-node wraps a Go implementation (whatsmeow) that powers the Mautrix WhatsApp bridge, used by thousands of Matrix users. The main trade-off: whatsmeow-node spawns an external process but inherits whatsmeow's reliability and maintenance."}},
        {"@type": "Question", "name": "How is this different from whatsapp-web.js?", "acceptedAnswer": {"@type": "Answer", "text": "whatsapp-web.js automates a headless Chrome browser, requiring 200-500 MB of RAM and breaking when WhatsApp updates their web client. whatsmeow-node implements the protocol directly with ~10-20 MB of RAM and no browser dependency."}},
        {"@type": "Question", "name": "Should I use this or the official WhatsApp Business API?", "acceptedAnswer": {"@type": "Answer", "text": "The official API is the only safe choice if you need guaranteed uptime, compliance, and no risk of account bans. whatsmeow-node is better for personal projects, prototyping, internal tools, or cases where the official API's cost or approval process is prohibitive."}}
      ]
    })}
  </script>
</Head>

# FAQ

## General

### What is whatsmeow-node?

whatsmeow-node is a TypeScript/Node.js client for WhatsApp Web. It wraps [whatsmeow](https://github.com/tulir/whatsmeow), a Go library that implements the WhatsApp Web multi-device protocol. You get whatsmeow's reliability with TypeScript's developer experience — 100 typed async methods, typed events, and typed errors.

### How does it work under the hood?

A precompiled Go binary runs as a subprocess. Your TypeScript code communicates with it over stdin/stdout using JSON-line IPC. The `WhatsmeowClient` class manages the process lifecycle, serialization, and reconnection. From your code's perspective, it's just async method calls.

### Is this the official WhatsApp API?

No. whatsmeow-node is an unofficial client that connects as a linked device (like WhatsApp Web). The only official API is the [WhatsApp Business Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) from Meta, which requires business verification and has per-conversation pricing.

### Can my account get banned?

Yes. Using unofficial clients violates WhatsApp's Terms of Service, and your account may be banned. This risk applies to all unofficial libraries (Baileys, whatsapp-web.js, etc.), not just whatsmeow-node. Avoid bulk messaging, spamming, or suspicious behavior to minimize risk.

### Is whatsmeow-node free?

Yes. whatsmeow-node is MIT-licensed and free to use. The upstream whatsmeow library is MPL-2.0 licensed.

## Requirements

### What Node.js version do I need?

Node.js 18 or higher.

### Do I need Go installed?

No. Precompiled Go binaries are bundled for all supported platforms (macOS, Linux, Windows — x64 and arm64). The correct binary is installed automatically via npm's `optionalDependencies`.

### What platforms are supported?

macOS (x64, arm64), Linux (x64, arm64, x64-musl for Alpine), and Windows (x64, arm64).

### Does it work on Alpine Linux / Docker?

Yes. The `linux-x64-musl` package provides a statically-linked binary for musl-based systems like Alpine.

## WhatsApp Account

### Do I need a WhatsApp Business account?

No. whatsmeow-node works with any regular WhatsApp account. It connects as a linked device, the same way WhatsApp Web or Desktop does.

### Can I use multiple WhatsApp accounts?

Yes. Create a separate client instance for each account, each with its own store path:

```typescript
const client1 = createClient({ store: "account1.db" });
const client2 = createClient({ store: "account2.db" });
```

Each client spawns its own Go process.

### Does the phone need to stay online?

No. WhatsApp's multi-device protocol allows linked devices to operate independently. Your phone can be offline, turned off, or disconnected — the linked device session stays active.

### How many linked devices can I have?

WhatsApp allows up to 4 linked devices per account (in addition to the primary phone). whatsmeow-node uses one of these slots.

### What happens if I unlink the device from my phone?

The `logged_out` event fires with the reason. The session is permanently revoked — you'll need to delete the session database and pair again.

## Capabilities

### What can whatsmeow-node do?

100 of 126 upstream whatsmeow methods are wrapped. Key capabilities include:

- Send and receive text, images, video, audio, documents, stickers, contacts, and locations
- Create, manage, and interact with groups and communities
- Send polls, reactions, and message edits
- Manage newsletters (channels)
- Handle presence (online/offline, typing indicators)
- Download and upload media
- Manage privacy settings and blocklist
- Receive and process history sync data
- Handle calls (receive offers, reject calls)
- Manage disappearing messages

### Can it send messages to groups?

Yes. Use the group JID (format: `<id>@g.us`) with any send method. You can also create groups, manage participants, change settings, and more.

### Can it receive images and videos?

Yes. Listen for the `"message"` event and check for `imageMessage`, `videoMessage`, `audioMessage`, `documentMessage`, or `stickerMessage` fields. Download with `downloadAny(message)`.

### Can it make or receive calls?

It can receive call offers (`call:offer` event) and reject them (`rejectCall`). It cannot initiate or accept voice/video calls.

### Does it support message buttons or lists?

WhatsApp has restricted interactive messages (buttons, lists, product catalogs) to the official Business API. Sending them via unofficial clients may not work or may result in account restrictions.

### Can it read message history?

whatsmeow-node receives history sync data when a device first pairs. Listen for `history_sync` events to capture past messages. You cannot request history on demand — it's pushed by WhatsApp during the initial sync.

## Deployment

### Can I run it on a server (headless)?

Yes. whatsmeow-node is designed for headless environments. Use phone number pairing (`pairCode()`) if you can't display QR codes, or render QR codes via other means (web interface, API endpoint, etc.).

### Does it work with serverless (AWS Lambda, Vercel)?

It depends on the use case. For fire-and-forget tasks like sending an OTP or a single notification, serverless works — init, connect, send, disconnect within one invocation. For long-running bots that listen for incoming messages, serverless is a poor fit because whatsmeow-node maintains a persistent WebSocket connection and spawns a Go subprocess. For always-on bots, a persistent server (VPS, container, EC2) tends to work better. If you go the serverless route for one-shot sends, consider using a PostgreSQL store so the session persists across invocations.

### Does it work with Docker?

Yes. Use a Node.js base image (not Alpine unless you specifically need musl). The Go binary is included in the npm package — no additional setup needed. Example:

```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "bot.js"]
```

### Does it work with Next.js?

Yes, but you must add all `@whatsmeow-node` packages to `serverExternalPackages` in your Next.js config to prevent the bundler from trying to parse the Go binary. See the [Installation guide](/docs/installation#usage-with-nextjs).

### What database should I use in production?

PostgreSQL. It supports concurrent access and is suitable for multi-instance deployments. SQLite is fine for development and single-instance production.

### How much memory does it use?

The Go binary uses ~10-20 MB of RAM. Total process memory (Node.js + Go) is typically 50-80 MB, compared to 200-500 MB for browser-based solutions.

## Comparison

### How is this different from Baileys?

Baileys implements the WhatsApp protocol in pure JavaScript. whatsmeow-node wraps a Go implementation (whatsmeow) that powers the Mautrix WhatsApp bridge, used by thousands of Matrix users. The main trade-off: whatsmeow-node spawns an external process but inherits whatsmeow's reliability and maintenance.

### How is this different from whatsapp-web.js?

whatsapp-web.js automates a headless Chrome browser, requiring 200-500 MB of RAM and breaking when WhatsApp updates their web client. whatsmeow-node implements the protocol directly with ~10-20 MB of RAM and no browser dependency.

### Should I use this or the official WhatsApp Business API?

The official API is the only safe choice if you need guaranteed uptime, compliance, and no risk of account bans. whatsmeow-node is better for personal projects, prototyping, internal tools, or cases where the official API's cost or approval process is prohibitive.

## Troubleshooting

### Why isn't my QR code showing?

Call `getQRChannel()` **before** `connect()`, and only when `init()` returns no JID (meaning the device isn't paired yet). Make sure you're listening for the `"qr"` event.

### Why do my messages silently fail?

The most common cause is wrong field casing. Proto fields use exact protobuf casing: `URL`, `fileSHA256`, `fileEncSHA256` — not `url`, `fileSha256`, `fileEncSha256`. See [Troubleshooting](/docs/troubleshooting/common-issues#proto-field-naming).

### Why do I get `ERR_TIMEOUT`?

The default command timeout is 30 seconds. During initial sync or under heavy load, operations may take longer. Increase it with `createClient({ store: "session.db", commandTimeout: 60000 })`.

### How do I debug issues?

Listen for the `"log"` event to see output from the Go binary:

```typescript
client.on("log", (log) => {
  console.log(`[${log.level}] ${log.msg}`);
});
```

This often reveals the root cause of connection or protocol issues.
