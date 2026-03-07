---
title: Introduction
sidebar_position: 1
---

# whatsmeow-node

TypeScript/Node.js bindings for [whatsmeow](https://github.com/tulir/whatsmeow), the Go WhatsApp Web multidevice API library.

Communicates with a precompiled Go binary over stdin/stdout JSON-line IPC. No CGo, no native addons, no WebSocket reimplementation — just a subprocess.

## Philosophy

whatsmeow-node is a **binding**, not a framework. The goal is to expose whatsmeow's API to Node.js as faithfully as possible — a 1:1 mapping with no added abstractions.

- **No magic** — Message payloads match the [whatsmeow protobuf schema](https://pkg.go.dev/go.mau.fi/whatsmeow/proto/waE2E#Message) directly.
- **No sweeteners** — No invented shorthand like `sendText(jid, "hello")`. You construct the proto-shaped object yourself.
- **Typed where possible, open where needed** — `sendMessage` is typed for common shapes. For anything else, use `sendRawMessage`.

## Why whatsmeow?

| | [whatsmeow](https://github.com/tulir/whatsmeow) | [Baileys](https://github.com/WhiskeySockets/Baileys) |
|---|---|---|
| Language | Go | Node.js |
| Memory | ~10-20 MB | ~50 MB |
| Maintainer | [tulir](https://github.com/tulir) (Mautrix bridges) | WhiskeySockets community |

whatsmeow powers the [Mautrix WhatsApp bridge](https://github.com/mautrix/whatsapp) (24/7 for thousands of users), uses far less memory than Node.js alternatives, and has consistent maintainership.

## Architecture

```
Node (client.ts) → stdin JSON → Go binary → whatsmeow → WhatsApp
                 ← stdout JSON ←
```

- One client per Go subprocess
- `init()` opens the store and creates the whatsmeow client
- `connect()` starts the WhatsApp connection
- Methods return typed data or throw `WhatsmeowError`

## Next Steps

- [Installation](./installation)
- [Getting Started](./getting-started)
- [API Reference](./api/overview)
