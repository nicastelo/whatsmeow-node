---
title: Common Issues
sidebar_position: 1
description: "Solutions for common whatsmeow-node issues — QR not showing, connection errors, proto field naming, and message send failures."
keywords: [whatsmeow-node troubleshooting, whatsapp qr not showing, whatsapp connection error, whatsapp message send failure]
---

# Common Issues

## QR Never Appears

- Call `getQRChannel()` **before** `connect()`.
- Ensure you're in the unpaired flow (`init()` returned no `jid`).
- Make sure you're listening for the `qr` event.

## Commands Fail With `ERR_NOT_INIT`

You must call `init()` once before any client operation. This opens the store and creates the whatsmeow client.

## Message Send Fails

- Confirm the `connected` event fired before sending.
- Validate JID format: `<phone>@s.whatsapp.net` for individual chats, `<id>@g.us` for groups.
- Check that the phone number includes the country code (no `+` prefix).

## Process Exits Unexpectedly

- Listen to the `log` event for Go binary output — it often contains the root cause.
- Verify the bundled Go binary exists for your platform.
- Check that your `store` path is writable.

## `ERR_TIMEOUT` on Every Command

- The default timeout is 30 seconds. If WhatsApp servers are slow or the initial sync is running, commands may take longer.
- Increase `commandTimeout` in client options: `createClient({ store: "session.db", commandTimeout: 60000 })`.

## `logged_out` Event After Restart

- The WhatsApp session was revoked (user unlinked the device from their phone).
- Delete the session database and re-pair.

## Media Upload/Download Fails

- Ensure the file path is absolute or relative to the Go binary's working directory.
- Check file permissions.
- For uploads, use the correct `mediaType`: `"image"`, `"video"`, `"audio"`, or `"document"`.

## Proto Field Naming

Message fields must use exact protobuf casing, **not** camelCase:

```typescript
// Correct
const correct = { URL: "...", fileSHA256: "...", fileEncSHA256: "..." };

// Wrong — will silently fail
const wrong = { url: "...", fileSha256: "...", fileEncSha256: "..." };
```

When in doubt, check the [whatsmeow proto schema](https://pkg.go.dev/go.mau.fi/whatsmeow/proto/waE2E#Message).
