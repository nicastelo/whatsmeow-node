---
title: "How to Use whatsmeow in Node.js"
sidebar_label: whatsmeow in Node.js
sidebar_position: 8
description: "Use whatsmeow from Node.js and TypeScript — install the npm package, connect to WhatsApp, send messages, and handle events without writing Go."
keywords: [whatsmeow nodejs, whatsmeow node, whatsmeow typescript, whatsmeow npm, use whatsmeow in javascript]
---

import Head from '@docusaurus/Head';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/whatsmeow-in-node.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/whatsmeow-in-node.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Use whatsmeow in Node.js",
      "description": "Use whatsmeow from Node.js and TypeScript — install the npm package, connect to WhatsApp, send messages, and handle events without writing Go.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/whatsmeow-in-node.png",
      "step": [
        {"@type": "HowToStep", "name": "Install whatsmeow-node", "text": "Run npm install @whatsmeow-node/whatsmeow-node to get the precompiled Go binary and TypeScript wrapper."},
        {"@type": "HowToStep", "name": "Create a Client", "text": "Use createClient() with a store path. The Go binary is spawned and managed automatically."},
        {"@type": "HowToStep", "name": "Connect to WhatsApp", "text": "Call init() to check for an existing session, then connect(). Pair via QR code on first run."},
        {"@type": "HowToStep", "name": "Send Messages and Handle Events", "text": "Use typed async methods like sendMessage() and listen for events like message, connected, and group:info."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Use whatsmeow in Node.js",
      "description": "Use whatsmeow from Node.js and TypeScript — install the npm package, connect to WhatsApp, send messages, and handle events without writing Go.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/whatsmeow-in-node.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/whatsmeow-in-node.png"}}
    })}
  </script>
</Head>

![How to Use whatsmeow in Node.js](/img/guides/whatsmeow-in-node.png)
![How to Use whatsmeow in Node.js](/img/guides/whatsmeow-in-node-light.png)

# How to Use whatsmeow in Node.js

[whatsmeow](https://github.com/tulir/whatsmeow) is the most battle-tested Go library for WhatsApp's multi-device protocol — it powers the [Mautrix WhatsApp bridge](https://github.com/mautrix/whatsapp) used by thousands of Matrix homeservers 24/7. whatsmeow-node brings it to Node.js with typed async methods and an event-driven API, no Go setup required.

## How It Works

whatsmeow-node ships a precompiled Go binary for your platform (macOS, Linux, Windows). When you call `createClient()`, it spawns that binary and communicates over JSON-line IPC through stdin/stdout:

```
Node.js (TypeScript) → stdin JSON → Go binary (whatsmeow) → WhatsApp
                     ← stdout JSON ←
```

You never interact with the binary directly. Every whatsmeow method is exposed as a typed async function on the client.

## Step 1: Install

```bash
npm install @whatsmeow-node/whatsmeow-node
```

The correct binary for your OS and architecture is installed automatically via an optional dependency.

:::info
Supported platforms: macOS (arm64, x64), Linux (arm64, x64), Windows (x64). See [Installation](/docs/installation) for details.
:::

## Step 2: Create a Client

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("error", (err) => {
  console.error("Error:", err);
});
```

`store` is where whatsmeow persists the session. Use a file path for SQLite (development) or a PostgreSQL URI for production.

## Step 3: Connect to WhatsApp

```typescript
import qrcode from "qrcode-terminal";

async function main() {
  const { jid } = await client.init();

  if (jid) {
    // Already paired — reconnect
    console.log(`Resuming session for ${jid}`);
    await client.connect();
  } else {
    // First run — pair via QR code
    client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
    await client.getQRChannel();
    await client.connect();
  }
}

main().catch(console.error);
```

After scanning the QR code once, the session is stored and subsequent runs skip straight to `connect()`.

## Step 4: Send Messages and Handle Events

```typescript
// Send a text message
const jid = "5512345678@s.whatsapp.net";
await client.sendMessage(jid, { conversation: "Hello from whatsmeow!" });

// Listen for incoming messages
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  if (text) {
    console.log(`${info.pushName}: ${text}`);
  }
});

// Listen for group events
client.on("group:info", (event) => {
  if (event.join) console.log(`${event.join.join(", ")} joined ${event.jid}`);
});
```

## What's Available

whatsmeow-node wraps 100+ whatsmeow methods. The major areas:

| Category | Methods |
|----------|---------|
| **Messaging** | `sendMessage`, `sendRawMessage`, `editMessage`, `revokeMessage`, `sendReaction`, `markRead` |
| **Media** | `uploadMedia`, `downloadAny`, `downloadMedia` |
| **Groups** | `createGroup`, `getJoinedGroups`, `getGroupInfo`, `updateGroupParticipants`, `setGroupAnnounce` |
| **Presence** | `sendPresence`, `sendChatPresence`, `subscribePresence` |
| **Privacy** | `getPrivacySettings`, `setPrivacySetting`, `getBlocklist`, `updateBlocklist` |
| **Polls** | `sendPollCreation`, `sendPollVote` |
| **Newsletters** | `createNewsletter`, `getSubscribedNewsletters`, `followNewsletter` |

See the [API Reference](/docs/api/overview) for the full list.

## Complete Example

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import qrcode from "qrcode-terminal";

const client = createClient({ store: "session.db" });

client.on("error", (err) => console.error("Error:", err));
client.on("logged_out", ({ reason }) => {
  console.error(`Logged out: ${reason}`);
  client.close();
  process.exit(1);
});

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  if (text) {
    console.log(`${info.pushName}: ${text}`);
    await client.markRead([info.id], info.chat, info.sender);
  }
});

async function main() {
  const { jid } = await client.init();

  if (jid) {
    await client.connect();
    console.log(`Connected as ${jid}`);
  } else {
    client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
    await client.getQRChannel();
    await client.connect();
  }

  await client.sendPresence("available");

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

:::warning No Go setup needed
You do not need to install Go. The precompiled binary is included in the npm package. If you're trying to compile whatsmeow yourself, you're overcomplicating things — just `npm install`.
:::

:::warning JID format
WhatsApp JIDs look like `5512345678@s.whatsapp.net` (individual) or `120363XXXXX@g.us` (group). Don't include the `+` prefix.
:::

:::warning Session management
The session database contains encryption keys. If you delete it, you'll need to re-pair. In production, back it up or use PostgreSQL.
:::

## Next Steps

- [How to Pair WhatsApp](pair-whatsapp) — QR and phone number pairing details
- [How to Build a Bot](build-a-bot) — full echo bot with commands
- [How to Send WhatsApp Messages from TypeScript](send-messages-typescript) — type-safe messaging
- [Comparison with Alternatives](/docs/comparison) — vs. Baileys, whatsapp-web.js, and the official API
