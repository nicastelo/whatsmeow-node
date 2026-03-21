---
title: "How to Schedule WhatsApp Messages with Node.js"
sidebar_label: Schedule Messages
sidebar_position: 18
description: "Schedule WhatsApp messages to send at a specific time with Node.js — delayed sends, recurring reminders, and cron-based scheduling using whatsmeow-node."
keywords: [schedule whatsapp messages nodejs, whatsapp scheduled messages api, whatsapp cron job, delayed whatsapp message, whatsapp reminder bot nodejs]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/schedule-messages.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/schedule-messages.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Schedule WhatsApp Messages with Node.js",
      "description": "Schedule WhatsApp messages to send at a specific time with Node.js — delayed sends, recurring reminders, and cron-based scheduling using whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/schedule-messages.png",
      "step": [
        {"@type": "HowToStep", "name": "Send a Delayed Message", "text": "Use setTimeout to send a message after a delay."},
        {"@type": "HowToStep", "name": "Schedule at a Specific Time", "text": "Calculate the delay from now until the target time and use setTimeout."},
        {"@type": "HowToStep", "name": "Set Up Recurring Messages", "text": "Use node-cron to send messages on a cron schedule — daily reminders, weekly reports."},
        {"@type": "HowToStep", "name": "Build a User-Facing Scheduler", "text": "Let users schedule messages via WhatsApp commands like !remind 30m Take a break."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Schedule WhatsApp Messages with Node.js",
      "description": "Schedule WhatsApp messages to send at a specific time with Node.js — delayed sends, recurring reminders, and cron-based scheduling using whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/schedule-messages.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Schedule WhatsApp Messages with Node.js](/img/guides/schedule-messages.png)
![How to Schedule WhatsApp Messages with Node.js](/img/guides/schedule-messages-light.png)

# How to Schedule WhatsApp Messages with Node.js

WhatsApp doesn't have a built-in scheduling API, but you can build one with whatsmeow-node and standard Node.js scheduling tools — `setTimeout` for one-off delays, `node-cron` for recurring messages, or a database-backed queue for persistence.

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))
- For recurring schedules: `npm install node-cron`

## Send a Delayed Message

The simplest approach — send a message after a delay:

```typescript
function sendLater(jid: string, message: string, delayMs: number) {
  setTimeout(async () => {
    await client.sendMessage(jid, { conversation: message });
    console.log(`Sent scheduled message to ${jid}`);
  }, delayMs);
}

// Send in 30 minutes
sendLater("5512345678@s.whatsapp.net", "Time's up!", 30 * 60 * 1000);
```

## Schedule at a Specific Time

Calculate the delay from now until the target time:

```typescript
function sendAt(jid: string, message: string, date: Date) {
  const delay = date.getTime() - Date.now();

  if (delay <= 0) {
    console.error("Scheduled time is in the past");
    return;
  }

  console.log(`Scheduled for ${date.toLocaleString()} (in ${Math.round(delay / 1000)}s)`);

  setTimeout(async () => {
    await client.sendMessage(jid, { conversation: message });
  }, delay);
}

// Send tomorrow at 9 AM
const tomorrow9am = new Date();
tomorrow9am.setDate(tomorrow9am.getDate() + 1);
tomorrow9am.setHours(9, 0, 0, 0);

sendAt("5512345678@s.whatsapp.net", "Good morning! Don't forget the meeting at 10.", tomorrow9am);
```

## Set Up Recurring Messages with Cron

Use `node-cron` for recurring schedules:

```bash
npm install node-cron
```

