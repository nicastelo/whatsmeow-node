# whatsmeow-node

[![CI](https://github.com/nicastelo/whatsmeow-node/actions/workflows/ci.yml/badge.svg)](https://github.com/nicastelo/whatsmeow-node/actions/workflows/ci.yml)

TypeScript/Node.js bindings for [whatsmeow](https://github.com/tulir/whatsmeow), the Go WhatsApp Web multidevice API library.

Communicates with a precompiled Go binary over stdin/stdout JSON-line IPC. No CGo, no native addons, no WebSocket reimplementation -- just a subprocess.

> **Alpha** -- This is an early release. The API may change and it has not been extensively tested in production. Bug reports and contributions are welcome.

**Current upstream**: whatsmeow [`0.0.0-20260227`](https://pkg.go.dev/go.mau.fi/whatsmeow)

## Philosophy

whatsmeow-node is a **binding**, not a framework. The goal is to expose whatsmeow's API to Node.js as faithfully as possible -- a 1:1 mapping with no added abstractions, convenience wrappers, or opinion about how you should structure your app. A binding should bind, not opine.

- **No magic** -- Message payloads match the [whatsmeow protobuf schema](https://pkg.go.dev/go.mau.fi/whatsmeow/proto/waE2E#Message) directly. At runtime, message-sending methods accept JSON objects that follow the same shape that whatsmeow's `waE2E.Message` proto serializes to. If you know whatsmeow, you know this library.
- **No sweeteners** -- We don't invent shorthand like `sendText(jid, "hello")` or auto-build reply context. You construct the proto-shaped object yourself, exactly as whatsmeow expects it.
- **Typed where possible, open where needed** -- `sendMessage` is typed for common message shapes (text, extended text with replies). For any other `waE2E.Message` shape, use `sendRawMessage`, which accepts any `Record<string, unknown>` -- image messages, sticker messages, location messages, and anything whatsmeow adds in the future. At runtime both methods pass your object through to whatsmeow unchanged; the difference is only in TypeScript type checking.

**Why?** whatsmeow is a great, battle-tested library that deliberately exposes low-level proto structs instead of inventing convenience abstractions. We follow the same philosophy -- our job is just to make whatsmeow accessible from Node.js, nothing more. This keeps whatsmeow-node in sync with upstream automatically -- if whatsmeow supports it, you can use it. One less abstraction layer to maintain.

**Build on top of this.** If you want a higher-level API, build it as a separate package that depends on whatsmeow-node:

- A `sendText(jid, text)` helper that constructs `{ conversation: text }`
- A `reply(jid, text, quotedMsg)` helper that builds `extendedTextMessage` with `contextInfo`
- A message builder/fluent API for composing media messages
- A bot framework with command routing, middleware, session management
- Queue-based sending with rate limiting

All of these are better as userland packages that can evolve independently from the binding.

## Why whatsmeow?

Several open-source libraries exist for the WhatsApp Web protocol. They fall into two categories:

**Direct protocol** (reimplement the WebSocket protocol):

| | [whatsmeow](https://github.com/tulir/whatsmeow) | [Baileys](https://github.com/WhiskeySockets/Baileys) |
|---|---|---|
| Language | Go | Node.js |
| Memory | ~10-20 MB | ~50 MB |
| Maintainer | [tulir](https://github.com/tulir) (Mautrix bridges) | WhiskeySockets community |

**Browser automation** (drive WhatsApp Web via Puppeteer/Selenium):
[whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js), [WPPConnect](https://github.com/wppconnect-team/wppconnect), [OpenWA](https://github.com/open-wa/wa-automate-nodejs) -- these require a headless browser (~200-500 MB) and are more fragile.

Higher-level platforms like [Evolution API](https://github.com/EvolutionAPI/evolution-api) and [WAHA](https://github.com/devlikeapro/waha) wrap one or more of the above.

We chose whatsmeow because:

- **Reliability** -- Powers the [Mautrix WhatsApp bridge](https://github.com/mautrix/whatsapp) (24/7 for thousands of users), [wacli](https://github.com/steipete/wacli), and many other projects. Arguably the most battle-tested implementation.
- **Resource efficiency** -- A single Go binary uses far less memory than a Node.js or Puppeteer process.
- **Protocol correctness** -- Meticulous about protocol compliance, reducing the risk of bans.
- **Stability** -- Consistent maintainership. Baileys has gone through multiple forks and breaking changes; browser-based libraries depend on a full browser engine.

The tradeoff is the IPC layer between Node.js and Go, but the subprocess approach keeps things simple: no CGo, no native addons, no WebSocket reimplementation in JavaScript.

Huge thanks to [@tulir](https://github.com/tulir) and the [whatsmeow contributors](https://github.com/tulir/whatsmeow/graphs/contributors) for building and maintaining such a solid foundation.

## Install

```bash
npm install @whatsmeow-node/whatsmeow-node
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
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

// Listen for events
client.on("qr", ({ code }) => {
  // Use any QR renderer — e.g. `npm install qrcode-terminal`
  // import qrcode from "qrcode-terminal";
  // qrcode.generate(code, { small: true });
  console.log("QR code:", code);
});
client.on("connected", ({ jid }) => console.log("Connected as", jid));
client.on("message", ({ info, message }) => {
  console.log(`${info.pushName}: ${message.conversation ?? JSON.stringify(message)}`);
});

// Initialize and connect
const { jid } = await client.init();

if (!jid) {
  // Not paired yet — set up QR channel before connecting
  await client.getQRChannel();
}

await client.connect();
```

## API

### `createClient(options)`

Returns a `WhatsmeowClient` instance.

| Option           | Type     | Default   | Description                              |
|------------------|----------|-----------|------------------------------------------|
| `store`          | `string` | required  | SQLite path (`session.db`) or Postgres URL (`postgres://...`) |
| `binaryPath`     | `string` | auto      | Path to the Go binary (auto-resolved from platform package) |
| `commandTimeout` | `number` | `30000`   | IPC command timeout in milliseconds      |

### Connection

- `init()` -- Open store and create whatsmeow client. Returns `{ jid }` if already paired.
- `getQRChannel()` -- Set up QR pairing channel. Call before `connect()`. QR codes arrive as `qr` events.
- `pairCode(phone)` -- Pair via phone number (alternative to QR). Call after `connect()`.
- `connect()` -- Connect to WhatsApp (`client.Connect()`)
- `disconnect()` -- Disconnect from WhatsApp (`client.Disconnect()`)
- `logout()` -- Log out and remove device from WhatsApp (`client.Logout()`)
- `isConnected()` -- Check connection status (`client.IsConnected()`)
- `isLoggedIn()` -- Check login status (`client.IsLoggedIn()`)
- `close()` -- Kill the Go subprocess (for cleanup)

### Messaging

- `sendMessage(jid, message)` -- Send a typed message (conversation, extended text with replies)
- `sendRawMessage(jid, message)` -- Send any `waE2E.Message`-shaped JSON (untyped escape hatch)
- `sendReaction(chat, sender, id, reaction)` -- React to a message (empty string to remove)
- `editMessage(chat, id, message)` -- Edit a previously sent message
- `revokeMessage(chat, sender, id)` -- Revoke/delete a message
- `markRead(ids, chat, sender?)` -- Mark messages as read

### Polls

- `sendPollCreation(jid, name, options, selectableCount)` -- Create and send a poll
- `sendPollVote(pollChat, pollSender, pollId, pollTimestamp, options)` -- Vote on a poll

### Media

- `downloadMedia(msg)` -- Download media from a received message
- `uploadMedia(path, mediaType)` -- Upload media for sending (`"image"` | `"video"` | `"audio"` | `"document"`)

Media uses temp file paths instead of base64 to avoid bloating the IPC pipe. The Go binary writes downloaded media to a temp file and returns the path. Upload returns `{ url, directPath, mediaKey, fileEncSha256, fileSha256, fileLength }` for use in message protos.

### Contacts & Users

- `isOnWhatsApp(phones)` -- Check if phone numbers are on WhatsApp
- `getUserInfo(jids)` -- Get user info (status, picture ID, verified name)
- `getProfilePicture(jid)` -- Get profile picture URL
- `getUserDevices(jids)` -- Get all devices for given users
- `getBusinessProfile(jid)` -- Get business profile info (address, email, categories, profile options, business hours)
- `setStatusMessage(message)` -- Set your account's status message

### Groups

- `createGroup(name, participants)` -- Create a group
- `getGroupInfo(jid)` -- Get group metadata
- `getGroupInfoFromLink(code)` -- Get group info from an invite link without joining
- `getJoinedGroups()` -- List all joined groups
- `getGroupInviteLink(jid, reset?)` -- Get/reset invite link
- `joinGroupWithLink(code)` -- Join a group via invite link
- `leaveGroup(jid)` -- Leave a group
- `setGroupName(jid, name)` -- Update group name
- `setGroupDescription(jid, description)` -- Update group description
- `setGroupPhoto(jid, path)` -- Update group photo
- `setGroupAnnounce(jid, announce)` -- Toggle announcement mode
- `setGroupLocked(jid, locked)` -- Toggle group locked
- `updateGroupParticipants(jid, participants, action)` -- Add/remove/promote/demote
- `getGroupRequestParticipants(jid)` -- Get pending join requests
- `updateGroupRequestParticipants(jid, participants, action)` -- Approve/reject join requests
- `setGroupMemberAddMode(jid, mode)` -- Set who can add members (`"admin_add"` | `"all_member_add"`)
- `setGroupJoinApprovalMode(jid, enabled)` -- Enable/disable join approval

### Communities

- `linkGroup(parent, child)` -- Link a child group to a parent community
- `unlinkGroup(parent, child)` -- Unlink a child group from a community
- `getSubGroups(jid)` -- Get sub-groups of a community
- `getLinkedGroupsParticipants(jid)` -- Get participants across linked groups

### Presence

- `sendPresence(presence)` -- Set online/offline status
- `sendChatPresence(jid, presence, media?)` -- Set typing/recording indicator
- `subscribePresence(jid)` -- Subscribe to a contact's presence

### Newsletters

- `getSubscribedNewsletters()` -- List subscribed newsletters
- `newsletterSubscribeLiveUpdates(jid)` -- Subscribe to live updates
- `createNewsletter(name, description, picture?)` -- Create a newsletter/channel
- `getNewsletterInfo(jid)` -- Get newsletter metadata
- `getNewsletterInfoWithInvite(key)` -- Get newsletter info from invite link
- `followNewsletter(jid)` -- Follow a newsletter
- `unfollowNewsletter(jid)` -- Unfollow a newsletter
- `getNewsletterMessages(jid, count, before?)` -- Fetch newsletter messages (paginate backward from server ID)
- `newsletterMarkViewed(jid, serverIds)` -- Mark messages as viewed
- `newsletterSendReaction(jid, serverId, reaction, messageId)` -- React to a newsletter message
- `newsletterToggleMute(jid, mute)` -- Mute/unmute a newsletter

### Privacy & Settings

- `getPrivacySettings()` -- Get all privacy settings
- `setPrivacySetting(name, value)` -- Update a privacy setting
- `setDefaultDisappearingTimer(seconds)` -- Set default disappearing timer (0 to disable)
- `setDisappearingTimer(jid, seconds)` -- Set disappearing timer for a specific chat

### Blocklist

- `getBlocklist()` -- Get blocked contacts
- `updateBlocklist(jid, action)` -- Block/unblock a contact (`"block"` | `"unblock"`)

### QR & Link Resolution

- `getContactQRLink(revoke?)` -- Generate or revoke your contact QR link
- `resolveContactQRLink(code)` -- Resolve a contact QR code to user info
- `resolveBusinessMessageLink(code)` -- Resolve a business message link

### Calls

- `rejectCall(from, callId)` -- Reject an incoming call

### Configuration

- `setPassive(passive)` -- Set passive mode (don't receive messages)
- `setForceActiveDeliveryReceipts(active)` -- Force sending delivery receipts

### Generic

- `call(method, args)` -- Send any command to the Go binary (escape hatch)

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

- **SQLite**: `session.db` or `./data/wa.db` -- Creates a local database file. Recommended for single-process usage. Plain paths are auto-prefixed with `file:` (you can also pass `file:session.db?_pragma=...` for explicit SQLite URI parameters).
- **PostgreSQL**: `postgres://user:pass@host/db` -- For multi-instance deployments or serverless.

SQLite is configured automatically with WAL mode, foreign keys, and busy timeout for reliable concurrent access during WhatsApp's initial sync.

## Usage with Next.js

Next.js (Turbopack/Webpack) bundles server code by default and will try to parse the Go binary as JavaScript. Add all `@whatsmeow-node` packages to `serverExternalPackages` in your `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@whatsmeow-node/whatsmeow-node",
    "@whatsmeow-node/darwin-arm64",
    "@whatsmeow-node/darwin-x64",
    "@whatsmeow-node/linux-arm64",
    "@whatsmeow-node/linux-x64",
    "@whatsmeow-node/linux-x64-musl",
    "@whatsmeow-node/win32-arm64",
    "@whatsmeow-node/win32-x64",
  ],
};
```

Only your deployment platform's package will be installed (npm resolves by `os`/`cpu`), but listing all of them ensures it works in any environment.

## Differences from whatsmeow

The API maps closely to whatsmeow's Go API. Most methods have a 1:1 TypeScript equivalent. Key differences:

- **Session storage is internal** -- The Go binary manages the whatsmeow `store.Device` internally. You can't implement a custom store from TypeScript; you choose SQLite or Postgres via the connection string.
- **Messages are JSON, not protobuf** -- You send/receive JSON objects that map to `waE2E.Message` protobuf fields via [protojson](https://pkg.go.dev/google.golang.org/protobuf/encoding/protojson). The JSON shape matches the proto schema directly.
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

## Acknowledgments

This project is entirely built on [whatsmeow](https://github.com/tulir/whatsmeow) by [@tulir](https://github.com/tulir) and [contributors](https://github.com/tulir/whatsmeow/graphs/contributors). Thank you for building and maintaining such a reliable library.

## License

[MIT](./LICENSE)
