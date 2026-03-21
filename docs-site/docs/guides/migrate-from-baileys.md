---
title: "How to Replace Baileys with whatsmeow-node"
sidebar_label: Migrate from Baileys
sidebar_position: 10
description: "Migrate your WhatsApp bot from Baileys to whatsmeow-node — side-by-side code comparison, API mapping, and step-by-step migration guide."
keywords: [baileys alternative, replace baileys, baileys to whatsmeow, baileys migration, whatsapp bot migration nodejs, baileys vs whatsmeow]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/migrate-from-baileys.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/migrate-from-baileys.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Replace Baileys with whatsmeow-node",
      "description": "Migrate your WhatsApp bot from Baileys to whatsmeow-node — side-by-side code comparison, API mapping, and step-by-step migration guide.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/migrate-from-baileys.png",
      "step": [
        {"@type": "HowToStep", "name": "Install whatsmeow-node", "text": "Replace @whiskeysockets/baileys with @whatsmeow-node/whatsmeow-node in your dependencies."},
        {"@type": "HowToStep", "name": "Update Client Initialization", "text": "Replace makeWASocket with createClient. Switch from useMultiFileAuthState to a store path."},
        {"@type": "HowToStep", "name": "Update Event Listeners", "text": "Replace ev.on('messages.upsert') with client.on('message'). Update event shapes to match whatsmeow-node."},
        {"@type": "HowToStep", "name": "Update Message Sending", "text": "Replace sendMessage with the whatsmeow-node equivalent. Content shape is similar but key names differ."},
        {"@type": "HowToStep", "name": "Update Group Operations", "text": "Replace groupCreate, groupMetadata, etc. with the whatsmeow-node equivalents."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Replace Baileys with whatsmeow-node",
      "description": "Migrate your WhatsApp bot from Baileys to whatsmeow-node — side-by-side code comparison, API mapping, and step-by-step migration guide.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/migrate-from-baileys.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/migrate-from-baileys.png"}}
    })}
  </script>
</Head>

![How to Replace Baileys with whatsmeow-node](/img/guides/migrate-from-baileys.png)
![How to Replace Baileys with whatsmeow-node](/img/guides/migrate-from-baileys-light.png)

# How to Replace Baileys with whatsmeow-node

If you're using [Baileys](https://github.com/WhiskeySockets/Baileys) and running into maintenance issues, fork instability, or want a more reliable upstream, whatsmeow-node is a drop-in alternative with a similar API surface. This guide maps the key concepts and shows you how to migrate.

## Why Migrate?

- **Stable upstream** — whatsmeow is maintained by the Mautrix team and used in production by thousands of Matrix bridges 24/7. When WhatsApp changes their protocol, fixes land fast.
- **No fork roulette** — Baileys has gone through multiple forks (adiwajshing → WhiskeySockets → others). whatsmeow-node wraps one stable Go library.
- **Lower memory** — ~10-20 MB vs ~50 MB typical for Baileys.
- **Typed API** — 100+ typed async methods with TypeScript-first design.

See the full [Comparison with Alternatives](/docs/comparison) for details.

## Step 1: Install

```bash
# Remove Baileys
npm uninstall @whiskeysockets/baileys

# Install whatsmeow-node
npm install @whatsmeow-node/whatsmeow-node
```

## Step 2: Update Client Initialization

### Baileys

```typescript
import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";

const { state, saveCreds } = await useMultiFileAuthState("auth_info");
const sock = makeWASocket({ auth: state });
sock.ev.on("creds.update", saveCreds);
```

