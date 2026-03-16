---
title: "How to Show Typing Indicators on WhatsApp"
sidebar_label: Typing Indicators
sidebar_position: 5
description: "Show typing and recording indicators on WhatsApp with Node.js — control composing state, online presence, and subscribe to others' typing."
keywords: [whatsapp typing indicator bot, show typing whatsapp api, whatsapp composing status nodejs, whatsapp presence api typescript]
---

# How to Show Typing Indicators on WhatsApp

WhatsApp's typing indicators ("typing..." and "recording audio...") make bots feel more natural. whatsmeow-node gives you full control over these indicators with `sendChatPresence()`.

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))

## Step 1: Show "typing..."

```typescript
await client.sendChatPresence(chatJid, "composing");
```

This shows the "typing..." indicator in the specified chat. The indicator clears automatically when you send a message.

## Step 2: Show "recording audio..."

```typescript
await client.sendChatPresence(chatJid, "composing", "audio");
```

The third parameter `"audio"` changes the indicator from "typing..." to "recording audio...".

## Step 3: Clear the Indicator

```typescript
await client.sendChatPresence(chatJid, "paused");
```

Use `"paused"` to explicitly clear the indicator without sending a message. This is useful when the bot decides not to reply after all.

:::info
The indicator clears automatically when you send a message. You only need `"paused"` to stop the indicator without sending anything.
:::

## Step 4: Simulate Realistic Typing

Instant indicators look robotic. Add a delay proportional to the message length:

```typescript
async function typeAndSend(
  chatJid: string,
  text: string,
): Promise<void> {
  await client.sendChatPresence(chatJid, "composing");

  // ~50ms per character, clamped between 500ms and 3s
  const delay = Math.min(3000, Math.max(500, text.length * 50));
  await new Promise((resolve) => setTimeout(resolve, delay));

  await client.sendMessage(chatJid, { conversation: text });
}
```

## Step 5: Set Online/Offline Status

Before typing indicators work, your bot should be online:

```typescript
// Set online — required for typing indicators to show
await client.sendPresence("available");

// Set offline when shutting down
await client.sendPresence("unavailable");
```

## Step 6: Subscribe to Others' Typing

You can also watch when other users are typing:

```typescript
// Subscribe to a user's online/offline presence
await client.subscribePresence(userJid);

// Online/offline changes
client.on("presence", ({ jid, presence, lastSeen }) => {
  console.log(`${jid}: ${presence}`);
});

// Typing/recording changes
client.on("chat_presence", ({ chat, sender, state, media }) => {
  const action =
    state === "composing"
      ? media === "audio" ? "recording audio" : "typing"
      : "stopped typing";
  console.log(`${sender} is ${action} in ${chat}`);
});
```

## Complete Example

A bot that shows typing before every reply:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  // Mark as read
  await client.markRead([info.id], info.chat, info.sender);

  // Show typing
  await client.sendChatPresence(info.chat, "composing");

  // Simulate typing delay based on reply length
  const reply = `You said: ${text}`;
  const delay = Math.min(3000, Math.max(500, reply.length * 50));
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Send — indicator clears automatically
  await client.sendMessage(info.chat, { conversation: reply });
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! See: How to Pair WhatsApp");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  console.log("Bot is online with typing indicators!");

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

:::warning Set online presence first
Typing indicators may not appear if you haven't called `sendPresence("available")` first. Always set your online status after connecting.
:::

:::warning Instant indicators look robotic
Showing "typing..." and then replying instantly (in under 100ms) looks unnatural. Add a short delay proportional to the response length to simulate real typing.
:::

## Next Steps

- [How to Build a Bot](build-a-bot) — add typing to a full bot
- [How to Connect to Claude AI](connect-to-ai) — typing indicators while waiting for AI responses
- [Presence & Status Examples](/docs/examples/presence-and-status) — privacy settings, disappearing messages, and more
