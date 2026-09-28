---
title: "How to Archive WhatsApp Chat History to a Database"
sidebar_label: Archive Chat History
sidebar_position: 25
description: "Save WhatsApp chat history and new messages to SQLite with Node.js using whatsmeow-node — history sync, upserts, text extraction, and on-demand backfill."
keywords: [archive whatsapp chat history, whatsapp history sync nodejs, backup whatsapp messages database, export whatsapp chats sqlite, whatsapp message archive typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/archive-chat-history.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/archive-chat-history.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Archive WhatsApp Chat History to a Database",
      "description": "Save WhatsApp chat history and new messages to SQLite with Node.js using whatsmeow-node — history sync, upserts, text extraction, and on-demand backfill.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/archive-chat-history.png",
      "step": [
        {"@type": "HowToStep", "name": "Create the Database Schema", "text": "Create chats and messages tables in SQLite with a primary key on (chat, id) so every message is stored once."},
        {"@type": "HowToStep", "name": "Extract Message Text", "text": "Read text from conversation, extendedTextMessage.text, or media captions, and keep the raw message as JSON."},
        {"@type": "HowToStep", "name": "Store History Sync Chunks", "text": "Listen for the history_sync event and upsert every conversation and message in one transaction per chunk."},
        {"@type": "HowToStep", "name": "Archive Live Messages", "text": "Listen for the message event and upsert new messages into the same table."},
        {"@type": "HowToStep", "name": "Request Older History On Demand", "text": "Call buildHistorySyncRequest() with the oldest known message and send it with sendPeerMessage()."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Archive WhatsApp Chat History to a Database",
      "description": "Save WhatsApp chat history and new messages to SQLite with Node.js using whatsmeow-node — history sync, upserts, text extraction, and on-demand backfill.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/archive-chat-history.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Archive WhatsApp Chat History to a Database](/img/guides/archive-chat-history.png)
![How to Archive WhatsApp Chat History to a Database](/img/guides/archive-chat-history-light.png)

# How to Archive WhatsApp Chat History to a Database

When you pair a new device, WhatsApp pushes a copy of your recent chat history to it. whatsmeow-node forwards that data as `history_sync` events, with each message in the same `{ info, message }` shape as a live `message` event. This means one function can archive both old and new messages. This guide stores everything in SQLite with [better-sqlite3](https://github.com/WiseLibs/better-sqlite3).

## Prerequisites

- Node.js 22+ and whatsmeow-node installed ([Installation](/docs/installation)). The current better-sqlite3 (13.x) requires Node 22; on Node 20, install `better-sqlite3@12` instead.
- better-sqlite3 and qrcode-terminal: `npm install better-sqlite3 qrcode-terminal` (plus `@types/better-sqlite3` and `@types/qrcode-terminal` for TypeScript)
- A phone with WhatsApp that you can pair ([How to Pair](pair-whatsapp)). To receive the initial history, the archiver has to be running **when you pair**. See Step 6.

## The `history_sync` Event

```typescript
client.on("history_sync", ({ type, chunkOrder, progress, conversations }) => {
  // type:          "INITIAL_BOOTSTRAP", "RECENT", "FULL", "PUSH_NAME", "ON_DEMAND", ...
  // chunkOrder:    order of this chunk within the sync
  // progress:      sync progress in percent (0 when the sync type doesn't report it)
  // conversations: [{ id, name, unreadCount, messages: [{ info, message }] }]
});
```

Each entry in `conversations[].messages` has an `info` (`id`, `chat`, `sender`, `isFromMe`, `isGroup`, `timestamp`, `pushName`) and a `message` object with proto field names, like live messages. A large account's history comes in **many chunks** spread over several minutes, so you should store each chunk as it arrives.

## Step 1: Create the Database Schema

```typescript
import Database from "better-sqlite3";

const db = new Database("archive.db");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    id           TEXT PRIMARY KEY,
    name         TEXT,
    unread_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS messages (
    chat      TEXT    NOT NULL,
    id        TEXT    NOT NULL,
    sender    TEXT    NOT NULL,
    from_me   INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    push_name TEXT,
    text      TEXT,
    raw       TEXT    NOT NULL,
    source    TEXT    NOT NULL,
    PRIMARY KEY (chat, id)
  );
  CREATE INDEX IF NOT EXISTS messages_chat_ts ON messages (chat, timestamp);
`);
```

The primary key is `(chat, id)` because message IDs are only guaranteed to be unique within a chat. The same message can arrive more than once, for example in two history chunks or in a history chunk and as a live event. An upsert on this key stores it once, as long as both copies use the same chat JID. If WhatsApp addresses a chat by its LID in one place and by phone number in another, you get two rows (see [LID JIDs](#common-pitfalls) below):

```typescript
const upsertMessage = db.prepare(`
  INSERT INTO messages (chat, id, sender, from_me, timestamp, push_name, text, raw, source)
  VALUES (@chat, @id, @sender, @fromMe, @timestamp, @pushName, @text, @raw, @source)
  ON CONFLICT (chat, id) DO UPDATE SET
    text = COALESCE(excluded.text, messages.text),
    raw = excluded.raw,
    push_name = COALESCE(NULLIF(excluded.push_name, ''), messages.push_name)
`);
```

`timestamp` is in Unix **seconds**, the same value as `info.timestamp`.

## Step 2: Extract Message Text

Text can be in different fields depending on the message type:

```typescript
function extractText(message: Record<string, unknown>): string | null {
  if (typeof message.conversation === "string") return message.conversation;

  const ext = message.extendedTextMessage as { text?: string } | undefined;
  if (ext?.text) return ext.text;

  for (const key of ["imageMessage", "videoMessage", "documentMessage"]) {
    const media = message[key] as { caption?: string } | undefined;
    if (media?.caption) return media.caption;
  }
  return null;
}
```

- `conversation` holds plain text
- `extendedTextMessage.text` holds replies, links, and mentions
- `imageMessage.caption`, `videoMessage.caption`, and `documentMessage.caption` hold media captions

Save the full `message` as JSON in the `raw` column too. That way you can extract more fields later, like reactions, polls, or quoted replies (`extendedTextMessage.contextInfo.stanzaID`), without syncing again.

## Step 3: Store History Sync Chunks

Write each chunk in a single transaction. With thousands of messages per chunk, this is much faster than committing each row separately:

```typescript
import type { HistorySyncConversation, MessageInfo } from "@whatsmeow-node/whatsmeow-node";

function saveMessage(
  info: MessageInfo,
  message: Record<string, unknown>,
  source: "history" | "live",
): void {
  upsertMessage.run({
    chat: info.chat,
    id: info.id,
    sender: info.sender,
    fromMe: info.isFromMe ? 1 : 0,
    timestamp: info.timestamp,
    pushName: info.pushName,
    text: extractText(message),
    raw: JSON.stringify(message),
    source,
  });
}

const saveChunk = db.transaction((conversations: HistorySyncConversation[]) => {
  let count = 0;
  for (const conv of conversations) {
    upsertChat.run({ id: conv.id, name: conv.name, unreadCount: conv.unreadCount });
    for (const { info, message } of conv.messages) {
      saveMessage(info, message, "history");
      count++;
    }
  }
  return count;
});

client.on("history_sync", ({ type, chunkOrder, progress, conversations }) => {
  const count = saveChunk(conversations);
  console.log(
    `[history] ${type} chunk #${chunkOrder}: ${conversations.length} chats, ` +
      `${count} messages (progress ${progress}%)`,
  );
});
```

`upsertChat` is defined in the [complete example](#complete-example). It keeps the last non-empty chat name.

## Step 4: Archive Live Messages

New messages use the same table and the same `saveMessage()` function:

```typescript
client.on("message", ({ info, message }) => {
  saveMessage(info, message, "live");
});
```

Unlike in a bot, you should **not** skip `info.isFromMe` here. Messages you send from your phone are part of the conversation too.

Edits, reactions, and deletions also arrive as live `message` events with their own IDs. An edit, for example, is a `protocolMessage` with `type: "MESSAGE_EDIT"` and `key.ID` pointing at the original message. This archiver stores them as separate rows with `text` = NULL. To apply edits, check for `protocolMessage.editedMessage` and update the row for `protocolMessage.key.ID` instead. (History sync already applies edits: an edited message arrives with the original ID and the edited content.)

## Step 5: Request Older History On Demand

The initial sync only includes recent history. To get older messages for a chat, ask your phone for messages before the oldest one you already have:

```typescript
const oldestInChat = db.prepare(`
  SELECT id, chat, sender, from_me, timestamp
  FROM messages WHERE chat = ?
  ORDER BY timestamp ASC LIMIT 1
`);

async function requestOlderMessages(chat: string, count = 50): Promise<void> {
  const row = oldestInChat.get(chat) as
    | { id: string; chat: string; sender: string; from_me: number; timestamp: number }
    | undefined;
  if (!row) return;

  const oldest: MessageInfo = {
    id: row.id,
    chat: row.chat,
    sender: row.sender,
    isFromMe: row.from_me === 1,
    isGroup: row.chat.endsWith("@g.us"),
    timestamp: row.timestamp,
    pushName: "",
  };

  const request = await client.buildHistorySyncRequest(oldest, count);
  await client.sendPeerMessage(request);
}
```

`buildHistorySyncRequest(info, count)` builds a peer data request, and `sendPeerMessage()` sends it to your own phone. The reply does **not** come back as the return value. It arrives later as a `history_sync` event with `type: "ON_DEMAND"`, and the handler from Step 3 stores it. Include `isFromMe` in the info object, because WhatsApp uses it to identify the oldest message.

## Step 6: Pair From the Archiver

WhatsApp pushes the initial history (`INITIAL_BOOTSTRAP` and `RECENT` chunks, plus other types such as `PUSH_NAME`) **only once, right after a new device is paired**. whatsmeow-node doesn't request a full sync, so expect recent months of history, not the whole account. Any process that is connected when the sync arrives consumes it: whatsmeow acknowledges each chunk and deletes it from WhatsApp's servers, even with no `history_sync` listener. If you pair with a separate script that stays connected, that history is gone.

Handle the QR code in the archiver itself so it is listening when the sync starts:

```typescript
import qrcode from "qrcode-terminal";

client.on("qr", ({ code }) => {
  qrcode.generate(code, { small: true });
});

const { jid } = await client.init();
if (!jid) await client.getQRChannel();
await client.connect();
```

If you missed the initial sync, unlink the device on your phone (**Settings → Linked Devices**), delete `session.db`, and pair again.

## Complete Example

```typescript
import {
  createClient,
  type HistorySyncConversation,
  type MessageInfo,
} from "@whatsmeow-node/whatsmeow-node";
import Database from "better-sqlite3";
import qrcode from "qrcode-terminal";

const client = createClient({ store: "session.db" });
const db = new Database("archive.db");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    id           TEXT PRIMARY KEY,
    name         TEXT,
    unread_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS messages (
    chat      TEXT    NOT NULL,
    id        TEXT    NOT NULL,
    sender    TEXT    NOT NULL,
    from_me   INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    push_name TEXT,
    text      TEXT,
    raw       TEXT    NOT NULL,
    source    TEXT    NOT NULL,
    PRIMARY KEY (chat, id)
  );
  CREATE INDEX IF NOT EXISTS messages_chat_ts ON messages (chat, timestamp);
`);

const upsertChat = db.prepare(`
  INSERT INTO chats (id, name, unread_count)
  VALUES (@id, @name, @unreadCount)
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(NULLIF(excluded.name, ''), chats.name),
    unread_count = excluded.unread_count
`);

const upsertMessage = db.prepare(`
  INSERT INTO messages (chat, id, sender, from_me, timestamp, push_name, text, raw, source)
  VALUES (@chat, @id, @sender, @fromMe, @timestamp, @pushName, @text, @raw, @source)
  ON CONFLICT (chat, id) DO UPDATE SET
    text = COALESCE(excluded.text, messages.text),
    raw = excluded.raw,
    push_name = COALESCE(NULLIF(excluded.push_name, ''), messages.push_name)
`);

function extractText(message: Record<string, unknown>): string | null {
  if (typeof message.conversation === "string") return message.conversation;

  const ext = message.extendedTextMessage as { text?: string } | undefined;
  if (ext?.text) return ext.text;

  for (const key of ["imageMessage", "videoMessage", "documentMessage"]) {
    const media = message[key] as { caption?: string } | undefined;
    if (media?.caption) return media.caption;
  }
  return null;
}

function saveMessage(
  info: MessageInfo,
  message: Record<string, unknown>,
  source: "history" | "live",
): void {
  upsertMessage.run({
    chat: info.chat,
    id: info.id,
    sender: info.sender,
    fromMe: info.isFromMe ? 1 : 0,
    timestamp: info.timestamp,
    pushName: info.pushName,
    text: extractText(message),
    raw: JSON.stringify(message),
    source,
  });
}

// One transaction per chunk: much faster than one commit per message
const saveChunk = db.transaction((conversations: HistorySyncConversation[]) => {
  let count = 0;
  for (const conv of conversations) {
    upsertChat.run({ id: conv.id, name: conv.name, unreadCount: conv.unreadCount });
    for (const { info, message } of conv.messages) {
      saveMessage(info, message, "history");
      count++;
    }
  }
  return count;
});

// Past messages: pushed after pairing, and in response to on-demand requests
client.on("history_sync", ({ type, chunkOrder, progress, conversations }) => {
  const count = saveChunk(conversations);
  console.log(
    `[history] ${type} chunk #${chunkOrder}: ${conversations.length} chats, ` +
      `${count} messages (progress ${progress}%)`,
  );
});

