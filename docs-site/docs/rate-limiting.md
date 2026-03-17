---
title: Rate Limiting
sidebar_position: 5
description: "WhatsApp rate limit guidance for whatsmeow-node — approximate thresholds, safe sending patterns, and handling temporary bans."
keywords: [whatsapp rate limit, whatsapp message limit, whatsapp ban prevention, whatsapp sending limits]
---

# Rate Limiting

WhatsApp enforces rate limits that can result in temporary bans if exceeded. There are no officially published limits, but the community has observed these approximate thresholds:

- **Messages**: ~50-80 messages per minute for individual chats, lower for new/unverified numbers
- **Group operations**: Creating groups, adding participants, and modifying settings are more tightly limited
- **Media uploads**: Slower rate limit than text messages; large files count more heavily
- **Contact checks** (`isOnWhatsApp`): ~50 numbers per request, batched automatically by whatsmeow
- **Newsletter operations**: Lower limits than regular messaging

## Safe Sending Pattern

```typescript
async function sendWithBackoff(
  client: WhatsmeowClient,
  messages: Array<{ jid: string; text: string }>
) {
  for (const { jid, text } of messages) {
    try {
      await client.sendMessage(jid, { conversation: text });
    } catch (err) {
      if (err instanceof WhatsmeowError && err.code === "ERR_SEND") {
        await new Promise((r) => setTimeout(r, 5000));
        await client.sendMessage(jid, { conversation: text });
      } else {
        throw err;
      }
    }
    // Space out messages: 1-3 seconds between sends
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000));
  }
}
```

## General Guidance

- Space out messages (1-3 seconds between sends)
- Avoid bulk operations on new/freshly paired numbers
- Handle `temporary_ban` events — they include an expiry time
- Monitor `stream_error` and `keep_alive_timeout` events as early warning signs
- Use `sendPresence("available")` before sending to simulate normal client behavior
