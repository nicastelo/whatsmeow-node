---
title: "Understanding WhatsApp JIDs, LIDs and Device IDs"
sidebar_label: JIDs, LIDs & Device IDs
sidebar_position: 26
description: "What WhatsApp JIDs, LIDs and device suffixes are, why info.sender can end in @lid, and how to normalize, compare and build JIDs safely in whatsmeow-node."
keywords: [whatsapp jid, whatsapp lid, whatsapp @lid, s.whatsapp.net jid, whatsapp device id jid, whatsmeow jid, whatsapp jid phone number, normalize whatsapp jid]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/whatsapp-jids-and-lids.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/whatsapp-jids-and-lids.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Understanding WhatsApp JIDs, LIDs and Device IDs",
      "description": "What WhatsApp JIDs, LIDs and device suffixes are, why info.sender can end in @lid, and how to normalize, compare and build JIDs safely in whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/whatsapp-jids-and-lids.png",
      "step": [
        {"@type": "HowToStep", "name": "Read the JID Anatomy", "text": "A JID is user@server. The server tells you what it is: s.whatsapp.net for phone numbers, lid for hidden identities, g.us for groups, newsletter for channels, broadcast for status and broadcast lists."},
        {"@type": "HowToStep", "name": "Strip Device Suffixes", "text": "Sender JIDs can carry a device part (user:12@s.whatsapp.net). Normalize with a toUserJid() helper before storing or comparing."},
        {"@type": "HowToStep", "name": "Handle LIDs", "text": "info.sender and info.chat can be @lid JIDs that contain no phone number. Treat them as opaque IDs and reply to info.chat."},
        {"@type": "HowToStep", "name": "Compare JIDs Safely", "text": "Compare normalized JIDs, never raw strings, and never assume a LID and a phone-number JID belong to different people."},
        {"@type": "HowToStep", "name": "Build JIDs from Phone Numbers", "text": "Strip non-digits from an international number and append @s.whatsapp.net, or resolve with isOnWhatsApp() to get the canonical JID."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Understanding WhatsApp JIDs, LIDs and Device IDs",
      "description": "What WhatsApp JIDs, LIDs and device suffixes are, why info.sender can end in @lid, and how to normalize, compare and build JIDs safely in whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/whatsapp-jids-and-lids.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Understanding WhatsApp JIDs, LIDs and Device IDs](/img/guides/whatsapp-jids-and-lids.png)
![Understanding WhatsApp JIDs, LIDs and Device IDs](/img/guides/whatsapp-jids-and-lids-light.png)

# Understanding WhatsApp JIDs, LIDs and Device IDs

Every chat, user, group and channel in WhatsApp is addressed by a **JID** (Jabber ID) — a string like `5989...@s.whatsapp.net`. whatsmeow-node passes JIDs around as plain strings (`type JID = string`), so it's easy to treat them as phone numbers. That works until a message arrives from `12345678901234@lid` or `5989...:12@s.whatsapp.net`. This guide explains what those forms mean and gives you small helpers to handle them correctly.

## Prerequisites

- whatsmeow-node installed ([Installation guide](/docs/installation))
- A paired session ([How to Pair WhatsApp](pair-whatsapp))

## JID Anatomy

A JID has up to four parts. whatsmeow formats them like this:

```
<user>@<server>                     5989XXXXXXX@s.whatsapp.net
<user>:<device>@<server>            5989XXXXXXX:12@s.whatsapp.net
<user>.<agent>:<device>@<server>    5989XXXXXXX.1:12@s.whatsapp.net   (rare)
<server>                            s.whatsapp.net                    (server-only JID)
```

The **server** tells you what kind of entity the JID is:

| Server | Example | What it is |
|---|---|---|
| `s.whatsapp.net` | `5989XXXXXXX@s.whatsapp.net` | A user, addressed by phone number (digits only, no `+`) |
| `lid` | `123456789012345@lid` | A user, addressed by a hidden **LID** (no phone number inside) |
| `g.us` | `120363XXXXXXXXXXXX@g.us` | A group |
| `newsletter` | `120363XXXXXXXXXXXX@newsletter` | A channel (newsletter) |
| `broadcast` | `status@broadcast` | Status updates. Any other `@broadcast` user is a broadcast list |
| `c.us` | `5989XXXXXXX@c.us` | Legacy user server. whatsmeow uses it internally for phone lookups; you'll rarely see it in events |
| `bot` | `867051314767696@bot` | Meta AI and other bots |
| `hosted`, `hosted.lid` | — | Cloud API (hosted) business accounts. `hosted.lid` is the LID form |

whatsmeow defines a few more servers (`msgr`, `interop`) for cross-app messaging. You can treat them as "other".

## Device Suffixes

A WhatsApp account can have up to four linked devices in addition to the phone. Each device has a number: `0` is the primary phone, and linked devices (WhatsApp Web, Desktop, your whatsmeow-node session) get higher numbers. When a JID refers to one specific device, the device number is written after a colon:

```
5989XXXXXXX@s.whatsapp.net      → the user (as a sender: their primary phone, device 0)
5989XXXXXXX:12@s.whatsapp.net   → device #12 of that user
```

You'll see device JIDs in two common places:

- **`init()` and the `connected` event** return your own JID *with* your session's device number, e.g. `5989XXXXXXX:12@s.whatsapp.net`.
- **`info.sender`** on incoming messages includes the device the message was sent from. The same person can show up as `...:3` (a linked device) or with no suffix (device 0, the primary phone), depending on which device they used.

whatsmeow also understands an **agent** part (`user.<agent>:<device>@server`). It only appears in normal output when the agent is non-zero, which you'll almost never see. You may still meet the explicit `user.0:N@server` form if you exchange JIDs with other tools or libraries. The helper below parses both.

`info.chat` never has a device suffix in private chats, so it's always safe to send to.

## What Are LIDs?

A **LID** (Linked Identity) is an opaque, per-account number that WhatsApp uses to identify a user *without* revealing their phone number. WhatsApp is moving more and more traffic to LID addressing. It started with large groups and communities, and it now also appears in private chats.

For you, this means:

- In groups, `info.sender` may be `123456789012345@lid` instead of a phone-number JID. This happens even for people in your contacts.
- In private chats, `info.chat` and `info.sender` may both be `@lid`.
- `getGroupInfo()` may return participants whose `jid` ends in `@lid`.
- `isOnWhatsApp()` may return a `@lid` JID as the canonical `jid` for a phone number.
- The **same person** can appear as `5989XXXXXXX@s.whatsapp.net` in one place and `123456789012345@lid` in another. The two strings share nothing.

The digits in a LID are **not** a phone number. Don't show them to users as one, and don't pass them to a CRM's phone field.

### Does whatsmeow-node expose the phone number ↔ LID mapping? {#lid-mapping}

**No, not today.** whatsmeow (the Go library) tracks the mapping internally. It records `SenderAlt` / `RecipientAlt` and the `AddressingMode` on each message, `PhoneNumber` / `LID` on group participants, and it keeps a LID map in its store. whatsmeow-node doesn't serialize any of that. What reaches TypeScript is:

| API | JID fields you get |
|---|---|
| `message` event → `info` | `chat`, `sender`, `pushName` (no alternate JID, no addressing mode) |
| `getGroupInfo()` → `participants[]` | `jid`, `isAdmin`, `isSuperAdmin` (no separate phone/LID) |
| `isOnWhatsApp()` | `query`, `isIn`, `jid` (the canonical JID, possibly `@lid`) |

In practice:

1. **Key your data by whatever JID you receive**, normalized with `toUserJid()`. Don't assume you can always get from one form to the other.
2. **Reply to `info.chat`**, which always works whatever the addressing mode. WhatsApp routes LID and phone-number JIDs correctly. The exception is `status@broadcast` and broadcast lists: skip those, because replying there posts a status or broadcasts.
3. **When you need a phone number**, use `phoneFromJid()` (below), which only returns one for phone-number JIDs. For `@lid` senders, fall back to `info.pushName` or ask the user.
4. **When you start from a phone number**, build the JID with `phoneToJid()`, or resolve it with `isOnWhatsApp()` and store the JID it returns.

:::note
whatsmeow persists its LID map in the session database (`whatsmeow_lid_map` table, columns `lid` and `pn`, both stored as the user part only). It's an internal schema that can change in any whatsmeow upgrade, so read it at your own risk. Never write to it.
:::

## The Helpers

Put these in a `jid.ts` file. They're pure string functions with no dependencies:

```typescript
import type { JID } from "@whatsmeow-node/whatsmeow-node";

export interface ParsedJID {
  user: string;   // phone number, LID, group ID, ...
  agent: number;  // almost always 0
  device: number; // 0 = primary phone, >0 = linked/companion device
  server: string; // "s.whatsapp.net", "lid", "g.us", ...
}

export function parseJID(jid: JID): ParsedJID {
  const at = jid.indexOf("@");
  if (at === -1) return { user: "", agent: 0, device: 0, server: jid };

  const server = jid.slice(at + 1);
  let user = jid.slice(0, at);
  let agent = 0;
  let device = 0;

  const colon = user.indexOf(":");
  if (colon !== -1) {
    device = Number(user.slice(colon + 1));
    user = user.slice(0, colon);
  }
  const dot = user.indexOf(".");
  if (dot !== -1) {
    agent = Number(user.slice(dot + 1));
    user = user.slice(0, dot);
  }
  return { user, agent, device, server };
}

/** Strip the agent/device part: "5989...:12@s.whatsapp.net" → "5989...@s.whatsapp.net" */
export function toUserJid(jid: JID): JID {
  const { user, server } = parseJID(jid);
  return user ? `${user}@${server}` : server;
}

export type JIDKind = "pn" | "lid" | "group" | "newsletter" | "status" | "broadcast" | "bot" | "other";

export function jidKind(jid: JID): JIDKind {
  const { user, server } = parseJID(jid);
  switch (server) {
    case "s.whatsapp.net":
    case "c.us":
    case "hosted":
      return "pn";
    case "lid":
    case "hosted.lid":
      return "lid";
    case "g.us":
      return "group";
    case "newsletter":
      return "newsletter";
    case "broadcast":
      return user === "status" ? "status" : "broadcast";
    case "bot":
      return "bot";
    default:
      return "other";
  }
}
```

`toUserJid()` does the same thing as whatsmeow's `JID.ToNonAD()`:

| Input | `toUserJid()` |
|---|---|
| `5989XXXXXXX@s.whatsapp.net` | `5989XXXXXXX@s.whatsapp.net` |
| `5989XXXXXXX:12@s.whatsapp.net` | `5989XXXXXXX@s.whatsapp.net` |
| `5989XXXXXXX.0:12@s.whatsapp.net` | `5989XXXXXXX@s.whatsapp.net` |
| `123456789012345:3@lid` | `123456789012345@lid` |
| `120363XXXXXXXXXXXX@g.us` | `120363XXXXXXXXXXXX@g.us` |
| `status@broadcast` | `status@broadcast` |

## Compare JIDs Safely

Never compare raw sender strings. Normalize both sides first:

```typescript
export function sameUser(a: JID, b: JID): boolean {
  return toUserJid(a) === toUserJid(b);
}
```

For allow-lists and lookups, normalize once when you build the set and again on every lookup:

```typescript
const ADMINS = new Set(["59899111222@s.whatsapp.net"].map(toUserJid));

client.on("message", async ({ info }) => {
  if (!ADMINS.has(toUserJid(info.sender))) return;
  // ...
});
```

Checking whether you're in a group works the same way, because `init()` returns your JID with a device suffix:

```typescript
const { jid } = await client.init();
if (!jid) throw new Error("Not paired");
const me = toUserJid(jid);

const group = await client.getGroupInfo("120363XXXXX@g.us");
const isMember = group.participants.some((p) => sameUser(p.jid, me));
```

:::warning Normalizing doesn't bridge LIDs
`sameUser("5989XXXXXXX@s.whatsapp.net", "123456789012345@lid")` returns `false` even if both belong to the same person, and whatsmeow-node can't tell you otherwise (see [above](#lid-mapping)). If an allow-list must work in LID-addressed groups, record the `@lid` JID the first time you see that user, or match on something else.
:::

## Build JIDs from Phone Numbers

A phone-number JID is the number in international format, **digits only** (no `+`, spaces or dashes), followed by `@s.whatsapp.net`:

```typescript
/**
 * Build a user JID from an international phone number ("+598 99 111 222").
 * Formatting characters are stripped; national formats and 00 prefixes are not handled.
 */
export function phoneToJid(phone: string): JID {
  const digits = phone.replace(/\D/g, "");
  if (!digits) throw new Error(`Not a phone number: ${phone}`);
  return `${digits}@s.whatsapp.net`;
}

phoneToJid("+598 99 111 222"); // "59899111222@s.whatsapp.net"
```

This doesn't check that the number is on WhatsApp. To check and get the canonical JID in one step, use `isOnWhatsApp()`. whatsmeow expects numbers in international format **with** the `+` prefix:

```typescript
import type { JID, WhatsmeowClient } from "@whatsmeow-node/whatsmeow-node";

export async function resolvePhone(client: WhatsmeowClient, phone: string): Promise<JID | null> {
  const digits = phone.replace(/\D/g, "");
  const [result] = await client.isOnWhatsApp([`+${digits}`]);
  return result?.isIn && result.jid ? result.jid : null;
}

const target = await resolvePhone(client, "+598 99 111 222");
if (target) await client.sendMessage(target, { conversation: "Hi!" });
```

Numbers that aren't registered are either left out of the result (so `result` is `undefined`) or returned with `isIn: false`. The check above handles both. The returned `jid` may be a `@lid` JID. Both forms can be sent to.

## Get a Phone Number from a JID

Only phone-number JIDs contain a phone number. Return `null` for everything else so you can't accidentally use a LID or group ID as a phone number:

```typescript
/** Return the phone number (digits only) or null if the JID doesn't contain one. */
export function phoneFromJid(jid: JID): string | null {
  if (jidKind(jid) !== "pn") return null;
  const { user } = parseJID(jid);
  return /^[1-9]\d{5,}$/.test(user) ? user : null;
}

phoneFromJid("59899111222:12@s.whatsapp.net"); // "59899111222"
phoneFromJid("123456789012345@lid");            // null
phoneFromJid("120363XXXXX@g.us");               // null
```

## Complete Example

A bot that normalizes every sender and answers two commands: `!whoami` shows what it can tell about you, and `!admin` checks a phone-number allow-list. It imports the helpers from `jid.ts` above:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import type { JID } from "@whatsmeow-node/whatsmeow-node";
import { toUserJid, jidKind, phoneFromJid, parseJID } from "./jid.js";

const client = createClient({ store: "session.db" });

// Admins listed by phone number, normalized once at startup
const ADMINS = new Set(["59899111222@s.whatsapp.net"].map(toUserJid));

// Remember the last display name seen for each normalized sender
const seen = new Map<JID, string>();

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;
  // Never reply to status updates or broadcast lists: that would post a status
  const chatKind = jidKind(info.chat);
  if (chatKind === "status" || chatKind === "broadcast") return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  const sender = toUserJid(info.sender);
  seen.set(sender, info.pushName);

  if (text === "!whoami") {
    const { device } = parseJID(info.sender);
    const phone = phoneFromJid(sender);
    const lines = [
      `Chat: ${info.chat} (${jidKind(info.chat)})`,
      `Sender: ${sender} (${jidKind(sender)})`,
      `Device: ${device === 0 ? "primary phone" : `linked device #${device}`}`,
      phone ? `Phone: +${phone}` : "Phone: hidden (LID)",
    ];
    await client.sendMessage(info.chat, { conversation: lines.join("\n") });
    return;
  }

  if (text === "!admin") {
    const reply = ADMINS.has(sender) ? "You are an admin." : "You are not an admin.";
    await client.sendMessage(info.chat, { conversation: reply });
  }
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired — run the pairing flow first");
    process.exit(1);
  }
  console.log(`Logged in as ${toUserJid(jid)} (device ${parseJID(jid).device})`);
  await client.connect();

  process.on("SIGINT", async () => {
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Common Pitfalls

:::warning Parsing phone numbers out of sender JIDs
`jid.split("@")[0]` is only a phone number for `@s.whatsapp.net` JIDs *without* a device suffix. For `5989...:12@s.whatsapp.net` you get `"5989...:12"`, and for `@lid` you get a LID that looks like a phone number but isn't one. The [Chatwoot guide](integrate-chatwoot) uses this shortcut to fill `phone_number`. That works for simple private chats, but in production use `phoneFromJid()` and fall back to `pushName` when it returns `null`.
:::

:::warning Exact-string matching of senders or chats
`info.sender === "5989...@s.whatsapp.net"` fails as soon as the message comes from a linked device (`:3`) or through LID addressing. The relay bot in [Forward Messages](forward-messages) matches `info.chat` against a hard-coded JID. That's fine for groups (`@g.us` never changes), but a private chat can arrive as `@lid`. Normalize with `toUserJid()` and log the JIDs you actually receive before you hard-code them.
:::

:::warning Replying to a device JID
Sending to a JID with a device part fails with `message recipient must be a user JID with no device part`. This bites when you reply to `info.sender` or message your own `init()` JID. Reply to `info.chat`, or pass the JID through `toUserJid()` first.
:::

:::warning Replying to the sender instead of the chat
In groups, `info.sender` is the person and `info.chat` is the group. Sending to `info.sender` (even normalized) starts a private conversation. Use `info.chat` unless you really mean to DM them.
:::

:::warning Showing LIDs as phone numbers
LIDs are long numeric strings, so they end up in UIs and CRMs as fake phone numbers like `+123456789012345`. Check `jidKind()` before you display or store anything as a phone number.
:::

<RelatedGuides slugs={["build-a-bot", "automate-group-messages", "forward-messages", "integrate-chatwoot"]} />
