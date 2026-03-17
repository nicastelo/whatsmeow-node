---
title: Pairing Examples
sidebar_label: Pairing
sidebar_position: 2
description: "Pair a WhatsApp account with Node.js using QR code scanning or phone number code entry via whatsmeow-node. Includes session persistence."
keywords: [whatsapp qr code nodejs, pair whatsapp device nodejs, whatsapp linked devices api, whatsapp phone code pairing]
---

# Pairing

:::tip Looking for a step-by-step tutorial?
See [How to Pair WhatsApp with Node.js](/docs/guides/pair-whatsapp).
:::

Two ways to link your WhatsApp account: QR code scanning or phone number code entry.

## QR Code Pairing

The standard flow — displays a QR code in the terminal for scanning.

```typescript
const client = createClient({
  store: `file:${storePath}`,
  binaryPath,
});

// Listen for QR codes to display
client.on("qr", ({ code }) => {
  qrcode.generate(code, { small: true });
});

// Called when pairing succeeds
client.on("connected", ({ jid }) => {
  console.log(`Paired successfully! JID: ${jid}`);
});

async function main() {
  const result = await client.init();

  if (result.jid) {
    // Already paired — just connect
    await client.connect();
    return;
  }

  // Not paired — set up QR channel, then connect
  await client.getQRChannel();
  await client.connect();
}
```

:::info
After pairing, the example waits 15 seconds for the initial sync to finish before disconnecting. This ensures the session database is fully populated.
:::

[Full source: `pair.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/pair.ts)

---

## Phone Number Pairing

Alternative to QR — the user enters an 8-digit code in WhatsApp instead of scanning.

```typescript
// Step 1: Connect first — pairCode() requires an active connection
await client.connect();

// Step 2: Request a pairing code
const code = await client.pairCode(cleanPhone);
console.log(`Pairing code: ${code}`);
// User enters this code in: WhatsApp -> Linked Devices -> Link with phone number

// Step 3: Wait for pairing to complete
client.once("connected", ({ jid }) => {
  console.log(`Paired and connected as ${jid}!`);
});
```

:::warning
The phone number is the number of the WhatsApp account to pair **with** (the phone that will enter the code). Strip the `+` prefix before passing it.
:::

:::info
Unlike QR pairing, phone number pairing requires calling `connect()` **before** `pairCode()`. The pairing code expires after 60 seconds.
:::

[Full source: `pair-code.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/pair-code.ts)
