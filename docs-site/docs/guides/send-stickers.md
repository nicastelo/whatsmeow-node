---
title: "How to Send Stickers on WhatsApp with Node.js"
sidebar_label: Send Stickers
sidebar_position: 3
description: "Send and receive WhatsApp stickers programmatically with Node.js — upload WebP files, set dimensions, and download incoming stickers."
keywords: [send stickers whatsapp bot, whatsapp sticker api nodejs, send webp sticker whatsapp, download whatsapp stickers nodejs]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/send-stickers.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/send-stickers.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Send Stickers on WhatsApp with Node.js",
      "description": "Send and receive WhatsApp stickers programmatically with Node.js — upload WebP files, set dimensions, and download incoming stickers.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/send-stickers.png",
      "step": [
        {"@type": "HowToStep", "name": "Upload the Sticker File", "text": "Use uploadMedia() with the WebP file path and 'image' media type."},
        {"@type": "HowToStep", "name": "Send the Sticker Message", "text": "Use sendRawMessage with stickerMessage including width, height (512x512), and mimetype image/webp."},
        {"@type": "HowToStep", "name": "Download Incoming Stickers", "text": "Listen for messages with stickerMessage and call downloadAny() to save to disk."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Send Stickers on WhatsApp with Node.js",
      "description": "Send and receive WhatsApp stickers programmatically with Node.js — upload WebP files, set dimensions, and download incoming stickers.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/send-stickers.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Send Stickers on WhatsApp with Node.js](/img/guides/send-stickers.png)
![How to Send Stickers on WhatsApp with Node.js](/img/guides/send-stickers-light.png)

# How to Send Stickers on WhatsApp with Node.js

Stickers in WhatsApp are WebP images sent with a `stickerMessage` proto shape. whatsmeow-node handles the upload and encryption — you just provide the file and dimensions.

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))
- A sticker image in WebP format, ideally 512x512 pixels

## Step 1: Upload the Sticker File

Stickers use the same upload flow as images. The `uploadMedia` method encrypts and uploads the file to WhatsApp's servers:

```typescript
const media = await client.uploadMedia("/path/to/sticker.webp", "image");
```

The returned object contains the encrypted media metadata you'll need for sending.

## Step 2: Send the Sticker Message

```typescript
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
`width` and `height` are required. Without them, WhatsApp may display the sticker as a generic file attachment instead of rendering it inline. Standard sticker size is 512x512.
:::

## Step 3: Download Incoming Stickers

Listen for messages and use `downloadAny()` to save incoming stickers to disk:

```typescript
client.on("message", async ({ info, message }) => {
  const sticker = message.stickerMessage;
  if (!sticker) return;

  // downloadAny() detects the media type automatically
  // and saves to a temp file
  const filePath = await client.downloadAny(message);
  console.log(`Sticker from ${info.pushName} saved to: ${filePath}`);
});
```

:::info
`downloadAny()` saves to a temporary file. If you need to keep the sticker permanently, copy it to a stable location with `fs.copyFile()`. See [How to Download Media](download-media) for details.
:::

## Complete Example

A bot that echoes stickers back and saves incoming ones:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const client = createClient({ store: "session.db" });
const SAVE_DIR = "./stickers";

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const sticker = message.stickerMessage;
  if (!sticker) return;

  console.log(`Sticker from ${info.pushName}`);

  // Download the incoming sticker
  const tempPath = await client.downloadAny(message);

  // Save permanently
  await mkdir(SAVE_DIR, { recursive: true });
  const dest = path.join(SAVE_DIR, `${info.id}.webp`);
  await copyFile(tempPath, dest);
  console.log(`Saved to ${dest}`);

  // Echo it back
  const media = await client.uploadMedia(tempPath, "image");
  await client.sendRawMessage(info.chat, {
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
    },
  });
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! See: How to Pair WhatsApp");
    process.exit(1);
  }
  await client.connect();
  console.log("Listening for stickers...");
}

main().catch(console.error);
```

## Common Pitfalls

:::warning Proto field casing
Upload response fields use exact protobuf casing: `URL`, `fileSHA256`, `fileEncSHA256` — **not** `url`, `fileSha256`. Using wrong casing will silently fail and the sticker won't be delivered.
:::

:::warning Wrong mimetype
Always use `"image/webp"` for stickers. Sending a PNG or JPEG as a sticker will either fail or display as a regular image.
:::

:::warning Upload type
Use `"image"` as the media type when calling `uploadMedia()`, even though it's a sticker. The encryption is handled the same way.
:::

<RelatedGuides slugs={["download-media", "build-a-bot", "send-messages-typescript"]} />
