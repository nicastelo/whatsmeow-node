---
title: Events
sidebar_position: 2
---

# Events

`WhatsmeowClient` extends `EventEmitter` and emits typed events. All [whatsmeow events](https://pkg.go.dev/go.mau.fi/whatsmeow#section-readme) are forwarded.

## Usage

```typescript
client.on("message", ({ info, message }) => { /* ... */ });
client.on("connected", ({ jid }) => { /* ... */ });
```

## Connection Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ jid: string }` | WhatsApp connection established. Safe to send messages. |
| `disconnected` | `{}` | Connection lost. Auto-reconnect is automatic. |
| `logged_out` | `{ reason: string }` | Session revoked. Must re-pair. |
| `stream_error` | `{ code: string }` | Protocol error. Usually followed by auto-reconnect. |
| `temporary_ban` | `{ code: string, expire: string }` | Temporary ban from WhatsApp. |
| `keep_alive_timeout` | `{ errorCount: number }` | Keep-alive pings failing. Connection may be degraded. |
| `keep_alive_restored` | `{}` | Keep-alive recovered. Connection is healthy. |

## Message Events

| Event | Payload | Description |
|-------|---------|-------------|
| `message` | `{ info: MessageInfo, message: Record<string, unknown> }` | New message received. |
| `message:receipt` | `{ type: string, chat: string, sender: string, isGroup: boolean, ids: string[], timestamp: number }` | Read/delivery receipt. |

### MessageInfo

```typescript
interface MessageInfo {
  id: string;
  chat: string;      // JID of the chat
  sender: string;    // JID of the sender
  isFromMe: boolean;
  isGroup: boolean;
  timestamp: number;  // Unix timestamp
  pushName: string;   // Sender's display name
}
```

## Presence Events

| Event | Payload | Description |
|-------|---------|-------------|
| `presence` | `{ jid: string, presence: "available" \| "unavailable", lastSeen?: number }` | Contact online/offline status. |
| `chat_presence` | `{ chat: string, sender: string, state: "composing" \| "paused", media: "audio" \| "" }` | Typing/recording indicator. |

## Group Events

| Event | Payload | Description |
|-------|---------|-------------|
| `group:info` | `GroupInfoEvent` | Group metadata changed. |
| `group:joined` | `{ jid: string, name: string }` | You joined a group. |

### GroupInfoEvent

```typescript
interface GroupInfoEvent {
  jid: string;
  name?: string;         // New group name
  description?: string;  // New description
  announce?: boolean;     // Announcement mode changed
  locked?: boolean;       // Lock status changed
  ephemeral?: boolean;    // Disappearing messages changed
  join?: string[];        // JIDs that joined
  leave?: string[];       // JIDs that left
  promote?: string[];     // JIDs promoted to admin
  demote?: string[];      // JIDs demoted from admin
}
```

## Media Events

| Event | Payload | Description |
|-------|---------|-------------|
| `picture` | `{ jid: string, remove: boolean, pictureId?: string }` | Profile/group picture changed. |

## Call Events

| Event | Payload | Description |
|-------|---------|-------------|
| `call:offer` | `{ from: string, callId: string }` | Incoming call. |
| `call:accept` | `{ from: string, callId: string }` | Call accepted. |
| `call:terminate` | `{ from: string, callId: string, reason: string }` | Call ended. |

## Other Events

| Event | Payload | Description |
|-------|---------|-------------|
| `identity_change` | `{ jid: string, timestamp: number }` | Contact's identity key changed (re-registered). |
| `history_sync` | `{ type: string }` | History sync progress. |
| `qr` | `{ code: string }` | QR code for pairing. |
| `qr:timeout` | `null` | QR pairing timed out. |
| `qr:error` | `{ event: string }` | QR channel error. |
| `log` | `{ level: string, msg: string, [key: string]: unknown }` | Go binary log output. Useful for debugging. |
| `error` | `Error` | Internal error. |
| `exit` | `{ code: number \| null }` | Go binary exited. |
