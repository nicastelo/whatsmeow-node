---
title: Why whatsmeow-node
sidebar_position: 1
slug: /intro
---

# Why whatsmeow-node

:::danger Disclaimer
This project is not affiliated, associated, authorized, endorsed by, or in any way officially connected with WhatsApp or any of its subsidiaries or affiliates. "WhatsApp" as well as related names, marks, emblems and images are registered trademarks of their respective owners.

**Use of this library may violate WhatsApp's Terms of Service.** WhatsApp does not allow unofficial clients or automated messaging on their platform. Your account may be banned. Use at your own risk and responsibility.

Do not use this for spamming, stalkerware, bulk messaging, or any purpose that violates WhatsApp's Terms of Service. The maintainers do not condone such use and bear no liability for misuse.
:::

There are many ways to connect to WhatsApp from Node.js. Here's why this one exists.

## The problem

Most WhatsApp libraries for Node.js fall into two camps:

**Browser automation** (whatsapp-web.js, WPPConnect, OpenWA) — spin up a headless Chrome, use 200-500 MB of RAM, and break when WhatsApp updates their web client.

**Pure JS protocol** (Baileys) — lighter than a browser, but has gone through multiple forks, breaking changes, and maintainer turnover.

## The approach

whatsmeow-node wraps [whatsmeow](https://github.com/tulir/whatsmeow), a Go library that directly implements the WhatsApp Web protocol. whatsmeow powers the [Mautrix WhatsApp bridge](https://github.com/mautrix/whatsapp) — running 24/7 for thousands of users across Matrix homeservers. It's arguably the most reliable open-source WhatsApp implementation.

We bridge it to Node.js through a thin IPC layer: a precompiled Go binary that communicates with your TypeScript code over stdin/stdout. You get whatsmeow's reliability with TypeScript's developer experience.

## What this means for you

- **`npm install` and go** — precompiled binaries for macOS, Linux, and Windows. No Go toolchain needed.
- **~10-20 MB memory** — a single Go binary, not a browser or a heavy Node.js process.
- **Typed everything** — 100 methods, typed events, typed errors. Your editor knows the API.
- **Broad API coverage** — 100 of 126 upstream methods wrapped: messages, groups, newsletters, media, polls, presence, privacy, encryption, bots, and more.
- **Reliable** — when WhatsApp changes something, whatsmeow adapts. You inherit that stability.

## How it works

```
Your TypeScript code → stdin JSON → Go binary → whatsmeow → WhatsApp
                     ← stdout JSON ←
```

You never interact with the Go binary directly. The `WhatsmeowClient` class handles the IPC, serialization, and process lifecycle. From your perspective, it's just async methods that return typed data.

## Comparison

| | whatsmeow-node | Baileys | whatsapp-web.js |
|---|---|---|---|
| Upstream | whatsmeow (Go) | Custom (JS) | Puppeteer |
| Memory | ~10-20 MB | ~50 MB | ~200-500 MB |
| Reliability | Mautrix-grade | Community | Browser-dependent |
| API style | Typed methods | Typed methods | Browser injection |
| Setup | `npm install` | `npm install` | Chrome + `npm install` |

## Design philosophy

This is a **binding**, not a framework. We expose whatsmeow's API as faithfully as possible — no invented abstractions, no magic helpers, no opinions about your app structure.

If you want convenience wrappers like `sendText()` or a bot framework with command routing, build them on top. whatsmeow-node gives you the foundation.

## Next steps

- [Install](./installation)
- [Send your first message](./getting-started)
- [Explore the API](./api/overview)
