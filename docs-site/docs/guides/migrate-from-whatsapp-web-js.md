---
title: "How to Replace whatsapp-web.js with whatsmeow-node"
sidebar_label: Migrate from whatsapp-web.js
sidebar_position: 11
description: "Migrate from whatsapp-web.js to whatsmeow-node — drop Puppeteer, cut memory from 500 MB to 20 MB, and get a typed async API."
keywords: [whatsapp-web.js alternative, replace whatsapp-web.js, whatsapp-web.js to whatsmeow, whatsapp-web.js migration, whatsapp bot without puppeteer, whatsapp bot without browser]
---

import Head from '@docusaurus/Head';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/migrate-from-whatsapp-web-js.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/migrate-from-whatsapp-web-js.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Replace whatsapp-web.js with whatsmeow-node",
      "description": "Migrate from whatsapp-web.js to whatsmeow-node — drop Puppeteer, cut memory from 500 MB to 20 MB, and get a typed async API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/migrate-from-whatsapp-web-js.png",
      "step": [
        {"@type": "HowToStep", "name": "Install whatsmeow-node", "text": "Replace whatsapp-web.js and puppeteer with @whatsmeow-node/whatsmeow-node."},
        {"@type": "HowToStep", "name": "Update Client Initialization", "text": "Replace new Client() with createClient(). No LocalAuth or Puppeteer configuration needed."},
        {"@type": "HowToStep", "name": "Update Event Listeners", "text": "Replace client.on('message') callback shapes and update message property access patterns."},
        {"@type": "HowToStep", "name": "Update Message Sending", "text": "Replace client.sendMessage() with the whatsmeow-node sendMessage or sendRawMessage methods."},
        {"@type": "HowToStep", "name": "Remove Browser Dependencies", "text": "Remove Puppeteer, Chromium, and any browser-related configuration from your project."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Replace whatsapp-web.js with whatsmeow-node",
      "description": "Migrate from whatsapp-web.js to whatsmeow-node — drop Puppeteer, cut memory from 500 MB to 20 MB, and get a typed async API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/migrate-from-whatsapp-web-js.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/migrate-from-whatsapp-web-js.png"}}
    })}
  </script>
</Head>

![How to Replace whatsapp-web.js with whatsmeow-node](/img/guides/migrate-from-whatsapp-web-js.png)
![How to Replace whatsapp-web.js with whatsmeow-node](/img/guides/migrate-from-whatsapp-web-js-light.png)

# How to Replace whatsapp-web.js with whatsmeow-node

[whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) runs a headless Chrome browser to automate WhatsApp Web. It works, but it's heavy — 200-500 MB of RAM for the browser alone, slow startup, and it breaks when WhatsApp updates their web client. whatsmeow-node uses the native multi-device protocol directly, with no browser needed.

## Why Migrate?

| | whatsapp-web.js | whatsmeow-node |
|---|---|---|
| **Memory** | 200-500 MB (Chromium) | ~10-20 MB |
| **Startup** | 5-15 seconds (browser launch) | Under 1 second |
| **Dependencies** | Puppeteer + Chromium | Single Go binary (included) |
| **Protocol** | Web client automation | Native multi-device |
| **Stability** | Breaks on WhatsApp Web updates | Stable upstream (whatsmeow) |
| **Docker image** | ~1 GB+ (needs Chrome) | ~50 MB |
| **TypeScript** | Community types | Native TypeScript |

## Step 1: Install

```bash
# Remove whatsapp-web.js and Puppeteer
npm uninstall whatsapp-web.js puppeteer

# Install whatsmeow-node
npm install @whatsmeow-node/whatsmeow-node
```

You can also remove any Chromium-related dependencies or Docker layers.

## Step 2: Update Client Initialization

### whatsapp-web.js

```javascript
const { Client, LocalAuth } = require("whatsapp-web.js");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox"],
  },
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.initialize();
```

### whatsmeow-node

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import qrcode from "qrcode-terminal";

const client = createClient({ store: "session.db" });

async function main() {
  const { jid } = await client.init();

  if (jid) {
    await client.connect();
    console.log("Client is ready!");
  } else {
    client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
    await client.getQRChannel();
    await client.connect();
  }
}

