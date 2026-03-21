---
title: "How to Send WhatsApp Notifications from Node.js"
sidebar_label: Send Notifications
sidebar_position: 17
description: "Send WhatsApp notifications, alerts, and reminders from Node.js — order updates, appointment reminders, system alerts, and more using whatsmeow-node."
keywords: [send whatsapp notification nodejs, whatsapp notification api, whatsapp alert bot, whatsapp reminder bot, send whatsapp message programmatically]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/send-notifications.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/send-notifications.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Send WhatsApp Notifications from Node.js",
      "description": "Send WhatsApp notifications, alerts, and reminders from Node.js — order updates, appointment reminders, system alerts, and more using whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/send-notifications.png",
      "step": [
        {"@type": "HowToStep", "name": "Set Up the Client", "text": "Create a WhatsmeowClient, init, and connect. The client stays connected in the background."},
        {"@type": "HowToStep", "name": "Send a Notification", "text": "Call sendMessage() with the recipient JID and a conversation message."},
        {"@type": "HowToStep", "name": "Trigger from External Events", "text": "Call sendMessage from an HTTP endpoint, database trigger, or cron job."},
        {"@type": "HowToStep", "name": "Send to Multiple Recipients", "text": "Iterate over a list of JIDs with a delay between sends to avoid rate limiting."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Send WhatsApp Notifications from Node.js",
      "description": "Send WhatsApp notifications, alerts, and reminders from Node.js — order updates, appointment reminders, system alerts, and more using whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/send-notifications.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Send WhatsApp Notifications from Node.js](/img/guides/send-notifications.png)
![How to Send WhatsApp Notifications from Node.js](/img/guides/send-notifications-light.png)

# How to Send WhatsApp Notifications from Node.js

Send alerts, reminders, and updates to WhatsApp from any Node.js app. whatsmeow-node stays connected in the background — you just call `sendMessage()` whenever you need to notify someone.

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))
- The recipient's phone number (as a JID: `5512345678@s.whatsapp.net`)

## Step 1: Set Up a Persistent Connection

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

async function start() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! See: How to Pair WhatsApp");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  console.log("Notification service is ready");
}

start().catch(console.error);
```

The client stays connected and ready to send messages at any time.

## Step 2: Send a Notification

```typescript
async function notify(phone: string, message: string) {
  const jid = `${phone}@s.whatsapp.net`;
  await client.sendMessage(jid, { conversation: message });
}

// Example: order update
await notify("5512345678", "Your order #1234 has shipped! Track it at https://example.com/track/1234");
```

## Step 3: Trigger from an HTTP Endpoint

Wrap the notification in an Express route so other services can trigger it:

```typescript
import express from "express";

const app = express();
app.use(express.json());

app.post("/notify", async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: "phone and message are required" });
  }

  try {
    const jid = `${phone}@s.whatsapp.net`;
    const resp = await client.sendMessage(jid, { conversation: message });
    res.json({ sent: true, id: resp.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to send" });
  }
});

app.listen(3000, () => console.log("Notification API on :3000"));
```

Now any service can send a notification:

```bash
curl -X POST http://localhost:3000/notify \
  -H "Content-Type: application/json" \
  -d '{"phone": "5512345678", "message": "Your appointment is in 1 hour"}'
```

## Step 4: Send to Multiple Recipients

```typescript
async function broadcast(phones: string[], message: string) {
  for (const phone of phones) {
    const jid = `${phone}@s.whatsapp.net`;
    await client.sendMessage(jid, { conversation: message });

    // Wait between sends to avoid rate limiting
    await new Promise((r) => setTimeout(r, 2000));
  }
}

await broadcast(
  ["5512345678", "5598765432", "5511223344"],
  "Reminder: team meeting at 3 PM today",
);
```

:::warning Rate limiting
WhatsApp rate-limits sending. Space messages 1-3 seconds apart for bulk sends. Sending too fast can get your account temporarily restricted. See [Rate Limiting](/docs/rate-limiting).
:::

## Notification Patterns

### Appointment Reminder

```typescript
await notify(phone, `Reminder: your appointment with Dr. Smith is tomorrow at 10:00 AM.

Reply CONFIRM to confirm or CANCEL to cancel.`);
```

### Order Update

```typescript
await notify(phone, `Order #${orderId} update: ${status}

${status === "shipped" ? `Track: ${trackingUrl}` : ""}`);
```

### System Alert

```typescript
await notify(adminPhone, `⚠ Server alert: CPU usage at ${cpuPercent}% on ${hostname}`);
```

### Group Notification

```typescript
// Send to a group instead of an individual
const groupJid = "120363XXXXX@g.us";
await client.sendMessage(groupJid, {
  conversation: "Deploy complete: v2.1.0 is live",
});
```

## Complete Example

A notification service with an HTTP API:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import express from "express";

const client = createClient({ store: "session.db" });
const app = express();
app.use(express.json());

app.post("/notify", async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: "phone and message are required" });
  }

  try {
    const jid = `${phone}@s.whatsapp.net`;
    const resp = await client.sendMessage(jid, { conversation: message });
    res.json({ sent: true, id: resp.id });
  } catch (err) {
    console.error("Send failed:", err);
    res.status(500).json({ error: "Failed to send" });
  }
});

app.post("/broadcast", async (req, res) => {
  const { phones, message } = req.body;
  if (!phones?.length || !message) {
    return res.status(400).json({ error: "phones[] and message are required" });
  }

  // Send in background
  (async () => {
    for (const phone of phones) {
      try {
        const jid = `${phone}@s.whatsapp.net`;
        await client.sendMessage(jid, { conversation: message });
      } catch (err) {
        console.error(`Failed to send to ${phone}:`, err);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    console.log(`Broadcast complete: ${phones.length} recipients`);
  })();

  res.json({ queued: true, count: phones.length });
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired!");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");

  app.listen(3000, () => console.log("Notification API on :3000"));

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

:::warning Don't spam
Sending bulk unsolicited messages violates WhatsApp's Terms of Service and will get your account banned. Only send notifications to users who have opted in.
:::

:::warning Rate limiting
Space out sends with a 1-3 second delay. See [Rate Limiting](/docs/rate-limiting) for details.
:::

:::warning Keep the connection alive
The client must stay connected to send messages. If the process exits, you'll need to reconnect. For production, use a process manager like PM2 or run as a systemd service.
:::

<RelatedGuides slugs={["schedule-messages", "automate-group-messages", "build-a-bot"]} />
