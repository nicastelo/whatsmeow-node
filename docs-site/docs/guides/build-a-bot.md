---
title: "How to Build a WhatsApp Bot with Node.js"
sidebar_label: Build a Bot
sidebar_position: 2
description: "Build a WhatsApp bot with Node.js and TypeScript — receive messages, handle commands, reply with quotes, and manage connections."
keywords: [whatsapp bot nodejs, build whatsapp bot typescript, whatsapp bot tutorial, whatsapp automation nodejs]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/build-a-bot.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/build-a-bot.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Build a WhatsApp Bot with Node.js",
      "description": "Build a WhatsApp bot with Node.js and TypeScript — receive messages, handle commands, reply with quotes, and manage connections.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/build-a-bot.png",
      "step": [
        {"@type": "HowToStep", "name": "Create the Client", "text": "Initialize a WhatsmeowClient with createClient() and a session store."},
        {"@type": "HowToStep", "name": "Handle Incoming Messages", "text": "Listen for the message event and extract text from conversation or extendedTextMessage."},
        {"@type": "HowToStep", "name": "Reply to Messages", "text": "Use sendMessage for text or sendRawMessage with contextInfo for quoted replies."},
        {"@type": "HowToStep", "name": "Add Commands", "text": "Route messages starting with ! to command handlers like !ping and !help."},
        {"@type": "HowToStep", "name": "Handle Errors and Reconnection", "text": "Listen for logged_out and disconnected events. Auto-reconnect is built-in."},
        {"@type": "HowToStep", "name": "Graceful Shutdown", "text": "Handle SIGINT to set presence unavailable and disconnect cleanly."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Build a WhatsApp Bot with Node.js",
      "description": "Build a WhatsApp bot with Node.js and TypeScript — receive messages, handle commands, reply with quotes, and manage connections.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/build-a-bot.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Build a WhatsApp Bot with Node.js](/img/guides/build-a-bot.png)
![How to Build a WhatsApp Bot with Node.js](/img/guides/build-a-bot-light.png)

# How to Build a WhatsApp Bot with Node.js

whatsmeow-node lets you build a fully functional WhatsApp bot in under 60 lines of TypeScript. The bot connects as a linked device (like WhatsApp Web), receives messages in real time, and can reply with text, media, or structured messages.

## Prerequisites

- Node.js 18+ and npm
- A WhatsApp account to link as a device
- whatsmeow-node installed ([Installation guide](/docs/installation))
- A paired session — run through [How to Pair WhatsApp](pair-whatsapp) first, or the bot will pair on first run

## Step 1: Create the Client

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("error", (err) => {
  console.error("Error:", err);
});
```

The `store` option tells whatsmeow-node where to persist the session. Pass a file path for SQLite (good for development) or a Postgres connection string for production.

## Step 2: Handle Incoming Messages

```typescript
client.on("message", async ({ info, message }) => {
  // Skip your own messages to avoid echo loops
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  if (!text) return;

  console.log(`${info.pushName}: ${text}`);
});
```

Every incoming message fires the `"message"` event with two objects:
- `info` — metadata (sender JID, chat JID, timestamp, whether it's a group, etc.)
- `message` — the protobuf message content

:::warning
Always check `info.isFromMe` and skip your own messages. Without this check, your bot will reply to its own messages in an infinite loop.
:::

## Step 3: Reply to Messages

```typescript
// Simple text reply
await client.sendMessage(info.chat, { conversation: "Hello!" });

// Reply with a quote (shows the original message)
await client.sendRawMessage(info.chat, {
  extendedTextMessage: {
    text: "I got your message!",
    contextInfo: {
      stanzaId: info.id,
      participant: info.sender,
      quotedMessage: { conversation: text },
    },
  },
});
```

`sendMessage` is the simplest way to send text. For replies that quote the original message, use `sendRawMessage` with `contextInfo`.

## Step 4: Add Commands

A common pattern is to route messages starting with `!` to command handlers:

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  // Mark as read
  await client.markRead([info.id], info.chat, info.sender);

  // Show typing indicator
  await client.sendChatPresence(info.chat, "composing");

  const command = text.toLowerCase().trim();

  if (command === "!ping") {
    await client.sendMessage(info.chat, { conversation: "pong" });
    return;
  }

  if (command === "!help") {
    await client.sendMessage(info.chat, {
      conversation: "Commands: !ping, !help, !whoami",
    });
    return;
  }

  if (command === "!whoami") {
    await client.sendMessage(info.chat, {
      conversation: `You are ${info.pushName}\nJID: ${info.sender}`,
    });
    return;
  }

  // Echo everything else
  await client.sendMessage(info.chat, { conversation: text });
});
```

## Step 5: Handle Errors and Reconnection

```typescript
// Session was permanently revoked — must re-pair
client.on("logged_out", ({ reason }) => {
  console.error(`Logged out: ${reason}`);
  client.close();
  process.exit(1);
});

// Informational — whatsmeow handles reconnection automatically
client.on("disconnected", () => {
  console.log("Disconnected, waiting for auto-reconnect...");
});
```

:::info
You don't need manual reconnection logic. The underlying whatsmeow library reconnects automatically. The `disconnected` event is informational only.
:::

## Step 6: Graceful Shutdown

```typescript
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await client.sendPresence("unavailable");
  await client.disconnect();
  client.close();
  process.exit(0);
});
```

Setting presence to `"unavailable"` before disconnecting lets your contacts see you go offline immediately instead of waiting for the timeout.

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
  if (!text) return;

  await client.markRead([info.id], info.chat, info.sender);
  await client.sendChatPresence(info.chat, "composing");

  const command = text.toLowerCase().trim();

  if (command === "!ping") {
    await client.sendMessage(info.chat, { conversation: "pong" });
  } else if (command === "!help") {
    await client.sendMessage(info.chat, {
      conversation: "Commands: !ping, !help, !whoami",
    });
  } else if (command === "!whoami") {
    await client.sendMessage(info.chat, {
      conversation: `You are ${info.pushName}\nJID: ${info.sender}`,
    });
  } else {
    // Echo
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
  }
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.log("Not paired — scan the QR code:");
    client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
    await client.getQRChannel();
  }

  await client.connect();
  await client.sendPresence("available");
  console.log("Bot is online! Commands: !ping, !help, !whoami");

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

:::warning Echo loops
Always check `info.isFromMe` before processing a message. Without it, the bot replies to its own replies forever.
:::

:::warning Group messages
In groups, `info.chat` is the group JID and `info.sender` is the individual who sent the message. Reply to `info.chat` to send to the group, not `info.sender`.
:::

:::warning Rate limiting
WhatsApp rate-limits message sending. If your bot sends too many messages too quickly, you may get temporarily blocked. See [Rate Limiting](/docs/rate-limiting) for details.
:::

<RelatedGuides slugs={["send-messages-typescript", "connect-to-ai", "typing-indicators", "automate-group-messages"]} />
