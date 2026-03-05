# Internals

Deep dive into the IPC protocol, Go binary structure, and design decisions. For user-facing docs see [README.md](./README.md). For development setup see [CONTRIBUTING.md](./CONTRIBUTING.md).

## IPC Protocol

The Go binary communicates with Node.js via stdin/stdout JSON lines. stderr carries structured logs.

```
Node.js (TypeScript)                    Go binary (whatsmeow)
--------------------                    ---------------------

  client.sendMessage(jid, msg)
        |
        v
  JSON line -> stdin  ----------------> read command
                                         call whatsmeow
                                         write result
  parse result  <--------------------   JSON line -> stdout
        |
        v
  Promise resolves

                                        WhatsApp WebSocket events
                                         |
  EventEmitter <---------------------   JSON line -> stdout
  client.on('message', ...)

                                        whatsmeow internal logs
                                         |
  client.on('log', ...)  <-----------   JSON line -> stderr
```

### Stream Roles

- **stdin** -- commands from Node -> Go (one JSON line per command)
- **stdout** -- responses + events from Go -> Node (one JSON line per message)
- **stderr** -- structured log output from Go (whatsmeow logs, debug info)

### Command (Node -> Go via stdin)

```json
{"id":"uuid","cmd":"sendMessage","args":{"jid":"5989...@s.whatsapp.net","message":{"conversation":"hello"}}}
```

- `id` -- unique request ID, used to match responses
- `cmd` -- method name
- `args` -- command-specific payload

### Response (Go -> Node via stdout)

```json
{"id":"uuid","ok":true,"data":{"timestamp":"2026-03-05T..."}}
```

```json
{"id":"uuid","ok":false,"error":"not connected","code":"ERR_NOT_CONNECTED"}
```

### Event (Go -> Node via stdout, no `id`)

```json
{"event":"message","data":{"info":{...},"message":{"conversation":"hello"}}}
```

Node distinguishes responses from events by the presence of `id`.

### Log (Go -> Node via stderr)

```json
{"level":"info","msg":"connected to WhatsApp","time":"..."}
```

### Concurrency

Multiple commands can be in-flight simultaneously. Each has a unique `id`, and responses are matched by `id`, not by order. The Go side reads commands sequentially from stdin but whatsmeow calls may run concurrently.

### Timeouts

Every command has a configurable timeout (default 30s). If Go doesn't respond within the timeout, the pending Promise rejects with `TimeoutError`.

## Go Binary Commands

### Connection & Auth

| Command | Args | Response | Description |
|---|---|---|---|
| `connect` | `{ store }` | `{ jid? }` | Open store + connect. Returns JID if already paired |
| `disconnect` | `{}` | `{}` | Disconnect without clearing session |
| `logout` | `{}` | `{}` | Logout + clear session data |
| `status` | `{}` | `{ connected, loggedIn, jid? }` | Connection state |
| `pair:qr` | `{}` | `{}` | Start QR pairing (emits `qr` events) |
| `pair:code` | `{ phone }` | `{ code }` | Request pairing code |

### Messaging

| Command | Args | Response | Description |
|---|---|---|---|
| `sendMessage` | `{ jid, message, extra? }` | `{ id, timestamp }` | Send a message |
| `revokeMessage` | `{ chat, sender, id }` | `{}` | Delete message for everyone |
| `editMessage` | `{ chat, id, newContent }` | `{ id, timestamp }` | Edit a sent message |
| `reactMessage` | `{ chat, sender, id, reaction }` | `{ id, timestamp }` | React to a message |
| `markRead` | `{ ids, chat, sender? }` | `{}` | Mark messages as read |

### Media

| Command | Args | Response | Description |
|---|---|---|---|
| `downloadMedia` | `{ message }` | `{ path }` | Download to temp file, return path |
| `uploadMedia` | `{ path, appInfo }` | `{ url, directPath, ... }` | Upload from file path |

Media uses temp file paths instead of base64-over-JSON. A 10MB video as base64 would be ~13MB of JSON.

### Contacts & Users

