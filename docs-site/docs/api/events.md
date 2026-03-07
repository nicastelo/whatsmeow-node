---
title: Events
sidebar_position: 2
---

# Events

`WhatsmeowClient` extends `EventEmitter` and emits typed events. All [whatsmeow events](https://pkg.go.dev/go.mau.fi/whatsmeow#section-readme) are forwarded as typed events.

## Usage

```typescript
client.on("message", ({ info, message }) => { /* ... */ });
client.on("connected", ({ jid }) => { /* ... */ });
```

## Connection Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ jid: string }` | WhatsApp connection established |
| `disconnected` | `{}` | Connection lost (auto-reconnect is automatic) |
| `logged_out` | `{ reason: string }` | Session revoked, must re-pair |
| `stream_error` | `{ code: string }` | Protocol error |
| `temporary_ban` | `{ code: string, expire: string }` | Temporary ban from WhatsApp |
| `keep_alive_timeout` | `{ errorCount: number }` | Keep-alive pings failing |
| `keep_alive_restored` | `{}` | Keep-alive recovered |

## Message Events

| Event | Payload | Description |
|-------|---------|-------------|
| `message` | `{ info: MessageInfo, message: Record<string, unknown> }` | New message received |
| `message:receipt` | `{ type, chat, sender, isGroup, ids, timestamp }` | Read/delivery receipt |

### MessageInfo

```typescript
interface MessageInfo {
  id: string;
  chat: string;      // JID
  sender: string;    // JID
  isFromMe: boolean;
  isGroup: boolean;
  timestamp: number;
  pushName: string;
}
```

## Presence Events

| Event | Payload | Description |
|-------|---------|-------------|
| `presence` | `{ jid, presence, lastSeen? }` | Contact online/offline status |
| `chat_presence` | `{ chat, sender, state, media }` | Typing/recording indicator |

## Group Events

| Event | Payload | Description |
|-------|---------|-------------|
| `group:info` | `GroupInfoEvent` | Group metadata changed (name, description, participants, settings) |
| `group:joined` | `{ jid, name }` | You joined a group |

## Media Events

| Event | Payload | Description |
|-------|---------|-------------|
| `picture` | `{ jid, remove, pictureId? }` | Profile/group picture changed |

## Call Events

| Event | Payload | Description |
|-------|---------|-------------|
| `call:offer` | `{ from, callId }` | Incoming call |
| `call:accept` | `{ from, callId }` | Call accepted |
| `call:terminate` | `{ from, callId, reason }` | Call ended |

## Other Events

| Event | Payload | Description |
|-------|---------|-------------|
| `identity_change` | `{ jid, timestamp }` | Contact's identity key changed |
| `history_sync` | `{ type }` | History sync progress |
| `qr` | `{ code }` | QR code for pairing |
| `qr:timeout` | `null` | QR pairing timed out |
| `qr:error` | `{ event }` | QR channel error |
| `log` | `{ level, msg, ...extra }` | Go binary log output |
| `error` | `Error` | Internal error |
| `exit` | `{ code: number \| null }` | Go binary exited |
