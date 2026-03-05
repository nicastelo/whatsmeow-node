# whatsmeow-node

TypeScript/Node.js bindings for [whatsmeow](https://github.com/tulir/whatsmeow), the Go WhatsApp Web multidevice API library.

Communicates with a precompiled Go binary over stdin/stdout JSON-line IPC. No CGo, no native addons, no WebSocket reimplementation -- just a subprocess.

> **Alpha** -- This is an early release. The API may change, not all whatsmeow methods are wrapped yet, and it has not been extensively tested in production. Bug reports and contributions are welcome.

**Current upstream**: whatsmeow [`0.0.0-20260227`](https://pkg.go.dev/go.mau.fi/whatsmeow)

## Install

```bash
npm install whatsmeow-node
```

The correct binary for your platform is installed automatically via `optionalDependencies`.

Supported platforms:

| OS      | x64 | arm64 | musl (Alpine) |
|---------|-----|-------|---------------|
| macOS   | Yes | Yes   | -             |
| Linux   | Yes | Yes   | x64 only      |
| Windows | Yes | Yes   | -             |

## Quick Start

```typescript
import { createClient } from "whatsmeow-node";

const client = createClient({
  store: "file:session.db",
});

client.on("qr", ({ code }) => {
  console.log("Scan this QR code:", code);
});

client.on("connected", ({ jid }) => {
  console.log("Connected as", jid);
});

client.on("message", ({ info, message }) => {
  console.log(`${info.pushName}: ${message.conversation ?? JSON.stringify(message)}`);
});

await client.connect();
```

## API

### `createClient(options)`

Returns a `WhatsmeowClient` instance.

| Option           | Type     | Default   | Description                              |
|------------------|----------|-----------|------------------------------------------|
| `store`          | `string` | required  | Database DSN (`file:session.db` or `postgres://...`) |
| `binaryPath`     | `string` | auto      | Path to the Go binary (auto-resolved from platform package) |
| `commandTimeout` | `number` | `30000`   | IPC command timeout in milliseconds      |

### Connection

- `connect()` -- Connect and return `{ jid }` if already paired, or `{ needsPairing: true }`
- `disconnect()` -- Disconnect and stop the subprocess
- `logout()` -- Log out (removes device from WhatsApp) and stop
- `status()` -- Get current connection status

### Messaging

- `sendMessage(jid, message)` -- Send a message (text, image, etc.)
- `revokeMessage(chat, sender, id)` -- Revoke/delete a message
- `markRead(ids, chat, sender?)` -- Mark messages as read

### Media

- `downloadMedia(msg)` -- Download media from a received message

Media uses temp file paths instead of base64 to avoid bloating the IPC pipe. The Go binary writes downloaded media to a temp file and returns the path.

### Contacts

- `isOnWhatsApp(phones)` -- Check if phone numbers are on WhatsApp
- `getUserInfo(jids)` -- Get user info (status, picture ID, verified name)
- `getProfilePicture(jid)` -- Get profile picture URL

### Groups

- `createGroup(name, participants)` -- Create a group
- `getGroupInfo(jid)` -- Get group metadata
- `getJoinedGroups()` -- List all joined groups
- `getGroupInviteLink(jid, reset?)` -- Get/reset invite link
- `joinGroupWithLink(code)` -- Join a group via invite link
- `leaveGroup(jid)` -- Leave a group
- `setGroupName(jid, name)` -- Update group name
- `setGroupPhoto(jid, path)` -- Update group photo
- `setGroupAnnounce(jid, announce)` -- Toggle announcement mode
- `setGroupLocked(jid, locked)` -- Toggle group locked
- `updateGroupParticipants(jid, participants, action)` -- Add/remove/promote/demote

### Presence

- `sendPresence(presence)` -- Set online/offline status
- `sendChatPresence(jid, presence, media?)` -- Set typing/recording indicator
- `subscribePresence(jid)` -- Subscribe to a contact's presence

### Newsletters

- `getSubscribedNewsletters()` -- List subscribed newsletters
- `newsletterSubscribeLiveUpdates(jid)` -- Subscribe to newsletter updates

### Calls

- `rejectCall(from, callId)` -- Reject an incoming call

### Generic

- `call(method, args)` -- Send any command to the Go binary (escape hatch for unwrapped whatsmeow methods)

### Events

All [whatsmeow events](https://pkg.go.dev/go.mau.fi/whatsmeow#section-readme) are forwarded as typed events:

```typescript
client.on("message", ({ info, message }) => { /* ... */ });
client.on("message:receipt", ({ type, chat, sender, ids }) => { /* ... */ });
client.on("connected", ({ jid }) => { /* ... */ });
client.on("disconnected", () => { /* ... */ });
client.on("qr", ({ code }) => { /* ... */ });
client.on("call:offer", ({ from, callId }) => { /* ... */ });
// ... and more (see src/types.ts for full list)
```

## Database

The `store` option accepts:

- **SQLite**: `file:session.db` -- Creates a local database file. Recommended for single-process usage.
- **PostgreSQL**: `postgres://user:pass@host/db` -- For multi-instance deployments or serverless.

SQLite is configured automatically with WAL mode, foreign keys, and busy timeout for reliable concurrent access during WhatsApp's initial sync.

## Differences from whatsmeow

The API maps closely to whatsmeow's Go API. Most methods have a 1:1 TypeScript equivalent. Key differences:

- **Session storage is internal** -- The Go binary manages the whatsmeow `store.Device` internally. You can't implement a custom store from TypeScript; you choose SQLite or Postgres via the connection string.
- **Messages are JSON, not protobuf** -- You send/receive plain JSON objects instead of `waE2E.Message` protobuf structs. Simpler, but some proto edge cases may be lossy.
- **QR pairing is automatic** -- `connect()` detects if pairing is needed and sets up the QR channel automatically. QR codes arrive as events.
- **Auto-reconnect is enabled** -- whatsmeow's built-in reconnection is always on. You see `disconnected` + `connected` events but don't manage reconnect logic.
- **One client per process** -- Each `createClient()` spawns one Go binary. For multiple accounts, create multiple clients.
- **Network configuration not yet exposed** -- `SetProxy`, `SetMediaHTTPClient`, etc. are not available. The Go binary uses default networking.

For the full comparison including what's not yet implemented, see [INTERNALS.md](./INTERNALS.md#differences-from-using-whatsmeow-directly-in-go).

## Versioning

Independent semver. The embedded whatsmeow version is tracked in `package.json` as `whatsmeowVersion`.

| What changed | Version bump |
|---|---|
| whatsmeow patch (bug fix) | Patch |
| whatsmeow adds new methods | Minor (add wrappers + types) |
| whatsmeow removes/renames methods | Major |
| Our bug fix | Patch |
| New TS convenience methods | Minor |
| IPC protocol change | Major |

## Building from Source

Requirements: Go 1.25+, Node.js 18+

```bash
# Build the Go binary
cd cmd/whatsmeow-node
go build -o ../../whatsmeow-node .

# Build the TypeScript package
cd ../../ts
npm install
npm run build

# Run the pairing example
npx tsx examples/pair.ts
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full development setup.

## License

[MIT](./LICENSE)
