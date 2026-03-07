<p align="center">
  <img src="https://raw.githubusercontent.com/nicastelo/whatsmeow-node/main/docs-site/static/img/image.png" alt="whatsmeow-node" width="120" />
</p>

# whatsmeow-node

[![CI](https://github.com/nicastelo/whatsmeow-node/actions/workflows/ci.yml/badge.svg)](https://github.com/nicastelo/whatsmeow-node/actions/workflows/ci.yml)
[![E2E](https://github.com/nicastelo/whatsmeow-node/actions/workflows/e2e.yml/badge.svg)](https://github.com/nicastelo/whatsmeow-node/actions/workflows/e2e.yml)
[![API coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/nicastelo/eb3fdca5e3c515b4d946d8e0dc51defc/raw/method-coverage-badge.json)](https://github.com/nicastelo/whatsmeow-node/actions/workflows/ci.yml)
[![integration coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/nicastelo/deee098d298bc9a9193cec6adcb13220/raw/coverage-badge.json)](https://github.com/nicastelo/whatsmeow-node/actions/workflows/e2e.yml)
[![npm version](https://img.shields.io/npm/v/%40whatsmeow-node%2Fwhatsmeow-node)](https://www.npmjs.com/package/@whatsmeow-node/whatsmeow-node)
[![npm downloads](https://img.shields.io/npm/dm/%40whatsmeow-node%2Fwhatsmeow-node)](https://www.npmjs.com/package/@whatsmeow-node/whatsmeow-node)
[![docs](https://img.shields.io/badge/docs-nicastelo.github.io-25855a)](https://nicastelo.github.io/whatsmeow-node/)

TypeScript/Node.js bindings for [whatsmeow](https://github.com/tulir/whatsmeow), the Go WhatsApp Web multidevice API library.

Communicates with a precompiled Go binary over stdin/stdout JSON-line IPC. No CGo, no native addons, no WebSocket reimplementation -- just a subprocess.

> **0.x** -- The binding API is stable, but we stay on 0.x because the upstream whatsmeow library is itself pre-1.0. See [Versioning](#versioning) for details.

> [!CAUTION]
> **Disclaimer:** This project is not affiliated, associated, authorized, endorsed by, or in any way officially connected with WhatsApp or any of its subsidiaries or affiliates. "WhatsApp" as well as related names, marks, emblems and images are registered trademarks of their respective owners.
>
> Use of this library may violate WhatsApp's Terms of Service. WhatsApp does not allow unofficial clients or automated messaging on their platform. Your account may be banned. Use at your own risk.
>
> Do not use this for spamming, stalkerware, bulk messaging, or any purpose that violates WhatsApp's Terms of Service. The maintainers do not condone such use and bear no liability for misuse.

**Current upstream**: whatsmeow [`0.0.0-20260305`](https://pkg.go.dev/go.mau.fi/whatsmeow)

## Documentation

Full docs and guides at **[nicastelo.github.io/whatsmeow-node](https://nicastelo.github.io/whatsmeow-node/)** — getting started, API reference, events, error codes, troubleshooting, and examples.

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

## Connection Lifecycle

The connection flow follows a specific sequence:

```
init() → connect() → "connected" event → operational → "disconnected" → auto-reconnect → "connected"
```

**Normal startup:**

```typescript
const { jid } = await client.init();  // Opens store, returns JID if already paired
if (!jid) {
  await client.getQRChannel();        // Set up QR pairing (first time only)
}
await client.connect();               // Starts connection (async, returns immediately)
// Wait for "connected" event before sending messages
```

**Key events:**

| Event | Meaning | Action |
|-------|---------|--------|
| `connected` | WhatsApp connection established | Safe to send messages |
| `disconnected` | Connection lost | Auto-reconnect is built-in, no action needed |
| `logged_out` | Session revoked (user unlinked device) | Must re-pair — delete store and start over |
| `stream_error` | Protocol error from WhatsApp | Usually followed by auto-reconnect |
| `keep_alive_timeout` | Keep-alive pings failing | Connection may be degraded |
| `keep_alive_restored` | Keep-alive recovered | Connection is healthy again |

**Resilient connection pattern:**

```typescript
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

## Error Handling

All client methods throw on failure. Errors are typed for easy handling:

```typescript
import {
  WhatsmeowError,    // Base class for all whatsmeow errors
  TimeoutError,      // IPC command timed out
  ProcessExitedError // Go binary crashed or exited
} from "@whatsmeow-node/whatsmeow-node";

try {
  await client.sendMessage(jid, { conversation: "hello" });
} catch (err) {
  if (err instanceof WhatsmeowError) {
    console.error(`WhatsApp error [${err.code}]: ${err.message}`);
  }
}
```

**Common error codes:**

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

**Pattern for handling specific errors:**

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

## Sending Messages

**Text message:**

```typescript
await client.sendMessage(jid, { conversation: "Hello!" });
```

**Reply to a message:**

```typescript
await client.sendMessage(jid, {
  extendedTextMessage: {
    text: "This is a reply",
    contextInfo: {
      stanzaId: originalMessageId,
      participant: originalSenderJid,
      quotedMessage: { conversation: "the original text" },
    },
  },
});
```

**Image, location, contact card** (use `sendRawMessage` for any proto shape):

```typescript
// Upload then send an image
const media = await client.uploadMedia("/path/to/photo.jpg", "image");
await client.sendRawMessage(jid, {
  imageMessage: {
    URL: media.URL,
    directPath: media.directPath,
    mediaKey: media.mediaKey,
    fileEncSHA256: media.fileEncSHA256,
    fileSHA256: media.fileSHA256,
    fileLength: String(media.fileLength),
    mimetype: "image/jpeg",
    caption: "Check this out",
  },
});

// Send a location
await client.sendRawMessage(jid, {
  locationMessage: {
    degreesLatitude: -34.9011,
    degreesLongitude: -56.1645,
    name: "Montevideo",
  },
});

// Send a contact card
await client.sendRawMessage(jid, {
  contactMessage: {
    displayName: "John Doe",
    vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+1234567890\nEND:VCARD",
  },
});
```

`sendRawMessage` accepts any `Record<string, unknown>` matching the [whatsmeow `waE2E.Message` proto schema](https://pkg.go.dev/go.mau.fi/whatsmeow/proto/waE2E#Message). The JSON shape uses protojson field names (camelCase).

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
- `waitForConnection(timeoutMs?)` -- Wait until connected and logged in, or timeout
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
- `downloadAny(message)` -- Download media from any message type (auto-detects the media field)
- `downloadMediaWithPath(opts)` -- Download media using direct path and keys (lower-level)
- `uploadMedia(path, mediaType)` -- Upload media for sending (`"image"` | `"video"` | `"audio"` | `"document"`)

Media uses temp file paths instead of base64 to avoid bloating the IPC pipe. The Go binary writes downloaded media to a temp file and returns the path. Upload returns `{ URL, directPath, mediaKey, fileEncSHA256, fileSHA256, fileLength }` for use in message protos.

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
- `getGroupInfoFromInvite(jid, inviter, code, expiration)` -- Get group info from a direct invite
- `getJoinedGroups()` -- List all joined groups
- `getGroupInviteLink(jid, reset?)` -- Get/reset invite link
- `joinGroupWithLink(code)` -- Join a group via invite link
- `joinGroupWithInvite(jid, inviter, code, expiration)` -- Join a group via direct invite
- `leaveGroup(jid)` -- Leave a group
- `setGroupName(jid, name)` -- Update group name
- `setGroupTopic(jid, topic, previousId?, newId?)` -- Update group topic/description with optional topic IDs
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
- `getNewsletterMessageUpdates(jid, count, opts?)` -- Get message updates (since timestamp or after server ID)
- `newsletterMarkViewed(jid, serverIds)` -- Mark messages as viewed
- `newsletterSendReaction(jid, serverId, reaction, messageId)` -- React to a newsletter message
- `newsletterToggleMute(jid, mute)` -- Mute/unmute a newsletter
- `acceptTOSNotice(noticeId, stage)` -- Accept a Terms of Service notice (required for some newsletter flows)
- `uploadNewsletter(path, mediaType)` -- Upload media for newsletter messages

### Privacy & Settings

- `getPrivacySettings()` -- Get all privacy settings
- `tryFetchPrivacySettings(ignoreCache?)` -- Fetch privacy settings from cache or server
- `setPrivacySetting(name, value)` -- Update a privacy setting
- `getStatusPrivacy()` -- Get default status audience rules
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
- `resetConnection()` -- Reset the WebSocket connection

### Message Helpers

- `generateMessageID()` -- Generate a unique message ID
- `buildMessageKey(chat, sender, id)` -- Build a protobuf message key
- `buildUnavailableMessageRequest(chat, sender, id)` -- Build a request for unavailable messages
- `buildHistorySyncRequest(info, count)` -- Build a history sync request message
- `sendPeerMessage(message)` -- Send a message to your own devices
- `sendMediaRetryReceipt(info, mediaKey)` -- Request re-upload of media from the sender

### Bots

- `getBotListV2()` -- Get the list of available bots
- `getBotProfiles(bots)` -- Get profiles for specific bots

### App State

- `fetchAppState(name, fullSync?, onlyIfNotSynced?)` -- Fetch app state from the server
- `markNotDirty(cleanType, timestamp)` -- Mark an app state patch as not dirty

### Decrypt / Encrypt

- `decryptComment(info, message)` -- Decrypt a comment message
- `decryptPollVote(info, message)` -- Decrypt a poll vote message
- `decryptReaction(info, message)` -- Decrypt a reaction message
- `decryptSecretEncryptedMessage(info, message)` -- Decrypt a secret encrypted message
- `encryptComment(info, message)` -- Encrypt a comment for a message
- `encryptPollVote(info, vote)` -- Encrypt a poll vote
- `encryptReaction(info, reaction)` -- Encrypt a reaction

### Web Message Parsing

- `parseWebMessage(chatJid, webMsg)` -- Parse a WebMessageInfo (from history sync) into a message event

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

## Rate Limiting

WhatsApp enforces rate limits that can result in temporary bans if exceeded. There are no officially published limits, but the community has observed these approximate thresholds:

- **Messages**: ~50-80 messages per minute for individual chats, lower for new/unverified numbers
- **Group operations**: Creating groups, adding participants, and modifying settings are more tightly limited
- **Media uploads**: Slower rate limit than text messages; large files count more heavily
- **Contact checks** (`isOnWhatsApp`): ~50 numbers per request, batched automatically by whatsmeow
- **Newsletter operations**: Lower limits than regular messaging

**Safe sending pattern:**

```typescript
async function sendWithBackoff(client: WhatsmeowClient, messages: Array<{ jid: string; text: string }>) {
  for (const { jid, text } of messages) {
    try {
      await client.sendMessage(jid, { conversation: text });
    } catch (err) {
      if (err instanceof WhatsmeowError && err.code === "ERR_SEND") {
        // Back off and retry
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

**General guidance:**

- Space out messages (1-3 seconds between sends)
- Avoid bulk operations on new/freshly paired numbers
- Handle `temporary_ban` events — they include an expiry time
- Monitor `stream_error` and `keep_alive_timeout` events as early warning signs
- Use `sendPresence("available")` before sending to simulate normal client behavior

## Differences from whatsmeow

The API maps closely to whatsmeow's Go API. Most methods have a 1:1 TypeScript equivalent. Key differences:

- **Session storage is internal** -- The Go binary manages the whatsmeow `store.Device` internally. You can't implement a custom store from TypeScript; you choose SQLite or Postgres via the connection string.
- **Messages are JSON, not protobuf** -- You send/receive JSON objects that map to `waE2E.Message` protobuf fields via [protojson](https://pkg.go.dev/google.golang.org/protobuf/encoding/protojson). The JSON shape matches the proto schema directly.
- **Auto-reconnect is enabled** -- whatsmeow's built-in reconnection is always on. You see `disconnected` + `connected` events but don't manage reconnect logic.
- **One client per process** -- Each `createClient()` spawns one Go binary. For multiple accounts, create multiple clients.
- **Network configuration not yet exposed** -- `SetProxy`, `SetMediaHTTPClient`, etc. are not available. The Go binary uses default networking.

For the full comparison including what's not yet implemented, see [INTERNALS.md](./INTERNALS.md#differences-from-using-whatsmeow-directly-in-go).

## Versioning

whatsmeow-node stays on `0.x` because the upstream whatsmeow library is itself pre-1.0 (`0.0.0-YYYYMMDD`). Declaring 1.0 on top of an unstable upstream would be misleading. This is **not** a maturity signal — the binding layer, IPC contract, and TypeScript API are stable. The `0.` prefix reflects upstream reality.

We use `0.MAJOR.MINOR` semantics: the minor position acts as the major version, and patch acts as minor.

| What changed | Version bump |
|---|---|
| Breaking API or IPC change | Minor (`0.5.0` → `0.6.0`) |
| whatsmeow upstream bump (breaking) | Minor |
| New methods, features, upstream bump (non-breaking) | Patch (`0.5.0` → `0.5.1`) |
| Bug fix | Patch |

The exact whatsmeow commit is tracked in `package.json` as `whatsmeowVersion`.

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

## Testing

**Unit tests** (mock-based, no WhatsApp connection):

```bash
cd ts && npm test
```

**E2E tests** (requires a paired WhatsApp session):

```bash
# Build the Go binary first
go build -o whatsmeow-node ./cmd/whatsmeow-node

# Run E2E tests against a session
E2E_SESSION_DB=./ts/session.db npm run test:e2e
```

E2E tests run read-only operations (privacy settings, blocklist, groups, contacts, newsletters, presence) to minimize ban risk. They run nightly in CI against an encrypted session stored in the repo.

To set up E2E for CI:

1. Pair a session: `cd ts && npx tsx examples/pair.ts`
2. Encrypt and commit: `./scripts/export-session.sh ts/session.db`
3. Set the secret: `gh secret set E2E_SESSION_KEY --body '<passphrase>'`

## Acknowledgments

This project is entirely built on [whatsmeow](https://github.com/tulir/whatsmeow) by [@tulir](https://github.com/tulir) and [contributors](https://github.com/tulir/whatsmeow/graphs/contributors). All the hard work of protocol implementation, encryption, and WhatsApp compliance happens in whatsmeow — we just bridge it to Node.js.

**whatsmeow-node is an independent project.** It is not affiliated with, endorsed by, or connected to whatsmeow or its maintainers in any way.

If you find this project useful and want to support it financially, **please sponsor whatsmeow's maintainer instead** — without whatsmeow, this project wouldn't exist: [github.com/sponsors/tulir](https://github.com/sponsors/tulir)

### whatsmeow Resources

- [GitHub](https://github.com/tulir/whatsmeow) · [Go Docs](https://pkg.go.dev/go.mau.fi/whatsmeow) · [Matrix Chat](https://matrix.to/#/#whatsmeow:maunium.net) · [Protocol Q&A](https://github.com/tulir/whatsmeow/discussions/categories/whatsapp-protocol-q-a)

## License

[MIT](./LICENSE)
