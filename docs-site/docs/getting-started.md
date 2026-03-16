---
title: Getting Started
sidebar_position: 3
description: "Quick start guide for whatsmeow-node — connect to WhatsApp, send messages, handle media, and manage events in TypeScript."
---

# Getting Started

## Quick Start

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("qr", ({ code }) => console.log("Scan this QR:", code));
client.on("connected", ({ jid }) => console.log("Connected as", jid));
client.on("message", ({ info, message }) => {
  console.log(`${info.pushName}: ${message.conversation ?? JSON.stringify(message)}`);
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    await client.getQRChannel();
  }
  await client.connect();
}
main();
```

## Client Options

| Option           | Type     | Default   | Description                              |
|------------------|----------|-----------|------------------------------------------|
| `store`          | `string` | required  | SQLite path (`session.db`) or Postgres URL (`postgresql://host/db`) |
| `binaryPath`     | `string` | auto      | Path to the Go binary (auto-resolved from platform package) |
| `commandTimeout` | `number` | `30000`   | IPC command timeout in milliseconds      |

## Sending Messages

**Text message:**

```typescript
await client.sendMessage("5512345678@s.whatsapp.net", {
  conversation: "Hello!",
});
```

**Reply to a message:**

```typescript
await client.sendMessage(jid, {
  extendedTextMessage: {
    text: "This is a reply",
    contextInfo: {
      stanzaId: originalMessageId,
      participant: originalSenderJid,
      quotedMessage: { conversation: "the original text" },
    },
  },
});
```

**Image, location, contact card** — use `sendRawMessage` for any proto shape:

```typescript
// Upload then send an image
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

// Send a location
await client.sendRawMessage(jid, {
  locationMessage: {
    degreesLatitude: -34.9011,
    degreesLongitude: -56.1645,
    name: "Montevideo",
  },
});

// Send a contact card
await client.sendRawMessage(jid, {
  contactMessage: {
    displayName: "John Doe",
    vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+1234567890\nEND:VCARD",
  },
});
```

`sendRawMessage` accepts any `Record<string, unknown>` matching the [whatsmeow `waE2E.Message` proto schema](https://pkg.go.dev/go.mau.fi/whatsmeow/proto/waE2E#Message).

## Downloading Media

When you receive a message with media, download it to a temp file:

```typescript
client.on("message", async ({ info, message }) => {
  // downloadAny auto-detects the media type
  if (message.imageMessage || message.videoMessage || message.audioMessage || message.documentMessage) {
    const filePath = await client.downloadAny(message);
    console.log("Media saved to:", filePath);
  }
});
```

For more control, use `downloadMediaWithPath` with explicit keys:

```typescript
const filePath = await client.downloadMediaWithPath({
  directPath: msg.imageMessage.directPath,
  mediaKey: msg.imageMessage.mediaKey,
  fileHash: msg.imageMessage.fileSHA256,
  encFileHash: msg.imageMessage.fileEncSHA256,
  fileLength: msg.imageMessage.fileLength,
  mediaType: "image",
});
```

:::info Field naming
When **receiving** messages, field names follow proto casing (`fileSHA256`, `fileEncSHA256`).
When passing arguments **to download methods**, use the method's own parameter names (`fileHash`, `encFileHash`).
See [Troubleshooting](/docs/troubleshooting/common-issues#proto-field-naming) for details.
:::

## Close Cleanly

```typescript
await client.disconnect();
client.close();
```
