---
title: Bots & Resilience
sidebar_position: 8
description: "Build a WhatsApp bot with Node.js — echo messages, handle commands, auto-reconnect, and manage the full connection lifecycle."
keywords: [whatsapp bot nodejs, build whatsapp bot typescript, whatsapp bot template nodejs, whatsapp auto reconnect nodejs]
---

# Bots & Resilience

:::tip Looking for a step-by-step tutorial?
See [How to Build a WhatsApp Bot](/docs/guides/build-a-bot).
:::

A full bot template and resilient connection handling.

## Echo Bot

A complete bot that echoes messages, re-sends images, handles commands, and rejects calls.

### Features

- Echoes text messages back with a quoted reply
- Downloads and re-sends received images
- Sends read receipts (blue ticks)
- Shows typing indicators before replying
- Handles both DMs and group messages
- Rejects incoming calls
- Commands: `!ping`, `!info`, `!whoami`, `!groups`

### Message handling pattern

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return; // Skip own messages to avoid loops

  // Mark as read (blue ticks)
  await client.markRead([info.id], info.chat, info.sender);

  // Show typing indicator
  await client.sendChatPresence(info.chat, "composing");
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Handle commands
  if (text?.toLowerCase() === "!ping") {
    await client.sendMessage(info.chat, { conversation: "pong" });
    return;
  }

  // Echo text back with a quote
  await client.sendRawMessage(info.chat, {
    extendedTextMessage: {
      text: text,
      contextInfo: {
        stanzaId: info.id,
        participant: info.sender,
        quotedMessage: { conversation: text },
      },
    },
  });
});
```

### Echo images back

```typescript
if (message.imageMessage) {
  const filePath = await client.downloadAny(message);
  const media = await client.uploadMedia(filePath, "image");
  await client.sendRawMessage(info.chat, {
    imageMessage: {
      URL: media.URL,
      directPath: media.directPath,
      mediaKey: media.mediaKey,
      fileEncSHA256: media.fileEncSHA256,
      fileSHA256: media.fileSHA256,
      fileLength: String(media.fileLength),
      mimetype: "image/png",
      caption: `Echo from ${info.pushName}!`,
    },
  });
}
```

### Auto-reject calls

```typescript
client.on("call:offer", async ({ from, callId }) => {
  await client.rejectCall(from, callId);
});
```

### Graceful shutdown

```typescript
process.on("SIGINT", async () => {
  await client.sendPresence("unavailable");
  await client.disconnect();
  client.close();
  process.exit(0);
});
```

[Full source: `echo-bot.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/echo-bot.ts)

---

## Resilient Connection

Stays connected with auto-reconnect, handles disconnections, session revocations, and all connection lifecycle events.

```typescript
import { createClient, WhatsmeowError } from "@whatsmeow-node/whatsmeow-node";

// Auto-reconnect is built-in — whatsmeow handles this internally
client.on("disconnected", () => {
  console.log("Waiting for auto-reconnect...");
});

// Session was revoked — user unlinked the device
client.on("logged_out", ({ reason }) => {
  console.error(`Logged out: ${reason} — must re-pair`);
  client.close();
  process.exit(1);
});

// Connection health monitoring
client.on("stream_error", ({ code }) => {
  console.warn(`Stream error: code=${code}`);
});

client.on("keep_alive_timeout", ({ errorCount }) => {
  console.warn(`Keep-alive timeout: errors=${errorCount}`);
});

client.on("keep_alive_restored", () => {
  console.log("Keep-alive restored");
});

// Typed error handling
client.on("error", (err) => {
  if (err instanceof WhatsmeowError) {
    console.error(`[${err.code}] ${err.message}`);
  } else {
    console.error(err);
  }
});
```

:::info
You don't need to implement manual reconnection logic. The underlying whatsmeow library handles reconnection automatically. The `disconnected` event is informational only.
:::

:::warning
The `logged_out` event means the session was permanently revoked (the user unlinked the device from WhatsApp). The only recovery is to delete `session.db` and re-pair.
:::

[Full source: `reconnect.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/reconnect.ts)
