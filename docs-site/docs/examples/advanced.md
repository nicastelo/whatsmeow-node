---
title: Advanced Examples
sidebar_label: Advanced
sidebar_position: 7
description: "Create WhatsApp polls, manage newsletter channels, send locations and contact cards, and look up users with Node.js and TypeScript."
keywords: [whatsapp poll api nodejs, whatsapp newsletter channel api, whatsapp location message api, whatsapp contact card vcard nodejs]
---

# Advanced

Polls, newsletters (channels), location sharing, contact cards, contact lookup, business profiles, and bots.

## Polls

Create polls and decrypt incoming poll votes.

### Create a poll

```typescript
// sendPollCreation(jid, question, options, selectableCount)
//   selectableCount: 0 = unlimited, 1 = single choice, N = multi-choice up to N
const poll = await client.sendPollCreation(
  jid,
  "What's your favorite programming language?",
  ["TypeScript", "Go", "Rust", "Python"],
  1, // single choice
);
console.log(`Poll created (id: ${poll.id})`);
```

### Decrypt poll votes

Poll votes are end-to-end encrypted. Use `decryptPollVote()` to see the selected options:

```typescript
client.on("message", async ({ info, message }) => {
  const pollUpdate = message.pollUpdateMessage;
  if (!pollUpdate) return;

  // info is typed as MessageInfo; the decrypt helpers take a plain record
  const decrypted = await client.decryptPollVote(
    info as unknown as Record<string, unknown>,
    message,
  );
  console.log("Vote:", JSON.stringify(decrypted, null, 2));
});
```

### Vote on a poll

```typescript
// pollInfo is the `info` of the received poll message; options are matched by name
await client.sendPollVote(pollInfo.chat, pollInfo.sender, pollInfo.id, pollInfo.timestamp, ["Go"]);
```

[Full source: `polls.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/polls.ts)

---

## Newsletters (Channels)

Manage WhatsApp Channels — subscribe, fetch messages, react, and create.

### List subscribed channels

```typescript
const newsletters = await client.getSubscribedNewsletters();
for (const nl of newsletters) {
  console.log(`${nl.name} (${nl.id})`);
}
```

### Get channel info & messages

```typescript
const info = await client.getNewsletterInfo(channelJid);
console.log(`State: ${info.state}, Role: ${info.role ?? "subscriber"}`);

const messages = await client.getNewsletterMessages(channelJid, 5);
for (const msg of messages) {
  console.log(`[${msg.viewsCount} views] ${msg.message?.conversation}`);
}
```

### Channel operations

```typescript
// Create a channel
const channel = await client.createNewsletter("My Channel", "Description");

// Follow / unfollow
await client.followNewsletter(channelJid);
await client.unfollowNewsletter(channelJid);

// Mute / unmute notifications
await client.newsletterToggleMute(channelJid, true);

// React to a channel message
const msgId = await client.generateMessageID();
await client.newsletterSendReaction(channelJid, serverId, "🔥", msgId);

// Subscribe to live updates
await client.newsletterSubscribeLiveUpdates(channelJid);
```

[Full source: `newsletters.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/newsletters.ts)

---

## Location & Contact Cards

Send GPS locations and vCard contact cards.

### Send a location

```typescript
await client.sendRawMessage(jid, {
  locationMessage: {
    degreesLatitude: 40.7128,
    degreesLongitude: -74.006,
    name: "New York City",
    address: "Manhattan, NY, USA",
    comment: "Sent from whatsmeow-node",
    // URL: "https://maps.google.com/...",  // optional link (note the uppercase field name)
  },
});
```

### Send a contact card (vCard)

```typescript
const vcard = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:Jane Doe",
  "TEL;TYPE=CELL:+1-555-123-4567",
  "EMAIL:jane@example.com",
  "ORG:Example Corp",
  "END:VCARD",
].join("\n");

await client.sendRawMessage(jid, {
  contactMessage: {
    displayName: "Jane Doe",
    vcard,
  },
});
```

### Send multiple contacts

```typescript
await client.sendRawMessage(jid, {
  contactsArrayMessage: {
    displayName: "Team Contacts",
    contacts: [
      { displayName: "Jane Doe", vcard: "BEGIN:VCARD\n..." },
      { displayName: "John Smith", vcard: "BEGIN:VCARD\n..." },
    ],
  },
});
```

[Full source: `location-and-contact.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/location-and-contact.ts)

---

## Contact Lookup

Check WhatsApp registration, get user info, profile pictures, and linked devices.

### Check WhatsApp registration

```typescript
const results = await client.isOnWhatsApp(["59897756343", "14155551234"]);
for (const r of results) {
  console.log(`${r.query}: ${r.isIn ? `registered → ${r.jid}` : "NOT on WhatsApp"}`);
}
```

### Get user info (batch)

```typescript
// Returns a map of JID → { status, pictureID, verifiedName }
const userInfoMap = await client.getUserInfo(registeredJids);
for (const [jid, info] of Object.entries(userInfoMap)) {
  console.log(`${jid}: ${info.status || "(empty)"}`);
}
```

### Profile pictures & devices

```typescript
// Get full-size profile picture URL
const pic = await client.getProfilePicture(jid);
console.log(`URL: ${pic.url}, ID: ${pic.id}`);

// List all linked devices for users
const devices = await client.getUserDevices(registeredJids);
```

### Business profile

```typescript
const biz = await client.getBusinessProfile(businessJid);
console.log(biz.email, biz.address, biz.categories?.map((c) => c.name));
```

[Full source: `contact-lookup.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/contact-lookup.ts)

---

## Bots

List the AI bots available to your account and fetch their profiles.

```typescript
const bots = await client.getBotListV2();
const profiles = await client.getBotProfiles(bots);
for (const p of profiles) {
  console.log(`${p.name} (${p.jid}): ${p.description}`);
}
```
