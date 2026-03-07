---
title: Connection Lifecycle
sidebar_position: 4
---

# Connection Lifecycle

## Flow

```
init() → connect() → "connected" event → operational → "disconnected" → auto-reconnect → "connected"
```

**Normal startup:**

```typescript
const { jid } = await client.init();  // Opens store, returns JID if already paired
if (!jid) {
  await client.getQRChannel();        // Set up QR pairing (first time only)
}
await client.connect();               // Starts connection (returns immediately)
// Wait for "connected" event before sending messages
```

## Key Events

| Event | Meaning | Action |
|-------|---------|--------|
| `connected` | WhatsApp connection established | Safe to send messages |
| `disconnected` | Connection lost | Auto-reconnect is built-in, no action needed |
| `logged_out` | Session revoked (user unlinked device) | Must re-pair — delete store and start over |
| `stream_error` | Protocol error from WhatsApp | Usually followed by auto-reconnect |
| `keep_alive_timeout` | Keep-alive pings failing | Connection may be degraded |
| `keep_alive_restored` | Keep-alive recovered | Connection is healthy again |

## Resilient Connection Pattern

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("connected", ({ jid }) => {
  console.log(`Connected as ${jid}`);
});

client.on("disconnected", () => {
  console.log("Disconnected — waiting for auto-reconnect...");
});

client.on("logged_out", ({ reason }) => {
  console.error(`Logged out: ${reason}. Must re-pair.`);
  process.exit(1);
});

const { jid } = await client.init();
if (!jid) {
  await client.getQRChannel();
  client.on("qr", ({ code }) => {
    // Render QR code for pairing
  });
}
await client.connect();
```

Auto-reconnect is always enabled — whatsmeow handles reconnection internally. You only need to handle `logged_out` (session revoked, must re-pair).
