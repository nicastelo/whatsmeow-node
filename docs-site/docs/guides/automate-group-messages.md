---
title: "How to Automate Group Messages in WhatsApp"
sidebar_label: Automate Group Messages
sidebar_position: 12
description: "Automate WhatsApp group messaging with Node.js — send to groups, mention members, create groups, manage participants, and broadcast to multiple groups."
keywords: [automate whatsapp group messages, whatsapp group bot nodejs, send group message whatsapp api, whatsapp bulk group message, whatsapp group automation typescript]
---

import Head from '@docusaurus/Head';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/automate-group-messages.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/automate-group-messages.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Automate Group Messages in WhatsApp",
      "description": "Automate WhatsApp group messaging with Node.js — send to groups, mention members, create groups, manage participants, and broadcast to multiple groups.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/automate-group-messages.png",
      "step": [
        {"@type": "HowToStep", "name": "List Your Groups", "text": "Use getJoinedGroups() to discover all groups you're a member of, with participant lists and settings."},
        {"@type": "HowToStep", "name": "Send Messages to Groups", "text": "Use sendMessage() with a group JID (ending in @g.us) to send text messages to any group."},
        {"@type": "HowToStep", "name": "Mention Group Members", "text": "Include mentionedJid in contextInfo with extendedTextMessage to @mention specific members or everyone."},
        {"@type": "HowToStep", "name": "Listen for Group Events", "text": "Handle group:info events to react to joins, leaves, promotions, and setting changes."},
        {"@type": "HowToStep", "name": "Broadcast to Multiple Groups", "text": "Iterate over groups with a delay between sends to avoid rate limiting."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Automate Group Messages in WhatsApp",
      "description": "Automate WhatsApp group messaging with Node.js — send to groups, mention members, create groups, manage participants, and broadcast to multiple groups.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/automate-group-messages.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/automate-group-messages.png"}}
    })}
  </script>
</Head>

![How to Automate Group Messages in WhatsApp](/img/guides/automate-group-messages.png)
![How to Automate Group Messages in WhatsApp](/img/guides/automate-group-messages-light.png)

# How to Automate Group Messages in WhatsApp

whatsmeow-node gives you full control over WhatsApp groups — send messages, mention members, create groups, manage participants, and broadcast to multiple groups. This guide covers the most common group automation tasks.

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))
- Membership in the groups you want to message (you can't send to groups you haven't joined)

## List Your Groups

Start by discovering which groups you're in:

```typescript
const groups = await client.getJoinedGroups();

for (const g of groups) {
  console.log(`${g.name} (${g.jid}) — ${g.participants.length} members`);
}
```

Each group has a JID ending in `@g.us` — this is what you pass to `sendMessage()`.

## Send a Message to a Group

Sending to a group works the same as sending to an individual — just use the group JID:

```typescript
const groupJid = "120363XXXXX@g.us";
await client.sendMessage(groupJid, { conversation: "Hello group!" });
```

## Mention Group Members

### Mention specific members

Include the JIDs in `mentionedJid` and use `@<number>` in the text body:

```typescript
const memberJid = "5512345678@s.whatsapp.net";

await client.sendRawMessage(groupJid, {
  extendedTextMessage: {
    text: `Hey @${memberJid.split("@")[0]}, check this out!`,
    contextInfo: {
      mentionedJid: [memberJid],
    },
  },
});
```

### Mention everyone

Fetch the group participants and build a mention list:

```typescript
const group = await client.getGroupInfo(groupJid);
const jids = group.participants.map((p) => p.jid);
const mentions = jids.map((j) => `@${j.split("@")[0]}`).join(" ");

await client.sendRawMessage(groupJid, {
  extendedTextMessage: {
    text: `Attention everyone: ${mentions}`,
    contextInfo: { mentionedJid: jids },
  },
});
```

## Listen for Group Events

React to changes in your groups:

```typescript
// Member changes and setting updates
client.on("group:info", (event) => {
  if (event.join) {
    console.log(`New members in ${event.jid}: ${event.join.join(", ")}`);
    // Welcome new members
    for (const newMember of event.join) {
      client.sendRawMessage(event.jid, {
        extendedTextMessage: {
          text: `Welcome @${newMember.split("@")[0]}!`,
          contextInfo: { mentionedJid: [newMember] },
        },
      });
    }
  }

  if (event.leave) {
    console.log(`Left ${event.jid}: ${event.leave.join(", ")}`);
  }

  if (event.name) {
    console.log(`Group renamed to: ${event.name}`);
  }
});

// When you're added to a new group
client.on("group:joined", ({ jid, name }) => {
  console.log(`Joined group: ${name} (${jid})`);
});
```

## Respond to Group Messages

