---
title: "How to Pair WhatsApp with Node.js"
sidebar_label: Pair WhatsApp
sidebar_position: 6
description: "Link a WhatsApp account to your Node.js app using QR code scanning or phone number code entry. Includes session persistence and reconnection."
keywords: [pair whatsapp nodejs, whatsapp qr code api, link whatsapp device programmatically, whatsapp linked devices nodejs]
---

import Head from '@docusaurus/Head';

<Head>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Pair WhatsApp with Node.js",
      "description": "Link a WhatsApp account to your Node.js app using QR code scanning or phone number code entry. Includes session persistence and reconnection.",
      "step": [
        {"@type": "HowToStep", "name": "QR Code Pairing", "text": "Call getQRChannel() then connect(). Listen for the qr event and render the code with qrcode-terminal."},
        {"@type": "HowToStep", "name": "Phone Number Pairing", "text": "Call connect() first, then pairCode(phoneNumber). The user enters the 8-digit code in WhatsApp."},
        {"@type": "HowToStep", "name": "Session Persistence", "text": "The session is stored in the database. On next run, init() returns the stored JID and you skip pairing."},
        {"@type": "HowToStep", "name": "Choose a Store", "text": "Use SQLite (session.db) for development or PostgreSQL for production."}
      ]
    })}
  </script>
</Head>

# How to Pair WhatsApp with Node.js

whatsmeow-node connects to WhatsApp as a linked device — just like WhatsApp Web or Desktop. You can pair using a QR code or a phone number code. Once paired, the session is persisted and your app reconnects automatically.

## Prerequisites

- whatsmeow-node installed ([Installation guide](/docs/installation))
- A WhatsApp account on your phone

## Method 1: QR Code Pairing

The standard flow — your terminal displays a QR code that you scan with WhatsApp.

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import qrcode from "qrcode-terminal";

const client = createClient({ store: "session.db" });

// Display QR codes in the terminal
client.on("qr", ({ code }) => {
  qrcode.generate(code, { small: true });
});

client.on("connected", ({ jid }) => {
  console.log(`Paired and connected as ${jid}!`);
});

async function main() {
  const { jid } = await client.init();

  if (jid) {
    // Already paired — just connect
    console.log(`Session found for ${jid}`);
    await client.connect();
    return;
  }

  // Not paired — set up QR channel first
  await client.getQRChannel();
  await client.connect();
}

main().catch(console.error);
```

Install `qrcode-terminal` with `npm install qrcode-terminal`. No `@types` package is needed — ambient types are provided.

:::info
QR codes expire and refresh automatically. If the user doesn't scan in time, a new QR code is emitted via the `"qr"` event.
:::

## Method 2: Phone Number Pairing

Instead of scanning a QR, the user enters an 8-digit code in WhatsApp. Useful for headless servers or when terminal QR rendering isn't practical.

```typescript
const client = createClient({ store: "session.db" });

async function main() {
  const { jid } = await client.init();

  if (jid) {
    await client.connect();
    return;
  }

  // Step 1: Connect first — pairCode() requires an active connection
  await client.connect();

  // Step 2: Request a pairing code
  const phoneNumber = "5512345678"; // without the + prefix
  const code = await client.pairCode(phoneNumber);
  console.log(`Pairing code: ${code}`);
  console.log("Enter this in: WhatsApp → Linked Devices → Link with phone number");

  // Step 3: Wait for the user to enter the code
  client.once("connected", ({ jid }) => {
    console.log(`Paired as ${jid}!`);
  });
}

main().catch(console.error);
```

:::warning
`pairCode()` must be called **after** `connect()` — it requires an active connection to WhatsApp's servers. The code expires after 60 seconds.
:::

## Session Persistence

Once paired, the session is stored in the database you specified. On the next run, `init()` returns the stored JID and you can skip the pairing flow:

```typescript
const { jid } = await client.init();
if (jid) {
  // Already paired — connect directly
  await client.connect();
} else {
  // First run — pair first
  await client.getQRChannel();
  await client.connect();
}
```

## Choosing a Store

| Store | URI | Best for |
|-------|-----|----------|
| SQLite | `"session.db"` or `"file:./data/session.db"` | Development, single-instance |
| PostgreSQL | `"postgresql://user:pass@host/db"` | Production, multiple instances |

Plain file paths are automatically normalized to the `file:` prefix.

## Complete Example

Handles both fresh pairing and reconnection:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import qrcode from "qrcode-terminal";

const client = createClient({ store: "session.db" });

client.on("qr", ({ code }) => {
  qrcode.generate(code, { small: true });
});

client.on("connected", ({ jid }) => {
  console.log(`Connected as ${jid}`);
});

client.on("logged_out", ({ reason }) => {
  console.error(`Session revoked: ${reason} — delete session.db and re-pair`);
  client.close();
  process.exit(1);
});

async function main() {
  const { jid } = await client.init();

  if (jid) {
    console.log(`Resuming session for ${jid}`);
    await client.connect();
  } else {
    console.log("No session found — pairing...");
    await client.getQRChannel();
    await client.connect();
  }

  process.on("SIGINT", async () => {
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Common Pitfalls

:::warning `pairCode()` before `connect()`
Calling `pairCode()` before `connect()` will fail. The phone number pairing flow requires an active WebSocket connection to WhatsApp's servers.
:::

:::warning Strip the `+` from phone numbers
Phone numbers must not include the `+` prefix. Pass `"5512345678"`, not `"+5512345678"`.
:::

:::warning Session revocation
If the user unlinks the device from WhatsApp (Settings → Linked Devices → remove), the `"logged_out"` event fires. The only recovery is to delete the session database and pair again.
:::

## Next Steps

- [How to Build a Bot](build-a-bot) — pair and then build a bot
- [Getting Started](/docs/getting-started) — quick overview of the full API
- [Connection Lifecycle](/docs/connection-lifecycle) — deep dive into connection states
- [Pairing Examples](/docs/examples/pairing) — more pairing code samples