| Command | Args | Response | Description |
|---|---|---|---|
| `isOnWhatsApp` | `{ phones }` | `[{ jid, isIn }]` | Check phone numbers |
| `getUserInfo` | `{ jids }` | `{ ... }` | Get user info |
| `getProfilePicture` | `{ jid }` | `{ url }` | Get profile picture URL |
| `getBusinessProfile` | `{ jid }` | `{ ... }` | Get business profile |
| `getBlocklist` | `{}` | `[jid, ...]` | Get blocked contacts |
| `updateBlocklist` | `{ jid, action }` | `{}` | Block/unblock |

### Groups

| Command | Args | Response | Description |
|---|---|---|---|
| `createGroup` | `{ name, participants }` | `{ jid }` | Create a group |
| `getGroupInfo` | `{ jid }` | `{ ... }` | Get group metadata |
| `getJoinedGroups` | `{}` | `[{ jid, name, ... }]` | List all groups |
| `getGroupInviteLink` | `{ jid, reset? }` | `{ link }` | Get/reset invite link |
| `joinGroupWithLink` | `{ code }` | `{ jid }` | Join via invite link |
| `leaveGroup` | `{ jid }` | `{}` | Leave a group |
| `setGroupName` | `{ jid, name }` | `{}` | Update group name |
| `setGroupDescription` | `{ jid, description }` | `{}` | Update group description |
| `setGroupPhoto` | `{ jid, path }` | `{}` | Update group photo |
| `setGroupAnnounce` | `{ jid, announce }` | `{}` | Admin-only messages |
| `setGroupLocked` | `{ jid, locked }` | `{}` | Lock group settings |
| `updateGroupParticipants` | `{ jid, participants, action }` | `{}` | Add/remove/promote/demote |

### Newsletters

| Command | Args | Response | Description |
|---|---|---|---|
| `createNewsletter` | `{ name, description? }` | `{ jid }` | Create a channel |
| `getNewsletterInfo` | `{ jid }` | `{ ... }` | Get channel info |
| `getSubscribedNewsletters` | `{}` | `[...]` | List subscribed channels |
| `followNewsletter` | `{ jid }` | `{}` | Follow/subscribe |
| `unfollowNewsletter` | `{ jid }` | `{}` | Unfollow |

### Presence

| Command | Args | Response | Description |
|---|---|---|---|
| `sendPresence` | `{ presence }` | `{}` | Set available/unavailable |
| `sendChatPresence` | `{ jid, presence, media? }` | `{}` | Typing/recording indicator |
| `subscribePresence` | `{ jid }` | `{}` | Watch contact presence |

### Privacy

| Command | Args | Response | Description |
|---|---|---|---|
| `getPrivacySettings` | `{}` | `{ ... }` | Get all privacy settings |
| `setPrivacySetting` | `{ name, value }` | `{}` | Update a privacy setting |
| `setDisappearingTimer` | `{ chat, timer }` | `{}` | Set disappearing messages |

### Polls

| Command | Args | Response | Description |
|---|---|---|---|
| `createPoll` | `{ name, options, selectable }` | `{ id, timestamp }` | Create a poll |

### Calls

| Command | Args | Response | Description |
|---|---|---|---|
| `rejectCall` | `{ from, callId }` | `{}` | Reject incoming call |

### Generic Fallback

| Command | Args | Response | Description |
|---|---|---|---|
| `call` | `{ method, args }` | `{ ... }` | Call any whatsmeow Client method by name (reflection) |

The `call` command uses Go reflection to call the named method. This means the binding never blocks users from accessing new whatsmeow features, even before typed wrappers are added.

## Go Binary Events

### Connection

| Event | Data | Description |
|---|---|---|
| `qr` | `{ code }` | QR code string for pairing |
| `pair:code` | `{ code }` | 8-digit pairing code response |
| `connected` | `{ jid }` | Successfully connected |
| `disconnected` | `{ reason }` | Connection lost |
| `logged_out` | `{ reason }` | Logged out (session cleared) |
| `stream_error` | `{ code, raw? }` | WebSocket stream error |
| `temporary_ban` | `{ code, expire }` | Temporarily banned |
| `keep_alive_timeout` | `{}` | Server keep-alive timeout |

