---
title: Examples Overview
sidebar_label: Examples
sidebar_position: 1
description: "Runnable TypeScript examples for the whatsmeow-node WhatsApp API — pairing, messaging, media, groups, presence, bots, and more."
keywords: [whatsapp api nodejs examples, whatsmeow-node examples, whatsapp typescript examples]
---

# Examples

Complete, runnable examples covering the full whatsmeow-node API. All examples live in [`ts/examples/`](https://github.com/nicastelo/whatsmeow-node/tree/main/ts/examples).

## Quick Reference

| Category | What you'll learn |
|----------|-------------------|
| [Pairing](pairing.md) | QR code and phone-number pairing flows |
| [Messaging](messaging.md) | Sending, replying, @mentions, reactions, edits, revokes |
| [Media](media.md) | Images, video, audio, documents, stickers |
| [Groups](groups-and-communities.md) | Group creation, settings, participants, invite links |
| [Presence & Status](presence-and-status.md) | Online status, typing indicators, privacy, ephemeral messages |
| [Advanced](advanced.md) | Polls, channels, location sharing, vCards, contact lookup |
| [Bots & Resilience](bots-and-resilience.md) | Full bot template, auto-reconnect, error handling |

## Prerequisites

All examples (except pairing) require an already-paired session. Run the pairing example first to create a `session.db` file that subsequent examples will use automatically.