Handle messages differently based on whether they're from a group:

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;
  if (!info.isGroup) return; // Only handle group messages

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  // In groups, info.chat is the group JID, info.sender is the person
  console.log(`[${info.chat}] ${info.pushName}: ${text}`);

  if (text === "!members") {
    const group = await client.getGroupInfo(info.chat);
    const list = group.participants
      .map((p) => `- ${p.jid}${p.isAdmin ? " (admin)" : ""}`)
      .join("\n");
    await client.sendMessage(info.chat, {
      conversation: `Members:\n${list}`,
    });
  }
});
```

## Broadcast to Multiple Groups

Send the same message to several groups with a delay to avoid rate limiting:

```typescript
const groups = await client.getJoinedGroups();
const targetGroups = groups.filter((g) => g.name.startsWith("Team "));

for (const group of targetGroups) {
  await client.sendMessage(group.jid, {
    conversation: "Weekly reminder: standup at 9 AM tomorrow",
  });

  // Wait between sends to avoid rate limiting
  await new Promise((r) => setTimeout(r, 2000));
}

console.log(`Sent to ${targetGroups.length} groups`);
```

:::warning Rate limiting
WhatsApp rate-limits sending, especially in bulk. Space messages 1-3 seconds apart. Sending too fast can get your account temporarily restricted. See [Rate Limiting](/docs/rate-limiting).
:::

## Create and Configure Groups

### Create a group

```typescript
const newGroup = await client.createGroup("Project Alpha", [
  "5512345678@s.whatsapp.net",
  "5598765432@s.whatsapp.net",
]);

console.log(`Created group: ${newGroup.name} (${newGroup.jid})`);
```

### Configure settings

```typescript
await client.setGroupDescription(groupJid, "Discussion for Project Alpha");
await client.setGroupAnnounce(groupJid, true);  // Only admins can send
await client.setGroupLocked(groupJid, true);     // Only admins can edit info
```

### Manage participants

```typescript
// Add members
await client.updateGroupParticipants(groupJid, [newMemberJid], "add");

// Promote to admin
await client.updateGroupParticipants(groupJid, [memberJid], "promote");

// Remove a member
await client.updateGroupParticipants(groupJid, [memberJid], "remove");
```

### Share an invite link

```typescript
const link = await client.getGroupInviteLink(groupJid);
console.log(`Invite link: ${link}`);

// Reset the link (invalidates the old one)
const newLink = await client.getGroupInviteLink(groupJid, true);
```

## Complete Example

A group management bot that handles commands and welcomes new members:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("error", (err) => console.error("Error:", err));

// Welcome new members
client.on("group:info", async (event) => {
  if (!event.join) return;

  for (const jid of event.join) {
    await client.sendRawMessage(event.jid, {
      extendedTextMessage: {
        text: `Welcome @${jid.split("@")[0]}! Type !help for available commands.`,
        contextInfo: { mentionedJid: [jid] },
      },
    });
  }
});

// Handle group commands
client.on("message", async ({ info, message }) => {
  if (info.isFromMe || !info.isGroup) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text?.startsWith("!")) return;

  await client.markRead([info.id], info.chat, info.sender);
  const command = text.toLowerCase().trim();

  if (command === "!help") {
    await client.sendMessage(info.chat, {
      conversation: "Commands:\n!help — show this message\n!members — list members\n!invite — get invite link",
    });
  }

  if (command === "!members") {
    const group = await client.getGroupInfo(info.chat);
    const list = group.participants
      .map((p) => {
        const role = p.isSuperAdmin ? "owner" : p.isAdmin ? "admin" : "member";
        return `- @${p.jid.split("@")[0]} (${role})`;
      })
      .join("\n");

    await client.sendRawMessage(info.chat, {
      extendedTextMessage: {
        text: `Members (${group.participants.length}):\n${list}`,
        contextInfo: {
          mentionedJid: group.participants.map((p) => p.jid),
        },
      },
    });
  }

  if (command === "!invite") {
    const link = await client.getGroupInviteLink(info.chat);
    await client.sendMessage(info.chat, { conversation: link });
  }
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! See: How to Pair WhatsApp");
    process.exit(1);
  }

  await client.connect();
  await client.sendPresence("available");
  console.log("Group bot is online!");

  process.on("SIGINT", async () => {
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Common Pitfalls

:::warning Send to `info.chat`, not `info.sender`
In groups, `info.chat` is the group JID and `info.sender` is the individual. Always reply to `info.chat` — sending to `info.sender` starts a private conversation.
:::

:::warning Announce-only groups
If a group has `announce: true`, only admins can send messages. Your bot must be an admin to message in those groups.
:::

:::warning Rate limiting on broadcasts
Sending the same message to many groups too quickly will trigger WhatsApp's rate limiter. Always add a delay (1-3 seconds) between sends. See [Rate Limiting](/docs/rate-limiting).
:::

:::warning Group admin operations
`updateGroupParticipants` with `"promote"`, `"demote"`, or `"remove"` requires your bot to be a group admin. `"add"` may also require admin permissions depending on the group's settings.
:::

## Next Steps

- [How to Build a Bot](build-a-bot) — full bot with command handling
- [How to Send WhatsApp Messages from TypeScript](send-messages-typescript) — all message types
- [Groups & Communities Examples](/docs/examples/groups-and-communities) — more group code samples
- [Rate Limiting](/docs/rate-limiting) — avoid getting throttled