main().catch(console.error);
```

No Puppeteer config, no auth strategy, no `initialize()` — just `init()` + `connect()`.

## Step 3: Update Event Listeners

### Messages

**whatsapp-web.js:**
```javascript
client.on("message", async (msg) => {
  if (msg.fromMe) return;
  console.log(`${msg.from}: ${msg.body}`);

  if (msg.body === "!ping") {
    await msg.reply("pong");
  }
});
```

**whatsmeow-node:**
```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  console.log(`${info.chat}: ${text}`);

  if (text === "!ping") {
    await client.sendMessage(info.chat, { conversation: "pong" });
  }
});
```

Key differences:
- No `msg.body` shortcut — text is extracted from the protobuf message
- No `msg.reply()` — use `sendMessage()` or `sendRawMessage()` with `contextInfo` for quotes
- `msg.from` → `info.chat`, `msg.fromMe` → `info.isFromMe`

### Connection events

**whatsapp-web.js:**
```javascript
client.on("ready", () => console.log("Ready"));
client.on("disconnected", (reason) => console.log("Disconnected:", reason));
```

**whatsmeow-node:**
```typescript
client.on("connected", ({ jid }) => console.log(`Connected as ${jid}`));
client.on("disconnected", () => console.log("Disconnected"));
client.on("logged_out", ({ reason }) => console.error(`Logged out: ${reason}`));
```

## Step 4: Update Message Sending

### Text

**whatsapp-web.js:**
```javascript
await client.sendMessage(chatId, "Hello!");
```

**whatsmeow-node:**
```typescript
await client.sendMessage(jid, { conversation: "Hello!" });
```

### Reply with quote

**whatsapp-web.js:**
```javascript
await msg.reply("Got it!");
```

**whatsmeow-node:**
```typescript
await client.sendRawMessage(info.chat, {
  extendedTextMessage: {
    text: "Got it!",
    contextInfo: {
      stanzaId: info.id,
      participant: info.sender,
      quotedMessage: { conversation: originalText },
    },
  },
});
```

### Media

**whatsapp-web.js:**
```javascript
const media = MessageMedia.fromFilePath("/path/to/photo.jpg");
await client.sendMessage(chatId, media, { caption: "Check this out" });
```

**whatsmeow-node:**
```typescript
const media = await client.uploadMedia("/path/to/photo.jpg", "image");
await client.sendRawMessage(jid, {
  imageMessage: {
    URL: media.URL,
    directPath: media.directPath,
    mediaKey: media.mediaKey,
    fileEncSHA256: media.fileEncSHA256,
    fileSHA256: media.fileSHA256,
    fileLength: String(media.fileLength),
    mimetype: "image/jpeg",
    caption: "Check this out",
  },
});
```

### Reactions

**whatsapp-web.js:**
```javascript
await msg.react("👍");
```

**whatsmeow-node:**
```typescript
await client.sendReaction(chat, sender, messageId, "👍");
```

## Step 5: Update Group Operations

| whatsapp-web.js | whatsmeow-node |
|-----------------|----------------|
| `client.createGroup(name, members)` | `client.createGroup(name, members)` |
| `chat.fetchMessages()` | — (use message event) |
| `groupChat.addParticipants([id])` | `client.updateGroupParticipants(jid, [id], "add")` |
| `groupChat.removeParticipants([id])` | `client.updateGroupParticipants(jid, [id], "remove")` |
| `groupChat.promoteParticipants([id])` | `client.updateGroupParticipants(jid, [id], "promote")` |
| `groupChat.setSubject(name)` | `client.setGroupName(jid, name)` |
| `groupChat.setDescription(desc)` | `client.setGroupDescription(jid, desc)` |
| `groupChat.leave()` | `client.leaveGroup(jid)` |
| `groupChat.getInviteCode()` | `client.getGroupInviteLink(jid)` |

## Step 6: Clean Up

After migrating, you can remove from your project:

- `puppeteer` / `puppeteer-core` dependency
- Chromium download scripts or Docker layers
- `.wwebjs_auth/` directory (LocalAuth session data)
- Any `--no-sandbox`, `--disable-gpu` Chrome flag configuration
- Browser-specific CI/CD setup (Xvfb, etc.)

Your Docker images will shrink dramatically without Chromium.

## JID Format Differences

whatsapp-web.js uses `number@c.us` for contacts. whatsmeow-node uses `number@s.whatsapp.net`:

```typescript
// whatsapp-web.js
const chatId = "5512345678@c.us";

// whatsmeow-node
const jid = "5512345678@s.whatsapp.net";
```

Group JIDs remain the same format: `120363XXXXX@g.us`.

## Migration Checklist

- [ ] Install `@whatsmeow-node/whatsmeow-node`, remove `whatsapp-web.js` and `puppeteer`
- [ ] Replace `new Client()` → `createClient()`
- [ ] Remove Puppeteer config and `LocalAuth`
- [ ] Update event listeners (different event names and shapes)
- [ ] Replace `msg.body` with protobuf message extraction
- [ ] Replace `msg.reply()` with `sendMessage()` / `sendRawMessage()`
- [ ] Replace `client.sendMessage(id, text)` with `sendMessage(jid, { conversation: text })`
- [ ] Update JID format: `@c.us` → `@s.whatsapp.net`
- [ ] Update media sending (separate upload + send)
- [ ] Remove Chromium from Docker / CI
- [ ] Re-pair via QR code
- [ ] Test all message types end-to-end

## Common Pitfalls

:::warning New session required
whatsapp-web.js sessions cannot be migrated. You must pair fresh by scanning the QR code. Your WhatsApp data is unaffected.
:::

:::warning No `msg.body`
whatsapp-web.js gives you `msg.body` as a convenience. whatsmeow-node gives you the raw protobuf, so text could be in `message.conversation` or `message.extendedTextMessage.text`. Always check both.
:::

:::warning JID format
whatsapp-web.js uses `@c.us` for contacts. whatsmeow-node uses `@s.whatsapp.net`. If you have stored JIDs, update them.
:::

## Next Steps

- [Getting Started](/docs/getting-started) — quick overview of the full API
- [How to Build a Bot](build-a-bot) — build a command bot from scratch
- [How to Send WhatsApp Messages from TypeScript](send-messages-typescript) — all message types
- [API Reference](/docs/api/overview) — all available methods
