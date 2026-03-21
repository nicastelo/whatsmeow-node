---
title: "How to Download WhatsApp Media with Node.js"
sidebar_label: Download Media
sidebar_position: 4
description: "Download and save WhatsApp images, videos, audio, documents, and stickers to disk with Node.js using whatsmeow-node."
keywords: [download whatsapp media nodejs, save whatsapp images api, download whatsapp videos programmatically, whatsapp media download typescript]
---

import Head from '@docusaurus/Head';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/download-media.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/download-media.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Download WhatsApp Media with Node.js",
      "description": "Download and save WhatsApp images, videos, audio, documents, and stickers to disk with Node.js using whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/download-media.png",
      "step": [
        {"@type": "HowToStep", "name": "Listen for Incoming Messages", "text": "Subscribe to the message event and filter for media messages."},
        {"@type": "HowToStep", "name": "Detect the Media Type", "text": "Check for imageMessage, videoMessage, audioMessage, documentMessage, or stickerMessage fields."},
        {"@type": "HowToStep", "name": "Download with downloadAny()", "text": "Call downloadAny(message) to decrypt and save media to a temporary file."},
        {"@type": "HowToStep", "name": "Save to a Permanent Location", "text": "Copy the temp file to a permanent directory using fs.copyFile()."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Download WhatsApp Media with Node.js",
      "description": "Download and save WhatsApp images, videos, audio, documents, and stickers to disk with Node.js using whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/download-media.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Download WhatsApp Media with Node.js](/img/guides/download-media.png)
![How to Download WhatsApp Media with Node.js](/img/guides/download-media-light.png)

# How to Download WhatsApp Media with Node.js

whatsmeow-node can download any media type — images, videos, audio, documents, and stickers — with a single `downloadAny()` call. The file is decrypted and saved to a temporary path on disk.

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))

## Step 1: Listen for Incoming Messages

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;
  // Process the message...
});
```

## Step 2: Detect the Media Type

Check which media field is present on the message:

```typescript
function getMediaType(message: Record<string, unknown>): string | null {
  if (message.imageMessage) return "image";
  if (message.videoMessage) return "video";
  if (message.audioMessage) return "audio";
  if (message.documentMessage) return "document";
  if (message.stickerMessage) return "sticker";
  return null;
}
```

## Step 3: Download with `downloadAny()`

```typescript
const mediaType = getMediaType(message);
if (!mediaType) return;

const filePath = await client.downloadAny(message);
console.log(`Downloaded ${mediaType} to: ${filePath}`);
```

`downloadAny()` auto-detects the media type from the message and downloads the file. It handles decryption internally and returns the path to a temporary file.

## Step 4: Save to a Permanent Location

The temp file may be cleaned up by the OS. Copy it somewhere permanent:

```typescript
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const MEDIA_DIR = "./downloads";

async function saveMedia(
  tempPath: string,
  mediaType: string,
  messageId: string,
): Promise<string> {
  const dir = path.join(MEDIA_DIR, mediaType);
  await mkdir(dir, { recursive: true });

  // Get the file extension from the temp path
  const ext = path.extname(tempPath) || getDefaultExtension(mediaType);
  const dest = path.join(dir, `${messageId}${ext}`);

  await copyFile(tempPath, dest);
  return dest;
}

function getDefaultExtension(mediaType: string): string {
  switch (mediaType) {
    case "image": return ".jpg";
    case "video": return ".mp4";
    case "audio": return ".ogg";
    case "sticker": return ".webp";
    default: return ".bin";
  }
}
```

## Complete Example

A media saver bot that organizes downloads by type:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const client = createClient({ store: "session.db" });
const MEDIA_DIR = "./downloads";

function getMediaType(message: Record<string, unknown>): string | null {
  if (message.imageMessage) return "image";
  if (message.videoMessage) return "video";
  if (message.audioMessage) return "audio";
  if (message.documentMessage) return "document";
  if (message.stickerMessage) return "sticker";
  return null;
}

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const mediaType = getMediaType(message);
  if (!mediaType) return;

  console.log(`${mediaType} from ${info.pushName}`);

  const tempPath = await client.downloadAny(message);

  // Save permanently, organized by type
  const dir = path.join(MEDIA_DIR, mediaType);
  await mkdir(dir, { recursive: true });
  const ext = path.extname(tempPath) || ".bin";
  const dest = path.join(dir, `${info.id}${ext}`);
  await copyFile(tempPath, dest);

  console.log(`Saved to ${dest}`);

  // Acknowledge receipt
  await client.markRead([info.id], info.chat, info.sender);
  await client.sendMessage(info.chat, {
    conversation: `Saved your ${mediaType}!`,
  });
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! See: How to Pair WhatsApp");
    process.exit(1);
  }
  await client.connect();
  console.log("Listening for media...");

  process.on("SIGINT", async () => {
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Common Pitfalls

:::warning Temp files aren't permanent
`downloadAny()` saves to a temporary directory. The OS may delete these files at any time. Always copy media to a permanent location if you need to keep it.
:::

:::warning Field naming differences
When **receiving** messages, fields use proto casing: `fileSHA256`, `fileEncSHA256`. When passing arguments **to** `downloadMediaWithPath()`, use the method's parameter names: `fileHash`, `encFileHash`. See [Troubleshooting](/docs/troubleshooting/common-issues#proto-field-naming).
:::

:::warning Media links expire
WhatsApp media URLs expire after some time. Download media promptly when you receive it — you can't download it later once the link expires.
:::

## Next Steps

- [How to Send Stickers](send-stickers) — upload and send sticker media
- [How to Build a Bot](build-a-bot) — add media handling to a full bot
- [Media Examples](/docs/examples/media) — upload and send images, videos, audio, and documents
