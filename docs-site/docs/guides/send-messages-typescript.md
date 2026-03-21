---
title: "How to Send WhatsApp Messages from TypeScript"
sidebar_label: Send Messages (TypeScript)
sidebar_position: 9
description: "Send WhatsApp messages from TypeScript with full type safety — text, replies, mentions, media, polls, and reactions using whatsmeow-node."
keywords: [send whatsapp message typescript, whatsapp api typescript, whatsapp bot typescript, send whatsapp text nodejs, whatsapp typescript library]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/send-messages-typescript.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/send-messages-typescript.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Send WhatsApp Messages from TypeScript",
      "description": "Send WhatsApp messages from TypeScript with full type safety — text, replies, mentions, media, polls, and reactions using whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/send-messages-typescript.png",
      "step": [
        {"@type": "HowToStep", "name": "Set Up the Client", "text": "Install whatsmeow-node and create a client with createClient(). Pair via QR code on first run."},
        {"@type": "HowToStep", "name": "Send a Text Message", "text": "Use sendMessage(jid, { conversation: text }) for simple messages."},
        {"@type": "HowToStep", "name": "Reply with Quotes and Mentions", "text": "Use sendRawMessage with extendedTextMessage and contextInfo for quoted replies and @mentions."},
        {"@type": "HowToStep", "name": "Send Media Messages", "text": "Upload files with uploadMedia(), then send with sendRawMessage using the returned media metadata."},
        {"@type": "HowToStep", "name": "React, Edit, and Delete", "text": "Use sendReaction(), editMessage(), and revokeMessage() to interact with sent messages."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Send WhatsApp Messages from TypeScript",
      "description": "Send WhatsApp messages from TypeScript with full type safety — text, replies, mentions, media, polls, and reactions using whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/send-messages-typescript.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/send-messages-typescript.png"}}
    })}
  </script>
</Head>

![How to Send WhatsApp Messages from TypeScript](/img/guides/send-messages-typescript.png)
![How to Send WhatsApp Messages from TypeScript](/img/guides/send-messages-typescript-light.png)

# How to Send WhatsApp Messages from TypeScript

whatsmeow-node gives you typed async methods for every kind of WhatsApp message — text, replies, mentions, media, polls, and reactions. This guide covers each one with TypeScript examples.

## Prerequisites

- whatsmeow-node installed ([Installation guide](/docs/installation))
- A paired session ([How to Pair WhatsApp](pair-whatsapp))

## Set Up the Client

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

async function main() {
  const { jid: myJid } = await client.init();
  if (!myJid) {
    console.error("Not paired — run the pairing flow first");
    process.exit(1);
  }
  await client.connect();
  await client.waitForConnection();

  const recipient = "5512345678@s.whatsapp.net";

  // ... send messages here
}

main().catch(console.error);
```

## Send a Text Message

The simplest way — pass a `conversation` string:

```typescript
const resp = await client.sendMessage(recipient, {
  conversation: "Hello from TypeScript!",
});

console.log(`Sent with ID: ${resp.id}`);
```

`sendMessage` is the high-level method. It takes a JID and a `MessageContent` object, and returns a `SendResponse` with the message `id` and `timestamp`.

## Reply with a Quote

To show the original message in a quote bubble, use `sendRawMessage` with `contextInfo`:

```typescript
// Assume we received a message and have its info
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  await client.sendRawMessage(info.chat, {
    extendedTextMessage: {
      text: `You said: "${text}"`,
      contextInfo: {
        stanzaId: info.id,
        participant: info.sender,
        quotedMessage: { conversation: text },
      },
    },
  });
});
```

## @Mention Users

Include JIDs in `mentionedJid` and use `@<number>` in the text:

```typescript
await client.sendRawMessage(groupJid, {
  extendedTextMessage: {
    text: `Hey @${memberJid.split("@")[0]}, check this out!`,
    contextInfo: {
      mentionedJid: [memberJid],
    },
  },
});
```

To mention everyone in a group:

```typescript
const group = await client.getGroupInfo(groupJid);
const jids = group.participants.map((p) => p.jid);
const mentions = jids.map((j) => `@${j.split("@")[0]}`).join(" ");

await client.sendRawMessage(groupJid, {
  extendedTextMessage: {
    text: `Attention: ${mentions}`,
    contextInfo: { mentionedJid: jids },
  },
});
```

## Send Media

Upload first, then send the metadata with a raw message:

```typescript
// Upload an image
const media = await client.uploadMedia("/path/to/photo.jpg", "image");

await client.sendRawMessage(recipient, {
  imageMessage: {
    URL: media.URL,
    directPath: media.directPath,
    mediaKey: media.mediaKey,
    fileEncSHA256: media.fileEncSHA256,
    fileSHA256: media.fileSHA256,
    fileLength: String(media.fileLength),
    mimetype: "image/jpeg",
    caption: "Check this out!",
  },
});
```

Other media types follow the same pattern — `videoMessage`, `audioMessage`, `documentMessage`, `stickerMessage`.

:::warning Proto field casing
Upload response fields use exact protobuf casing: `URL`, `fileSHA256`, `fileEncSHA256` — **not** `url`, `fileSha256`. Wrong casing silently fails.
:::

## Send a Poll

```typescript
const resp = await client.sendPollCreation(
  groupJid,
  "Where should we eat?",       // question
  ["Pizza", "Sushi", "Tacos"],   // options
  1,                              // max selectable
);
```

## React to a Message

```typescript
// Add a reaction
await client.sendReaction(chat, senderJid, messageId, "🔥");

// Remove a reaction (empty string)
await client.sendReaction(chat, senderJid, messageId, "");
```

## Edit a Sent Message

```typescript
const sent = await client.sendMessage(recipient, {
  conversation: "Hello!",
});

// Edit it — only works on your own messages
await client.editMessage(recipient, sent.id, {
  conversation: "Hello! (edited)",
});
```

## Delete a Message

```typescript
// Revoke for everyone — only your own messages, within the time limit
await client.revokeMessage(chat, myJid, sent.id);
```

## Mark as Read

```typescript
await client.markRead([info.id], info.chat, info.sender);
```

## Complete Example

A bot that echoes text messages back as quoted replies:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import qrcode from "qrcode-terminal";

const client = createClient({ store: "session.db" });

client.on("error", (err) => console.error("Error:", err));

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  await client.markRead([info.id], info.chat, info.sender);
  await client.sendChatPresence(info.chat, "composing");

  await client.sendRawMessage(info.chat, {
    extendedTextMessage: {
      text: `Echo: ${text}`,
      contextInfo: {
        stanzaId: info.id,
        participant: info.sender,
        quotedMessage: { conversation: text },
      },
    },
  });
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
    await client.getQRChannel();
  }
  await client.connect();
  console.log("Listening for messages...");

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

:::warning `sendMessage` vs `sendRawMessage`
`sendMessage` is for simple text. For anything structured (quotes, mentions, media), use `sendRawMessage` with the full protobuf shape.
:::

:::warning Group messages go to `info.chat`
In groups, always send to `info.chat` (the group JID), not `info.sender` (the individual). Sending to `info.sender` starts a private conversation.
:::

:::warning Rate limiting
WhatsApp rate-limits sending. Space out messages, especially in groups. See [Rate Limiting](/docs/rate-limiting) for details.
:::

<RelatedGuides slugs={["build-a-bot", "automate-group-messages", "send-stickers", "send-notifications"]} />