// New messages: archive them into the same table
client.on("message", ({ info, message }) => {
  saveMessage(info, message, "live");
});

// Ask the primary phone for older messages in one chat
const oldestInChat = db.prepare(`
  SELECT id, chat, sender, from_me, timestamp
  FROM messages WHERE chat = ?
  ORDER BY timestamp ASC LIMIT 1
`);

async function requestOlderMessages(chat: string, count = 50): Promise<void> {
  const row = oldestInChat.get(chat) as
    | { id: string; chat: string; sender: string; from_me: number; timestamp: number }
    | undefined;
  if (!row) {
    console.log(`No archived messages for ${chat} yet`);
    return;
  }

  const oldest: MessageInfo = {
    id: row.id,
    chat: row.chat,
    sender: row.sender,
    isFromMe: row.from_me === 1,
    isGroup: row.chat.endsWith("@g.us"),
    timestamp: row.timestamp,
    pushName: "",
  };

  const request = await client.buildHistorySyncRequest(oldest, count);
  await client.sendPeerMessage(request);
  // The answer arrives later as a history_sync event with type "ON_DEMAND"
}

// Pair from THIS process: the initial history is only pushed right after pairing
client.on("qr", ({ code }) => {
  qrcode.generate(code, { small: true });
});

async function main() {
  const { jid } = await client.init();
  if (jid) {
    console.log(`Resuming session for ${jid}`);
  } else {
    console.log("No session found — scan the QR code to pair");
    await client.getQRChannel();
  }
  await client.connect();
  console.log("Archiving messages to archive.db...");

  process.on("SIGINT", async () => {
    await client.disconnect();
    client.close();
    db.close();
    process.exit(0);
  });

  // Example: backfill a chat passed on the command line (needs a logged-in session)
  const backfillChat = process.argv[2];
  if (backfillChat && (await client.waitForConnection())) {
    await requestOlderMessages(backfillChat);
  }
}