### Messages

| Event | Data | Description |
|---|---|---|
| `message` | `{ info, message }` | Incoming message |
| `message:receipt` | `{ info, type }` | Delivery/read receipts |
| `message:reaction` | `{ info, reaction }` | Message reaction |
| `message:revoke` | `{ info }` | Message deleted |
| `message:edit` | `{ info, message }` | Message edited |
| `message:poll_vote` | `{ info, vote }` | Poll vote received |
| `history_sync` | `{ data }` | Initial history sync |

### Presence

| Event | Data | Description |
|---|---|---|
| `presence` | `{ jid, presence, lastSeen? }` | Contact presence change |
| `chat_presence` | `{ jid, presence, media? }` | Typing/recording state |

### Groups

| Event | Data | Description |
|---|---|---|
| `group:participants` | `{ jid, participants, action }` | Members added/removed/promoted |
| `group:info` | `{ jid, ... }` | Group metadata changed |
| `group:name` | `{ jid, name }` | Group renamed |
| `group:description` | `{ jid, description }` | Group description changed |
| `group:photo` | `{ jid }` | Group photo changed |
| `group:locked` | `{ jid, locked }` | Group lock state changed |
| `group:announce` | `{ jid, announce }` | Announce mode changed |
| `group:ephemeral` | `{ jid, timer }` | Disappearing messages changed |

### Calls

| Event | Data | Description |
|---|---|---|
| `call:offer` | `{ from, callId, ... }` | Incoming call |
| `call:accept` | `{ from, callId }` | Call accepted |
| `call:terminate` | `{ from, callId, reason }` | Call ended |

### Privacy & Contacts

| Event | Data | Description |
|---|---|---|
| `blocklist` | `{ changes }` | Blocklist changed |
| `identity_change` | `{ jid }` | Contact identity key changed |
| `push_name` | `{ jid, oldName, newName }` | Contact push name changed |
| `privacy_settings` | `{ ... }` | Privacy settings changed |

### Newsletters

| Event | Data | Description |
|---|---|---|
| `newsletter:message` | `{ info, message }` | Newsletter message |
| `newsletter:update` | `{ jid, ... }` | Newsletter metadata changed |

## Session Storage

The `connect` command takes a connection string:
- `"file:session.db"` -> SQLite (local dev, single-device)
- `"postgres://user:pass@host/db"` -> Postgres (production, survives deploys)

### Database Drivers

whatsmeow calls Go's `sql.Open()` but does not import any database driver. The Go binary imports both:

- `modernc.org/sqlite` -- pure-Go SQLite driver (registers as `"sqlite"`)
- `jackc/pgx/v5` -- pure-Go Postgres driver (registers as `"pgx"`)

Both are compiled into the binary (~34MB total) even if the user only needs one. Comparable to esbuild (10MB) and turbo (60MB).

### SQLite Defaults

For SQLite, the binary automatically applies these pragmas:

- `foreign_keys(1)` -- required by whatsmeow
- `journal_mode(WAL)` -- allows concurrent reads during writes
- `busy_timeout(5000)` -- retries for 5s on lock instead of failing with `SQLITE_BUSY`

Without WAL + busy_timeout, WhatsApp's initial sync after pairing fails with `SQLITE_BUSY` errors.

## Design Decisions

