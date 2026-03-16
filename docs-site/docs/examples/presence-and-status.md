---
title: Presence & Status
sidebar_position: 6
description: "Control WhatsApp online status, typing indicators, privacy settings, and disappearing messages with Node.js and whatsmeow-node."
keywords: [whatsapp typing indicator api, whatsapp online status nodejs, whatsapp privacy settings api, whatsapp disappearing messages nodejs]
---

# Presence & Status

Online/offline status, typing indicators, privacy settings, and disappearing messages.

## Presence & Typing Indicators

### Set your online status

```typescript
// Appear online
await client.sendPresence("available");

// Appear offline
await client.sendPresence("unavailable");
```

### Show typing indicators

```typescript
// Show "typing..." in a chat
await client.sendChatPresence(chatJid, "composing");

// Show "recording audio..." in a chat
await client.sendChatPresence(chatJid, "composing", "audio");

// Clear the indicator
await client.sendChatPresence(chatJid, "paused");
```

:::info
The typing indicator clears automatically when you send a message. You only need to manually send `"paused"` if you want to stop the indicator without sending a message.
:::

### Subscribe to another user's presence

```typescript
// Subscribe to online/offline updates
await client.subscribePresence(watchJid);

// Listen for presence changes
client.on("presence", ({ jid, presence, lastSeen }) => {
  console.log(`${jid}: ${presence} (last seen: ${lastSeen})`);
});

// Listen for typing indicators
client.on("chat_presence", ({ chat, sender, state, media }) => {
  const action = state === "composing"
    ? (media === "audio" ? "recording audio" : "typing")
    : "stopped typing";
  console.log(`${sender} is ${action} in ${chat}`);
});
```

[Full source: `presence-typing.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/presence-typing.ts)

---

## Privacy Settings

View and modify privacy settings, status visibility, and blocklist.

### View current settings

```typescript
const privacy = await client.getPrivacySettings();
console.log(`Last seen: ${privacy.lastSeen}`);
console.log(`Profile photo: ${privacy.profile}`);
console.log(`Read receipts: ${privacy.readReceipts}`);
// Also: groupAdd, status, callAdd, online, messages, defense, stickers
```

### Modify a setting

```typescript
// Hide last seen from everyone
await client.setPrivacySetting("last", "none");

// Only contacts can see your profile photo
await client.setPrivacySetting("profile", "contacts");

// Disable read receipts (no blue ticks)
await client.setPrivacySetting("readreceipts", "none");
```

:::warning
Privacy setting names use **wire values**, not camelCase: `"groupadd"`, `"last"`, `"readreceipts"`, `"calladd"`. See the full list in the source file.
:::

### Status privacy & blocklist

```typescript
// Who can see your status updates
const statusPrivacy = await client.getStatusPrivacy();

// View blocked contacts
const blocklist = await client.getBlocklist();

// Block / unblock
await client.updateBlocklist("5989XXXXXXXX@s.whatsapp.net", "block");
await client.updateBlocklist("5989XXXXXXXX@s.whatsapp.net", "unblock");
```

[Full source: `privacy-settings.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/privacy-settings.ts)

---

## Disappearing Messages

Set auto-delete timers for chats.

```typescript
const TIMER = {
  OFF: 0,
  DAY: 86400,     // 24 hours
  WEEK: 604800,   // 7 days
  QUARTER: 7776000, // 90 days
};

// Set default timer for all new chats
await client.setDefaultDisappearingTimer(TIMER.DAY);

// Set timer for a specific chat (overrides default)
await client.setDisappearingTimer(jid, TIMER.WEEK);

// Disable for a specific chat
await client.setDisappearingTimer(jid, TIMER.OFF);
```

:::warning
WhatsApp only supports specific timer values: 0 (off), 86400 (24h), 604800 (7d), 7776000 (90d). Other values may be silently rounded or rejected.
:::

:::info
Since whatsmeow connects as a linked device (not the primary phone), some recipients may see "This message will not disappear" warnings for the first message after a timer change. This is a WhatsApp protocol behavior, not a library bug.
:::

[Full source: `disappearing-messages.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/disappearing-messages.ts)
