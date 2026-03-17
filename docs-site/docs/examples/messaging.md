---
title: Messaging Examples
sidebar_label: Messaging
sidebar_position: 3
description: "Send WhatsApp messages, reply with quotes, @mention users, add emoji reactions, and edit or delete messages with Node.js and TypeScript."
keywords: [send whatsapp message nodejs, whatsapp reply quote nodejs, whatsapp mention api, whatsapp react edit revoke typescript]
---

# Messaging

Sending text messages, replying with quotes, @mentions, reactions, edits, and message revocation.

## Send a Text Message

The simplest example — send a message to a phone number.

```typescript
// Wait for connection before sending
await client.connect();
await connected; // Promise that resolves on "connected" event

// Send a simple text message
const resp = await client.sendMessage(jid, {
  conversation: "Hello from whatsmeow-node!",
});
console.log("Sent!", resp);
```

[Full source: `send-test.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/send-test.ts)

---

## Reply with Quote & @Mentions

Listen for incoming messages and reply with quoted messages and @mentions.

### Quoting a message

To quote a message, set `contextInfo.stanzaId` to the original message ID and `contextInfo.participant` to the sender's JID:

```typescript
await client.sendRawMessage(info.chat, {
  extendedTextMessage: {
    text: "This is a reply to your message!",
    contextInfo: {
      stanzaId: info.id,           // ID of the message we're replying to
      participant: info.sender,     // Who sent the original
      quotedMessage: {
        conversation: text,         // Original message content (shown in quote bubble)
      },
    },
  },
});
```

### @Mentioning users

Include JIDs in `mentionedJid` and use `@<number>` in the text body:

```typescript
await client.sendRawMessage(info.chat, {
  extendedTextMessage: {
    text: `Hey @${info.sender.split("@")[0]}, you were mentioned!`,
    contextInfo: {
      mentionedJid: [info.sender],
    },
  },
});
```

### Mention all group members

```typescript
const group = await client.getGroupInfo(info.chat);
const participantJids = group.participants.map((p) => p.jid);
const mentions = participantJids.map((jid) => `@${jid.split("@")[0]}`).join(" ");

await client.sendRawMessage(info.chat, {
  extendedTextMessage: {
    text: `Mentioning everyone: ${mentions}`,
    contextInfo: {
      mentionedJid: participantJids,
    },
  },
});
```

:::info
Quoting and mentioning can be combined in a single message by including both `stanzaId`/`participant`/`quotedMessage` and `mentionedJid` in `contextInfo`.
:::

[Full source: `reply-and-mentions.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/reply-and-mentions.ts)

---

## Reactions, Edits & Revokes

Send reactions, edit messages, and delete messages for everyone.

### Reactions

```typescript
// Add a reaction
await client.sendReaction(jid, myJid, sent.id, "👍");

// Change a reaction (replaces previous)
await client.sendReaction(jid, myJid, sent.id, "🚀");

// Remove a reaction (empty string)
await client.sendReaction(jid, myJid, sent.id, "");
```

### Editing a message

```typescript
// Only works on messages you sent
await client.editMessage(jid, sent.id, {
  conversation: "This message was edited!",
});
```

### Revoking (deleting) a message

```typescript
// Deletes for everyone in the chat
// Only works on your own messages within the time limit
await client.revokeMessage(jid, myJid, sent.id);
```

:::warning
`sendReaction()` takes four arguments: the chat JID, the **sender** of the message being reacted to (your own JID if reacting to your own message), the message ID, and the emoji.
:::

[Full source: `reactions-and-edits.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/reactions-and-edits.ts)