```typescript
import cron from "node-cron";

// Every weekday at 8:55 AM — "standup in 5 minutes"
cron.schedule("55 8 * * 1-5", async () => {
  const groupJid = "120363XXXXX@g.us";
  await client.sendMessage(groupJid, {
    conversation: "Standup in 5 minutes!",
  });
});

// Every Monday at 9 AM — weekly report
cron.schedule("0 9 * * 1", async () => {
  const reportChat = "5512345678@s.whatsapp.net";
  await client.sendMessage(reportChat, {
    conversation: "Weekly report is ready: https://example.com/reports/latest",
  });
});

// First day of every month — billing reminder
cron.schedule("0 10 1 * *", async () => {
  const billingGroup = "120363YYYYY@g.us";
  await client.sendMessage(billingGroup, {
    conversation: "Reminder: invoices are due by the 5th",
  });
});
```

:::info Cron syntax
`node-cron` uses the standard cron format: `minute hour day-of-month month day-of-week`. Use [crontab.guru](https://crontab.guru/) to build expressions.
:::

## Build a User-Facing Scheduler

Let users schedule reminders via WhatsApp commands:

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text?.startsWith("!remind")) return;

  // Parse: !remind 30m Take a break
  const match = text.match(/^!remind\s+(\d+)(m|h|s)\s+(.+)$/);
  if (!match) {
    await client.sendMessage(info.chat, {
      conversation: "Usage: !remind <number><m|h|s> <message>\nExample: !remind 30m Take a break",
    });
    return;
  }

  const [, amount, unit, reminder] = match;
  const multiplier = { s: 1000, m: 60_000, h: 3_600_000 }[unit]!;
  const delayMs = parseInt(amount) * multiplier;

  setTimeout(async () => {
    await client.sendRawMessage(info.chat, {
      extendedTextMessage: {
        text: `Reminder: ${reminder}`,
        contextInfo: {
          mentionedJid: [info.sender],
        },
      },
    });
  }, delayMs);

  const delayText = `${amount}${unit}`;
  await client.sendMessage(info.chat, {
    conversation: `Got it! I'll remind you in ${delayText}: "${reminder}"`,
  });
});
```

## Complete Example

A scheduling bot with `!remind` commands and a daily cron:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import cron from "node-cron";

const client = createClient({ store: "session.db" });

// Daily standup reminder
cron.schedule("55 8 * * 1-5", async () => {
  const group = "120363XXXXX@g.us";
  await client.sendMessage(group, {
    conversation: "Standup in 5 minutes!",
  });
});

// User-facing !remind command
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text?.startsWith("!remind")) return;

  const match = text.match(/^!remind\s+(\d+)(m|h|s)\s+(.+)$/);
  if (!match) {
    await client.sendMessage(info.chat, {
      conversation: "Usage: !remind <number><m|h|s> <message>\nExample: !remind 30m Take a break",
    });
    return;
  }

  const [, amount, unit, reminder] = match;
  const multiplier = { s: 1000, m: 60_000, h: 3_600_000 }[unit]!;
  const delayMs = parseInt(amount) * multiplier;

  setTimeout(async () => {
    await client.sendRawMessage(info.chat, {
      extendedTextMessage: {
        text: `Reminder: ${reminder}`,
        contextInfo: {
          mentionedJid: [info.sender],
        },
      },
    });
  }, delayMs);

  await client.sendMessage(info.chat, {
    conversation: `I'll remind you in ${amount}${unit}: "${reminder}"`,
  });
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired!");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  console.log("Scheduler bot is online!");

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

:::warning In-memory schedules are lost on restart
`setTimeout` and `node-cron` schedules live in memory. If the process restarts, pending reminders are lost. For production, persist schedules in a database and reload them on startup.
:::

:::warning Timezone awareness
`node-cron` uses the server's timezone by default. Set it explicitly with the `timezone` option if your users are in different timezones: `cron.schedule("0 9 * * *", fn, { timezone: "America/Sao_Paulo" })`.
:::

:::warning Rate limiting
If a cron job sends to many recipients, space out the sends. See [Rate Limiting](/docs/rate-limiting).
:::

<RelatedGuides slugs={["send-notifications", "automate-group-messages", "build-a-bot"]} />