main().catch(console.error);
```

Run it with `npx tsx archive.ts`. To backfill one chat, pass its JID: `npx tsx archive.ts 5989XXXXXXXX@s.whatsapp.net`.

Then query the archive with any SQLite tool:

```sql
SELECT datetime(timestamp, 'unixepoch') AS sent, push_name, text
FROM messages
WHERE chat = '5989XXXXXXXX@s.whatsapp.net'
ORDER BY timestamp;
```

## Common Pitfalls

:::warning History is only sent once, when you pair
The initial history sync happens only right after pairing. Run the archiver during pairing (Step 6). If you missed it, unlink the device, delete the session store, and pair again. On-demand requests can backfill specific chats later, but they need your phone to be online.
:::

:::warning LID JIDs
Chat and sender IDs may be LIDs (`123456789@lid`) instead of phone-number JIDs (`5989...@s.whatsapp.net`), especially in history sync data and groups. The same person can appear under both forms. Store IDs as you receive them and don't assume every JID contains a phone number. This also means the same chat can end up under two `chat` values in the archive, so deduplication and `requestOlderMessages()` only work within one form. See [JIDs, LIDs & Device IDs](whatsapp-jids-and-lids) for details.
:::

:::warning Large initial syncs
Accounts with years of chats can produce hundreds of chunks. Use one transaction per chunk, avoid slow work (like downloading media) inside the `history_sync` handler, and don't treat the first chunk as the complete history. `progress` is 0 for sync types that don't report it, so use it only for display.
:::

:::warning Media is not downloaded
The archive stores the media message metadata (in `raw`), not the files. Media links from old messages often have expired. To keep files from new messages, download them when they arrive ([How to Download Media](download-media)).
:::

:::warning Field naming
The `message` object uses proto JSON names, like `stanzaID`, `mentionedJID`, and `fileSHA256` (not `stanzaId`). See [Troubleshooting](/docs/troubleshooting/common-issues#proto-field-naming).
:::

:::danger Store responsibly
A chat archive contains other people's private messages. Protect the database file with disk encryption and restricted file permissions, don't commit it to git, only archive accounts you are authorized to archive, and follow the privacy laws that apply to you (GDPR, LGPD, etc.), including deletion requests.
:::

<RelatedGuides slugs={["download-media", "build-a-bot", "pair-whatsapp", "forward-messages", "whatsapp-jids-and-lids"]} />
