---
title: Groups & Communities
sidebar_position: 5
description: "Create and manage WhatsApp groups programmatically — list members, change settings, manage participants, and generate invite links."
keywords: [whatsapp group api nodejs, create whatsapp group programmatically, whatsapp group invite link api, whatsapp group management typescript]
---

# Groups & Communities

Creating, configuring, and managing WhatsApp groups.

## List Joined Groups

```typescript
const groups = await client.getJoinedGroups();

for (const g of groups) {
  const adminCount = g.participants.filter((p) => p.isAdmin).length;
  console.log(`${g.name} — ${g.participants.length} members (${adminCount} admins)`);
  console.log(`  Announce-only: ${g.announce} | Locked: ${g.locked}`);
}
```

## Get Group Details

```typescript
const info = await client.getGroupInfo(groupJid);
console.log(`Description: ${info.description ?? "(none)"}`);
console.log(`Owner: ${info.owner ?? "(unknown)"}`);

for (const p of info.participants) {
  const role = p.isSuperAdmin ? "super-admin" : p.isAdmin ? "admin" : "member";
  console.log(`  ${p.jid} [${role}]`);
}
```

## Listen for Group Events

```typescript
client.on("group:info", (event) => {
  if (event.name) console.log(`Name changed to: ${event.name}`);
  if (event.join) console.log(`Joined: ${event.join.join(", ")}`);
  if (event.leave) console.log(`Left: ${event.leave.join(", ")}`);
  if (event.promote) console.log(`Promoted: ${event.promote.join(", ")}`);
  if (event.demote) console.log(`Demoted: ${event.demote.join(", ")}`);
});

client.on("group:joined", ({ jid, name }) => {
  console.log(`Joined group: ${name} (${jid})`);
});
```

## Create & Configure Groups

```typescript
// Create a group with initial members
const newGroup = await client.createGroup("My Group", [
  "5989XXXXXXXX@s.whatsapp.net",
  "5989YYYYYYYY@s.whatsapp.net",
]);

// Update settings
await client.setGroupName(groupJid, "New Group Name");
await client.setGroupDescription(groupJid, "Updated description");
await client.setGroupAnnounce(groupJid, true);  // Only admins can send
await client.setGroupLocked(groupJid, true);     // Only admins can edit info
```

## Manage Participants

```typescript
const memberJid = "5989XXXXXXXX@s.whatsapp.net";

await client.updateGroupParticipants(groupJid, [memberJid], "add");
await client.updateGroupParticipants(groupJid, [memberJid], "promote");
await client.updateGroupParticipants(groupJid, [memberJid], "demote");
await client.updateGroupParticipants(groupJid, [memberJid], "remove");
```

## Invite Links

```typescript
// Get the current invite link
const link = await client.getGroupInviteLink(groupJid);

// Reset invite link (invalidates the old one)
const newLink = await client.getGroupInviteLink(groupJid, true);
```

## Leave a Group

```typescript
await client.leaveGroup(groupJid);
```

:::info
The example runs in read-only mode by default, listing your groups and showing details. Uncomment the write operations in the source to test group creation and management.
:::

[Full source: `groups.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/groups.ts)