### whatsmeow-node

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });
const { jid } = await client.init();
await client.connect();
```

Session persistence is automatic — no `saveCreds` callback needed. The `store` option accepts a file path (SQLite) or a PostgreSQL connection string.

:::info
You'll need to re-pair (scan QR code) after switching. Baileys auth state is not compatible with whatsmeow sessions.
:::

## Step 3: Update Event Listeners

### Messages

**Baileys:**
```typescript
sock.ev.on("messages.upsert", ({ messages }) => {
  for (const msg of messages) {
    if (msg.key.fromMe) continue;
    const text = msg.message?.conversation
      ?? msg.message?.extendedTextMessage?.text;
    console.log(`${msg.pushName}: ${text}`);
  }
});
```

**whatsmeow-node:**
```typescript
client.on("message", ({ info, message }) => {
  if (info.isFromMe) return;
  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  console.log(`${info.pushName}: ${text}`);
});
```

Key differences:
- Single message per event (not batched)
- Message metadata is in `info`, protobuf content is in `message`
- `info.isFromMe` replaces `msg.key.fromMe`
- `info.chat` replaces `msg.key.remoteJid`
- `info.sender` replaces `msg.key.participant` (in groups)

### Connection

**Baileys:**
```typescript
sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
  if (connection === "open") console.log("Connected!");
  if (connection === "close") { /* handle reconnection */ }
});
```

**whatsmeow-node:**
```typescript
client.on("connected", ({ jid }) => console.log(`Connected as ${jid}`));
client.on("disconnected", () => console.log("Disconnected"));
client.on("logged_out", ({ reason }) => console.error(`Logged out: ${reason}`));
```

You don't need manual reconnection logic — whatsmeow handles it automatically.

## Step 4: Update Message Sending

### Text message

**Baileys:**
```typescript
await sock.sendMessage(jid, { text: "Hello!" });
```

**whatsmeow-node:**
```typescript
await client.sendMessage(jid, { conversation: "Hello!" });
```

### Reply with quote

**Baileys:**
```typescript
await sock.sendMessage(jid, { text: "Reply!" }, { quoted: msg });
```

**whatsmeow-node:**
```typescript
await client.sendRawMessage(jid, {
  extendedTextMessage: {
    text: "Reply!",
    contextInfo: {
      stanzaId: info.id,
      participant: info.sender,
      quotedMessage: { conversation: originalText },
    },
  },
});
```

### Media

**Baileys:**
```typescript
await sock.sendMessage(jid, {
  image: { url: "/path/to/photo.jpg" },
  caption: "Check this out",
});
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

Media upload and sending are separate steps in whatsmeow-node. This gives you more control (e.g., upload once, send to multiple chats).

### Reactions

**Baileys:**
```typescript
await sock.sendMessage(jid, { react: { text: "👍", key: msg.key } });
```

**whatsmeow-node:**
```typescript
await client.sendReaction(jid, senderJid, messageId, "👍");
```

## Step 5: Update Group Operations

| Baileys | whatsmeow-node |
|---------|----------------|
| `sock.groupCreate(name, members)` | `client.createGroup(name, members)` |
| `sock.groupMetadata(jid)` | `client.getGroupInfo(jid)` |
| `sock.groupFetchAllParticipating()` | `client.getJoinedGroups()` |
| `sock.groupUpdateSubject(jid, name)` | `client.setGroupName(jid, name)` |
| `sock.groupUpdateDescription(jid, desc)` | `client.setGroupDescription(jid, desc)` |
| `sock.groupSettingUpdate(jid, "announcement")` | `client.setGroupAnnounce(jid, true)` |
| `sock.groupParticipantsUpdate(jid, [jid], "add")` | `client.updateGroupParticipants(jid, [jid], "add")` |
| `sock.groupInviteCode(jid)` | `client.getGroupInviteLink(jid)` |
| `sock.groupLeave(jid)` | `client.leaveGroup(jid)` |

## API Quick Reference

| Baileys | whatsmeow-node |
|---------|----------------|
| `makeWASocket()` | `createClient()` |
| `sock.sendMessage(jid, content)` | `client.sendMessage(jid, content)` |
| `sock.readMessages([key])` | `client.markRead([id], chat, sender)` |
| `sock.sendPresenceUpdate("available")` | `client.sendPresence("available")` |
| `sock.presenceSubscribe(jid)` | `client.subscribePresence(jid)` |
| `sock.profilePictureUrl(jid)` | `client.getProfilePicture(jid)` |
| `sock.updateBlockStatus(jid, "block")` | `client.updateBlocklist(jid, "block")` |
| `sock.logout()` | `client.logout()` |

## Migration Checklist

- [ ] Install `@whatsmeow-node/whatsmeow-node`, remove `@whiskeysockets/baileys`
- [ ] Replace `makeWASocket` → `createClient`
- [ ] Remove `useMultiFileAuthState` — session is handled automatically
- [ ] Update event listeners (`ev.on` → `client.on`, different event names)
- [ ] Update `sendMessage` calls (`text` → `conversation`)
- [ ] Update media sending (separate upload + send steps)
- [ ] Update group operations (method names differ slightly)
- [ ] Remove manual reconnection logic — whatsmeow auto-reconnects
- [ ] Re-pair via QR code (new session required)
- [ ] Test all message types end-to-end

## Common Pitfalls

:::warning New session required
Baileys auth state cannot be migrated. You must pair a new session by scanning the QR code. Your WhatsApp chat history and contacts are unaffected — only the device link is new.
:::

:::warning `text` vs `conversation`
Baileys uses `{ text: "..." }` for messages. whatsmeow-node uses `{ conversation: "..." }` — matching the WhatsApp protobuf field name.
:::

:::warning Proto field casing
Upload response fields use exact protobuf casing: `URL`, `fileSHA256`, `fileEncSHA256` — **not** camelCase. Using wrong casing silently fails.
:::

<RelatedGuides slugs={["whatsmeow-in-node", "build-a-bot", "migrate-from-whatsapp-web-js"]} />