1. **Subprocess over FFI** -- No CGo, true async events via stdout streaming, process isolation (Go crash doesn't kill Node), simple cross-compilation. Tradeoff: serialization overhead (negligible at WhatsApp message rates).

2. **JSON lines over stdin/stdout** -- Simple, debuggable (`echo '{"cmd":"status"}' | ./whatsmeow-node`), no port management. Throughput (~10k lines/sec) far exceeds WhatsApp rate limits.

3. **Pure Go (no CGo)** -- `modernc.org/sqlite` + `pgx`. Enables single-command cross-compilation without C toolchain.

4. **Media via temp files** -- A 10MB video as base64 JSON would be ~13MB and block the pipe. Go writes to a temp file and returns the path.

5. **Platform-specific npm packages** -- Same pattern as esbuild/swc/turbo. `npm install whatsmeow-node` resolves the correct binary via optionalDependencies.

6. **Handwritten TS types** -- No proto generation. Go handles all protobuf. TypeScript gets lightweight interfaces for the JSON shapes (~300 lines vs 14MB of generated protos).

7. **Generic `call` fallback** -- Uses Go reflection to call any whatsmeow Client method by name. Users are never blocked by our release cycle.

8. **Auto-reconnect in Go** -- whatsmeow handles reconnection internally. Node sees events but doesn't manage reconnect logic.

9. **stderr for logs** -- whatsmeow's internal logging goes to stderr as JSON lines, keeping stdout protocol clean.

10. **Orphan prevention** -- Node registers an exit handler to kill the Go child process. Go detects stdin close (parent died) and exits.

## Binary Resolution

Same distribution pattern as esbuild:

```
npm/
  @whatsmeow-node/darwin-arm64/bin/whatsmeow-node
  @whatsmeow-node/darwin-x64/bin/whatsmeow-node
  @whatsmeow-node/linux-x64/bin/whatsmeow-node
  @whatsmeow-node/linux-arm64/bin/whatsmeow-node
  @whatsmeow-node/win32-x64/bin/whatsmeow-node.exe
  ...
```

At runtime, `client.ts` checks:
1. Local binary at repo root (dev mode) -- verified as a file, not a directory
2. `require.resolve("@whatsmeow-node/{platform}-{arch}/bin/whatsmeow-node")`
3. Throws with a helpful error if neither found

## Process Management

`process.ts` handles:

- **Spawning** -- resolves platform-specific binary
- **Line parsing** -- stdout JSON lines are either responses (have `id`) or events (have `event`)
- **Request matching** -- `Map<id, { resolve, reject, timer }>`. Responses resolve the matching pending promise
- **Event routing** -- events emitted on the WhatsmeowClient EventEmitter
- **Log forwarding** -- stderr JSON lines emitted as `log` events
- **Graceful shutdown** -- send disconnect command -> wait -> SIGTERM -> SIGKILL after 5s
- **Orphan prevention** -- `process.on('exit')` handler to kill Go child. Uses `child.unref()` so the child doesn't keep Node alive unnecessarily. Handler is removed on `kill()` to prevent listener leaks.

## Differences from Using whatsmeow Directly in Go

### What You Can't Do

| Capability | In Go | In this binding | Why |
|---|---|---|---|
| Custom `store.Device` implementation | Yes -- implement the interface for any backend | No -- SQLite and Postgres only | The store lives inside the Go binary. TypeScript never touches it. |
| Direct protobuf access | Yes -- full `waE2E.Message` | No -- messages are JSON maps | Go handles all protobuf. Some proto edge cases may be lossy in JSON. |
| Custom event handler logic in Go | Yes -- full `EventHandler` | No -- events are JSON | You can only react to events in TypeScript. |
| Fine-grained `SendRequestExtra` | Yes -- custom message ID, media handles, timeouts | Partial -- basic send works | Can be extended by adding args to `sendMessage`. |
| Multiple clients in one process | Yes -- many `Client` instances | One client per Go process | Spawn multiple processes for multiple accounts. |
| Direct access to whatsmeow internals | Yes -- `client.Store`, signal keys | No | IPC boundary only exposes what we serialize. |

### What's Different

| Behavior | In Go | In this binding |
|---|---|---|
| Database drivers | You import the driver you want | Both sqlite and pgx are compiled in. User picks at runtime via connection string. |
| SQLite pragmas | You configure them yourself | WAL, busy_timeout(5s), foreign_keys set automatically. |
| QR pairing | Call `GetQRChannel()` before `Connect()` | `connect()` detects if pairing is needed automatically. QR codes arrive as events. |
| Error types | Go `error` values | JSON error responses with `code` strings. Some Go error context may be lost. |
| Reconnection | Handle `Disconnected` events yourself, or set `EnableAutoReconnect` | Auto-reconnect always enabled. TypeScript sees events. |
| Logging | Pass a `waLog.Logger` to `NewClient` | Logs go to stderr as JSON. TypeScript receives them as `log` events. |
| Network config | `SetProxy()`, `SetMediaHTTPClient()`, etc. | Not yet exposed. Go binary uses default networking. |

### Not Yet Implemented

The goal is full API parity. The following whatsmeow `Client` methods are not yet wrapped:

**Messaging:** `BuildReaction`, `BuildEdit`, `BuildPollCreation`, `BuildPollVote`, `EncryptPollVote`, `DecryptReaction`, `DecryptPollVote`, `DecryptComment`, `DecryptSecretEncryptedMessage`, `EncryptComment`, `EncryptReaction`, `GenerateMessageID`, `SetDisappearingTimer`, `RevokeMessage` (direct method), `BuildUnavailableMessageRequest`, `BuildHistorySyncRequest`, `SendPeerMessage`, `ParseWebMessage`

**Media:** `Upload`, `UploadReader`, `UploadNewsletter`, `UploadNewsletterReader`, `DownloadAny`, `DownloadThumbnail`, `DownloadToFile`, `DownloadFB`, `DownloadFBToFile`, `DownloadMediaWithPath`, `DownloadMediaWithPathToFile`

**Users/Contacts:** `GetUserDevices`, `GetBusinessProfile`, `GetBotListV2`, `GetBotProfiles`, `ResolveBusinessMessageLink`, `ResolveContactQRLink`, `GetContactQRLink`, `GetBlocklist`, `UpdateBlocklist`, `SetStatusMessage`

**Groups:** `SetGroupDescription`, `SetGroupTopic`, `SetGroupJoinApprovalMode`, `SetGroupMemberAddMode`, `GetGroupRequestParticipants`, `UpdateGroupRequestParticipants`, `GetGroupInfoFromLink`, `GetGroupInfoFromInvite`, `JoinGroupWithInvite`, `LinkGroup`, `UnlinkGroup`, `GetSubGroups`, `GetLinkedGroupsParticipants`

**Newsletters:** `CreateNewsletter`, `GetNewsletterInfo`, `GetNewsletterInfoWithInvite`, `FollowNewsletter`, `UnfollowNewsletter`, `NewsletterToggleMute`, `NewsletterSendReaction`, `GetNewsletterMessages`, `GetNewsletterMessageUpdates`, `AcceptTOSNotice`

**Privacy:** `GetPrivacySettings`, `SetPrivacySetting`, `TryFetchPrivacySettings`, `SetDefaultDisappearingTimer`

**Store queries:** `GetAllContacts`, `GetContact`, `GetChatSettings`

**App State:** `FetchAppState`, `SendAppState`, `MarkNotDirty`

**Connection/Config:** `SetPassive`, `WaitForConnection`, `SetForceActiveDeliveryReceipts`, `SendMediaRetryReceipt`, `DownloadHistorySync`, `GetStatusPrivacy`, `GetServerPushNotificationConfig`, `RegisterForPushNotifications`

**Network:** `SetProxyAddress`, `SetProxy`, `SetSOCKSProxy`, `SetMediaHTTPClient`, `SetWebsocketHTTPClient`, `SetPreLoginHTTPClient`

### What's the Same

- All WhatsApp protocol behavior (encryption, message handling, group management) -- that's all whatsmeow
- Session persistence and credential management -- whatsmeow's `sqlstore`
- WhatsApp Web version negotiation -- whatsmeow's `GetLatestVersion()`
- Rate limiting and retry logic -- whatsmeow internally

## Security

- Session credentials never cross the IPC boundary -- they live in Go's SQLite/Postgres store
- No auth tokens in process args (visible in `ps`) -- store connection string is passed via stdin after spawn
- Media temp files should be cleaned up by the consumer
