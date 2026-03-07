---
title: Errors
sidebar_position: 3
---

# Error Handling

All client methods throw on failure. Errors are typed for easy handling.

## Error Classes

```typescript
import {
  WhatsmeowError,     // Base class for all whatsmeow errors
  TimeoutError,       // IPC command timed out
  ProcessExitedError  // Go binary crashed or exited
} from "@whatsmeow-node/whatsmeow-node";
```

## Error Codes

| Code | Source | Meaning |
|------|--------|---------|
| `ERR_TIMEOUT` | TS | IPC command timed out (default: 30s) |
| `ERR_PROCESS_EXITED` | TS | Go binary crashed or exited |
| `ERR_NOT_INIT` | Go | `init()` not called yet |
| `ERR_INVALID_ARGS` | Go | Missing or invalid arguments |
| `ERR_INVALID_JID` | Go | Malformed JID string |
| `ERR_SEND` | Go | Message send failed |
| `ERR_UPLOAD` | Go | Media upload failed |
| `ERR_UNKNOWN_CMD` | Go | Unrecognized IPC command |

## Basic Handling

```typescript
try {
  await client.sendMessage(jid, { conversation: "hello" });
} catch (err) {
  if (err instanceof WhatsmeowError) {
    console.error(`WhatsApp error [${err.code}]: ${err.message}`);
  }
}
```

## Handling Specific Errors

```typescript
try {
  await client.sendMessage(jid, { conversation: "hello" });
} catch (err) {
  if (err instanceof WhatsmeowError) {
    switch (err.code) {
      case "ERR_SEND":
        console.error("Message failed:", err.message);
        break;
      case "ERR_NOT_INIT":
        console.error("Forgot to call init()");
        break;
      default:
        throw err;
    }
  }
}
```
