---
title: Media Examples
sidebar_label: Media
sidebar_position: 4
description: "Upload and send images, videos, audio, documents, and stickers on WhatsApp with Node.js and TypeScript. Includes download examples."
keywords: [send image whatsapp nodejs, whatsapp media upload typescript, whatsapp sticker api nodejs, send video audio whatsapp api]
---

# Media

:::tip Looking for a step-by-step tutorial?
See [How to Send Stickers](/docs/guides/send-stickers) and [How to Download Media](/docs/guides/download-media).
:::

Uploading and sending images, video, audio, documents, and stickers. All media follows the same two-step pattern: upload, then send.

## Send an Image

```typescript
// Step 1: Upload — returns encrypted media metadata
const media = await client.uploadMedia(absoluteImagePath, "image");

// Step 2: Send using sendRawMessage with the proto message shape
await client.sendRawMessage(jid, {
  imageMessage: {
    URL: media.URL,
    directPath: media.directPath,
    mediaKey: media.mediaKey,
    fileEncSHA256: media.fileEncSHA256,
    fileSHA256: media.fileSHA256,
    fileLength: String(media.fileLength),
    mimetype: "image/png",
    caption: "Sent from whatsmeow-node",
  },
});
```

:::warning
Upload response fields use exact protobuf casing: `URL`, `fileSHA256`, `fileEncSHA256` — **not** `url`, `fileSha256`, `fileEncSha256`. Using wrong casing will silently fail.
:::

[Full source: `media-send.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/media-send.ts)

---

## Send Video, Audio & Documents

All three media types follow the same upload + send pattern with type-specific proto fields.

### Shared upload step

```typescript
const media = await client.uploadMedia(absolutePath, mediaType);

// These fields are shared across all media types
const sharedFields = {
  URL: media.URL,
  directPath: media.directPath,
  mediaKey: media.mediaKey,
  fileEncSHA256: media.fileEncSHA256,
  fileSHA256: media.fileSHA256,
  fileLength: String(media.fileLength),
  mimetype,
};
```

### Video

```typescript
await client.sendRawMessage(jid, {
  videoMessage: {
    ...sharedFields,
    caption: "Sent from whatsmeow-node",
    // seconds: 30,         // duration
    // gifPlayback: true,   // play as GIF (loops, no audio)
  },
});
```

### Audio (voice note)

```typescript
await client.sendRawMessage(jid, {
  audioMessage: {
    ...sharedFields,
    ptt: true,  // true = voice note (blue mic icon), false = audio file
    // seconds: 15,
  },
});
```

### Document

```typescript
await client.sendRawMessage(jid, {
  documentMessage: {
    ...sharedFields,
    fileName: "report.pdf",  // displayed as the document title
    caption: "Sent from whatsmeow-node",
  },
});
```

[Full source: `media-send-all.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/media-send-all.ts)

---

## Send a Sticker

Stickers use the same upload flow but require WebP format and explicit dimensions.

```typescript
// Upload as "image" — whatsmeow handles encryption the same way
const media = await client.uploadMedia(absoluteStickerPath, "image");

await client.sendRawMessage(jid, {
  stickerMessage: {
    URL: media.URL,
    directPath: media.directPath,
    mediaKey: media.mediaKey,
    fileEncSHA256: media.fileEncSHA256,
    fileSHA256: media.fileSHA256,
    fileLength: String(media.fileLength),
    mimetype: "image/webp",
    width: 512,
    height: 512,
    // isAnimated: true,  // for animated stickers
  },
});
```

:::warning
`width` and `height` are required for stickers. Without them, WhatsApp may display the sticker as a generic file attachment. Standard sticker size is 512x512.
:::

[Full source: `sticker-send.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/sticker-send.ts)

---

## Download Incoming Media

Listen for incoming stickers (or any media) and save them to disk.

```typescript
client.on("message", async ({ info, message }) => {
  const sticker = message.stickerMessage;
  if (!sticker) return;

  // downloadAny() auto-detects the media type from the message
  // Downloads to a temp file and returns the file path
  const filePath = await client.downloadAny(message);
  console.log(`Downloaded to: ${filePath}`);
});
```

:::info
`downloadAny()` works with any media type — images, videos, audio, documents, and stickers. Just check the appropriate message field (`imageMessage`, `videoMessage`, `audioMessage`, `documentMessage`, `stickerMessage`).
:::

[Full source: `sticker-download.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/sticker-download.ts)
