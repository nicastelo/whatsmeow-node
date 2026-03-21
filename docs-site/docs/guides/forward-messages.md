---
title: "How to Forward WhatsApp Messages Programmatically"
sidebar_label: Forward Messages
sidebar_position: 20
description: "Forward WhatsApp messages between chats programmatically with Node.js — text, media, and group messages using whatsmeow-node."
keywords: [forward whatsapp messages api, whatsapp forward message nodejs, whatsapp message forwarding bot, forward whatsapp messages programmatically, whatsapp relay bot]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/forward-messages.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/forward-messages.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Forward WhatsApp Messages Programmatically",
      "description": "Forward WhatsApp messages between chats programmatically with Node.js — text, media, and group messages using whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/forward-messages.png",
      "step": [
        {"@type": "HowToStep", "name": "Listen for Messages", "text": "Subscribe to the message event and filter for messages you want to forward."},
        {"@type": "HowToStep", "name": "Forward Text Messages", "text": "Use sendRawMessage with the original message content and isForwarded flag in contextInfo."},
        {"@type": "HowToStep", "name": "Forward Media Messages", "text": "Pass the original media message directly — no need to re-upload."},
        {"@type": "HowToStep", "name": "Build a Relay Bot", "text": "Forward messages between a group and a private chat, or between multiple groups."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Forward WhatsApp Messages Programmatically",
      "description": "Forward WhatsApp messages between chats programmatically with Node.js — text, media, and group messages using whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/forward-messages.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Forward WhatsApp Messages Programmatically](/img/guides/forward-messages.png)
![How to Forward WhatsApp Messages Programmatically](/img/guides/forward-messages-light.png)

# How to Forward WhatsApp Messages Programmatically

Forward messages between WhatsApp chats using `sendRawMessage()`. You can forward text, media, polls, and any other message type — with or without the "Forwarded" label.

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))

## Forward a Text Message

To forward a received message to another chat, pass it via `sendRawMessage` with the `isForwarded` flag:

```typescript
const targetJid = "5598765432@s.whatsapp.net";

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  // Forward as a new message with the "Forwarded" label
  await client.sendRawMessage(targetJid, {
    extendedTextMessage: {
      text,
      contextInfo: {
        isForwarded: true,
        forwardingScore: 1,
      },
    },
  });
});
```

The `isForwarded: true` flag shows the "Forwarded" label on the message. `forwardingScore` tracks how many times the message has been forwarded — WhatsApp shows "Forwarded many times" when this reaches 4+.

## Forward Without the "Forwarded" Label

To relay a message without the forwarding label, simply send it as a new message:

```typescript
// Send as if it's a new message — no forwarding label
await client.sendMessage(targetJid, { conversation: text });
```

## Forward Media Messages

Media messages (images, videos, documents) can be forwarded by passing the original message content. The media is already uploaded to WhatsApp's servers, so no re-upload is needed:

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  // Forward images
  if (message.imageMessage) {
    await client.sendRawMessage(targetJid, {
      imageMessage: {
        ...message.imageMessage,
        contextInfo: {
          isForwarded: true,
          forwardingScore: 1,
        },
      },
    });
    return;
  }

  // Forward videos
  if (message.videoMessage) {
    await client.sendRawMessage(targetJid, {
      videoMessage: {
        ...message.videoMessage,
        contextInfo: {
          isForwarded: true,
          forwardingScore: 1,
        },
      },
    });
    return;
  }

  // Forward documents
  if (message.documentMessage) {
    await client.sendRawMessage(targetJid, {
      documentMessage: {
        ...message.documentMessage,
        contextInfo: {
          isForwarded: true,
          forwardingScore: 1,
        },
      },
    });
    return;
  }
});
```

## Forward Any Message Type

A generic function that forwards any message by detecting its type:

```typescript
const MESSAGE_TYPES = [
  "conversation",
  "extendedTextMessage",
  "imageMessage",
  "videoMessage",
  "audioMessage",
  "documentMessage",
  "stickerMessage",
  "contactMessage",
  "locationMessage",
  "pollCreationMessage",
] as const;

async function forwardMessage(
  targetJid: string,
  message: Record<string, unknown>,
  showForwarded = true,
) {
  for (const type of MESSAGE_TYPES) {
    if (!(type in message)) continue;

    if (type === "conversation") {
      // Simple text — wrap in extendedTextMessage for contextInfo support
      await client.sendRawMessage(targetJid, {
        extendedTextMessage: {
          text: message.conversation as string,
          ...(showForwarded && {
            contextInfo: { isForwarded: true, forwardingScore: 1 },
          }),
        },
      });
    } else {
      // Structured message — spread and add contextInfo
      const content = message[type] as Record<string, unknown>;
      await client.sendRawMessage(targetJid, {
        [type]: {
          ...content,
          ...(showForwarded && {
            contextInfo: {
              ...(content.contextInfo as Record<string, unknown> ?? {}),
              isForwarded: true,
              forwardingScore: 1,
            },
          }),
        },
      });
    }
    return;
  }
}
```

## Build a Relay Bot

Forward all messages from one group to another:

```typescript
const SOURCE_GROUP = "120363XXXXX@g.us";
const TARGET_GROUP = "120363YYYYY@g.us";

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;
  if (info.chat !== SOURCE_GROUP) return;

  // Add sender attribution
  const attribution = `[${info.pushName}]:\n`;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  if (text) {
    await client.sendMessage(TARGET_GROUP, {
      conversation: `${attribution}${text}`,
    });
    return;
  }

  // Forward media with caption attribution
  await forwardMessage(TARGET_GROUP, message);
});
```

## Complete Example

A relay bot that forwards messages between a private chat and a group:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

// Forward messages FROM this chat TO the group
const PRIVATE_CHAT = "5512345678@s.whatsapp.net";
const GROUP_CHAT = "120363XXXXX@g.us";

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  // Private → Group
  if (info.chat === PRIVATE_CHAT && text) {
    await client.sendMessage(GROUP_CHAT, {
      conversation: `[${info.pushName}]: ${text}`,
    });
    return;
  }

  // Group → Private
  if (info.chat === GROUP_CHAT && text) {
    await client.sendMessage(PRIVATE_CHAT, {
      conversation: `[${info.pushName} in group]: ${text}`,
    });
    return;
  }
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired!");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  console.log("Relay bot is online!");

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
If you forward messages from a chat and also listen to the target chat, you can create an infinite loop. Always check the source chat and skip your own messages.
:::

:::warning Media expiration
WhatsApp media URLs expire after some time. If you save a message and try to forward it much later, the media may no longer be available. Forward media promptly or download it first with `downloadAny()`.
:::

:::warning Rate limiting
Forwarding many messages quickly will hit WhatsApp's rate limits. Space out sends, especially for bulk relay operations. See [Rate Limiting](/docs/rate-limiting).
:::

<RelatedGuides slugs={["build-a-bot", "download-media", "automate-group-messages"]} />
