---
title: "How to Use whatsmeow-node with Chatwoot"
sidebar_label: Chatwoot Integration
sidebar_position: 23
description: "Connect whatsmeow-node to Chatwoot as a WhatsApp channel — receive and reply to WhatsApp messages from the Chatwoot agent dashboard without the official Cloud API."
keywords: [chatwoot whatsapp, chatwoot whatsmeow, chatwoot whatsapp free, chatwoot whatsapp without cloud api, chatwoot whatsapp integration, chatwoot whatsapp nodejs]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-chatwoot.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-chatwoot.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Use whatsmeow-node with Chatwoot",
      "description": "Connect whatsmeow-node to Chatwoot as a WhatsApp channel — receive and reply to WhatsApp messages from the Chatwoot agent dashboard without the official Cloud API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-chatwoot.png",
      "step": [
        {"@type": "HowToStep", "name": "Create a Chatwoot API Channel", "text": "Set up an API channel in Chatwoot to receive messages via webhook and send via API."},
        {"@type": "HowToStep", "name": "Build the whatsmeow-node Bridge", "text": "Create a service that forwards WhatsApp messages to Chatwoot and Chatwoot replies to WhatsApp."},
        {"@type": "HowToStep", "name": "Forward Messages to Chatwoot", "text": "POST incoming WhatsApp messages to Chatwoot's API as incoming messages on the channel."},
        {"@type": "HowToStep", "name": "Handle Chatwoot Outgoing Webhooks", "text": "Listen for Chatwoot's message_created webhook and send agent replies via whatsmeow-node."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Use whatsmeow-node with Chatwoot",
      "description": "Connect whatsmeow-node to Chatwoot as a WhatsApp channel — receive and reply to WhatsApp messages from the Chatwoot agent dashboard without the official Cloud API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/integrate-chatwoot.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Use whatsmeow-node with Chatwoot](/img/guides/integrate-chatwoot.png)
![How to Use whatsmeow-node with Chatwoot](/img/guides/integrate-chatwoot-light.png)

# How to Use whatsmeow-node with Chatwoot

[Chatwoot](https://www.chatwoot.com) is an open-source customer support platform — like Intercom or Zendesk. Its built-in WhatsApp integration requires the official Cloud API (Meta Business verification, per-message pricing). With whatsmeow-node and Chatwoot's API channel, you can connect WhatsApp for free.

## How It Works

```
WhatsApp User
  ↕
whatsmeow-node Bridge (Express)
  ↕ Chatwoot API
Chatwoot Dashboard (agents reply here)
```

The bridge sits between WhatsApp and Chatwoot:
- **Incoming**: WhatsApp message → whatsmeow-node → Chatwoot API (creates conversation)
- **Outgoing**: Agent replies in Chatwoot → webhook → bridge → whatsmeow-node → WhatsApp

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))
- Chatwoot running (self-hosted or cloud)
- Express: `npm install express`

## Step 1: Create a Chatwoot API Channel

1. In Chatwoot, go to **Settings → Inboxes → Add Inbox**
2. Select **API** as the channel type
3. Name it "WhatsApp" and save
4. Note the **Inbox ID** and generate an **API access token** from Settings → Account Settings

Set these as environment variables:

```bash
CHATWOOT_URL=http://localhost:3001        # Your Chatwoot URL
CHATWOOT_API_TOKEN=your_api_token
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_INBOX_ID=1
```

## Step 2: Configure the Chatwoot Webhook

In Chatwoot, go to **Settings → Integrations → Webhooks**:
- **URL**: `http://localhost:3000/chatwoot/webhook` (your bridge server)
- **Events**: Select `message_created`

This tells Chatwoot to POST agent replies to your bridge.

## Step 3: Build the Bridge

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import express from "express";

const client = createClient({ store: "session.db" });
const app = express();
app.use(express.json());

const CHATWOOT_URL = process.env.CHATWOOT_URL!;
const CHATWOOT_API_TOKEN = process.env.CHATWOOT_API_TOKEN!;
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID!;
const CHATWOOT_INBOX_ID = process.env.CHATWOOT_INBOX_ID!;

// Map WhatsApp JID → Chatwoot contact ID + conversation ID
const contactMap = new Map<string, { contactId: number; conversationId: number }>();

// --- Helper: Chatwoot API call ---
async function chatwootAPI(path: string, method: string, body?: unknown) {
  const res = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      api_access_token: CHATWOOT_API_TOKEN,
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  return res.json();
}

// --- Find or create Chatwoot contact ---
async function getOrCreateContact(jid: string, name: string) {
  const cached = contactMap.get(jid);
  if (cached) return cached;

  const phone = jid.split("@")[0];

  // Search for existing contact
  const search = await chatwootAPI(`/contacts/search?q=${phone}`, "GET");
  let contactId: number;

  if (search.payload?.length > 0) {
    contactId = search.payload[0].id;
  } else {
    // Create new contact
    const created = await chatwootAPI("/contacts", "POST", {
      name: name || phone,
      phone_number: `+${phone}`,
      inbox_id: CHATWOOT_INBOX_ID,
    });
    contactId = created.payload?.contact?.id ?? created.id;
  }

  // Find or create conversation
  const convos = await chatwootAPI(`/contacts/${contactId}/conversations`, "GET");
  let conversationId: number;

  const openConvo = convos.payload?.find(
    (c: { inbox_id: number; status: string }) =>
      c.inbox_id === Number(CHATWOOT_INBOX_ID) && c.status !== "resolved",
  );

  if (openConvo) {
    conversationId = openConvo.id;
  } else {
    const created = await chatwootAPI("/conversations", "POST", {
      contact_id: contactId,
      inbox_id: CHATWOOT_INBOX_ID,
    });
    conversationId = created.id;
  }

  const mapping = { contactId, conversationId };
  contactMap.set(jid, mapping);
  return mapping;
}

// --- Forward WhatsApp messages to Chatwoot ---
client.on("message", async ({ info, message }) => {
  if (info.isFromMe || info.isGroup) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  try {
    const { conversationId } = await getOrCreateContact(info.sender, info.pushName);

    await chatwootAPI(`/conversations/${conversationId}/messages`, "POST", {
      content: text,
      message_type: "incoming",
    });
  } catch (err) {
    console.error("Failed to forward to Chatwoot:", err);
  }
});

// --- Handle Chatwoot agent replies ---
app.post("/chatwoot/webhook", async (req, res) => {
  const { event, message_type, conversation, content } = req.body;

  // Only handle outgoing messages from agents
  if (event !== "message_created" || message_type !== "outgoing") {
    return res.sendStatus(200);
  }

  // Find the WhatsApp JID for this conversation
  const jid = [...contactMap.entries()].find(
    ([, v]) => v.conversationId === conversation?.id,
  )?.[0];

  if (!jid || !content) return res.sendStatus(200);

  try {
    await client.sendMessage(jid, { conversation: content });
  } catch (err) {
    console.error("Failed to send WhatsApp reply:", err);
  }

  res.sendStatus(200);
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired!");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  app.listen(3000, () => console.log("Chatwoot bridge on :3000"));
}

main().catch(console.error);
```

## How Agents Use It

Once connected:

1. WhatsApp users send a message
2. It appears in Chatwoot as a new conversation
3. Agents reply from the Chatwoot dashboard — just like any other channel
4. The reply goes back to WhatsApp via the bridge

Agents don't need to know about whatsmeow-node — they just use Chatwoot normally.

## Common Pitfalls

:::warning Contact map is in-memory
The example stores the JID → Chatwoot contact mapping in a `Map`. For production, persist this in a database so it survives restarts.
:::

:::warning Webhook URL must be reachable
Chatwoot needs to reach your bridge's webhook endpoint. If running in Docker, use the container name or a shared network.
:::

:::warning Group messages
This example skips group messages (`info.isGroup`). If you need group support, you'll need to map group JIDs to Chatwoot conversations differently.
:::

<RelatedGuides slugs={["integrate-whaticket", "integrate-n8n", "send-notifications", "build-a-bot"]} />
