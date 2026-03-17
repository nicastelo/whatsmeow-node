---
title: Error Handling
sidebar_label: Errors
sidebar_position: 3
description: "Error handling in whatsmeow-node — typed error classes, error codes for every method category, and recommended catch patterns."
keywords: [whatsmeow error handling, whatsapp api errors, whatsapp error codes, whatsmeow-node error types]
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

## Common Error Codes

| Code | Source | Meaning |
|------|--------|---------|
| `ERR_TIMEOUT` | TS | IPC command timed out (default: 30s) |
| `ERR_PROCESS_EXITED` | TS | Go binary crashed or exited |
| `ERR_NOT_INIT` | Go | `init()` not called yet |
| `ERR_INVALID_ARGS` | Go | Missing or invalid arguments |
| `ERR_INVALID_JID` | Go | Malformed JID string |
| `ERR_UNKNOWN_CMD` | Go | Unrecognized IPC command |
| `ERR_ALREADY_INIT` | Go | `init()` called more than once |
| `ERR_STORE` | Go | Failed to open session database |

## Method-Specific Error Codes

Each method has its own error code so you can identify exactly what failed:

| Area | Error Codes |
|------|-------------|
| Connection | `ERR_CONNECT`, `ERR_PAIR`, `ERR_QR`, `ERR_LOGOUT` |
| Messaging | `ERR_SEND`, `ERR_REVOKE`, `ERR_MARK_READ`, `ERR_PARSE` |
| Media | `ERR_UPLOAD`, `ERR_DOWNLOAD`, `ERR_READ_FILE`, `ERR_TEMPFILE`, `ERR_WRITE` |
| Groups | `ERR_CREATE_GROUP`, `ERR_GROUP_INFO`, `ERR_GROUPS`, `ERR_GROUP_TOPIC`, `ERR_SET_GROUP_NAME`, `ERR_SET_GROUP_DESC`, `ERR_SET_GROUP_PHOTO`, `ERR_SET_GROUP_ANNOUNCE`, `ERR_SET_GROUP_LOCKED`, `ERR_SET_MEMBER_ADD_MODE`, `ERR_SET_JOIN_APPROVAL`, `ERR_INVITE_LINK`, `ERR_JOIN_GROUP`, `ERR_LEAVE_GROUP`, `ERR_UPDATE_PARTICIPANTS`, `ERR_GROUP_REQUESTS`, `ERR_UPDATE_REQUESTS` |
| Communities | `ERR_LINK_GROUP`, `ERR_UNLINK_GROUP`, `ERR_SUB_GROUPS`, `ERR_LINKED_PARTICIPANTS` |
| Newsletters | `ERR_CREATE_NEWSLETTER`, `ERR_NEWSLETTERS`, `ERR_NEWSLETTER_INFO`, `ERR_NEWSLETTER_MESSAGES`, `ERR_NEWSLETTER_UPDATES`, `ERR_NEWSLETTER_SUBSCRIBE`, `ERR_NEWSLETTER_REACTION`, `ERR_NEWSLETTER_MARK_VIEWED`, `ERR_NEWSLETTER_MUTE`, `ERR_FOLLOW_NEWSLETTER`, `ERR_UNFOLLOW_NEWSLETTER` |
| Contacts | `ERR_CHECK`, `ERR_USER_INFO`, `ERR_USER_DEVICES`, `ERR_PROFILE_PIC`, `ERR_BUSINESS_PROFILE`, `ERR_SET_STATUS` |
| Privacy | `ERR_GET_PRIVACY`, `ERR_SET_PRIVACY`, `ERR_GET_STATUS_PRIVACY`, `ERR_SET_DISAPPEARING`, `ERR_BLOCKLIST`, `ERR_UPDATE_BLOCKLIST` |
| Presence | `ERR_PRESENCE`, `ERR_CHAT_PRESENCE`, `ERR_SUBSCRIBE_PRESENCE` |
| QR & Links | `ERR_QR_LINK`, `ERR_RESOLVE_QR`, `ERR_RESOLVE_BIZ_LINK` |
| Polls | `ERR_POLL_VOTE` |
| Bots | `ERR_BOT_LIST`, `ERR_BOT_PROFILES` |
| App State | `ERR_FETCH_APP_STATE`, `ERR_MARK_NOT_DIRTY` |
| Crypto | `ERR_DECRYPT`, `ERR_ENCRYPT` |
| Calls | `ERR_REJECT_CALL` |
| Other | `ERR_SET_PASSIVE`, `ERR_ACCEPT_TOS` |

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
  const profile = await client.getBusinessProfile(jid);
} catch (err) {
  if (err instanceof WhatsmeowError) {
    switch (err.code) {
      case "ERR_BUSINESS_PROFILE":
        console.log("Not a business account");
        break;
      case "ERR_INVALID_JID":
        console.error("Bad JID format");
        break;
      default:
        throw err;
    }
  }
}
```
