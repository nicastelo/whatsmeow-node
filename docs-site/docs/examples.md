---
title: Examples
sidebar_position: 5
---

# Examples

Repository examples live under [`ts/examples/`](https://github.com/nicastelo/whatsmeow-node/tree/main/ts/examples).

## Pair Device

```bash
cd ts
npx tsx examples/pair.ts
```

Scans a QR code in the terminal to pair a new WhatsApp session.

## Send Test Message

```bash
cd ts
npx tsx examples/send-test.ts <phone>
```

Sends a test message to the given phone number using an existing paired session.

## Smoke Test

```bash
cd ts
npx tsx examples/smoke-test.ts [phone]
```

Runs a broader set of API calls (presence, groups, privacy, etc.). If `[phone]` is omitted, only read-only/self methods are tested.

## Building from Source

Requirements: Go 1.25+, Node.js 18+

```bash
# Build the Go binary
cd cmd/whatsmeow-node
go build -o ../../whatsmeow-node .

# Build the TypeScript package
cd ../../ts
npm install
npm run build

# Run the pairing example
npx tsx examples/pair.ts
```
