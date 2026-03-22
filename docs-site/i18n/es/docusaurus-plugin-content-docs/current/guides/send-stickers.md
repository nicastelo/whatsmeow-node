---
title: "Cómo Enviar Stickers en WhatsApp con Node.js"
sidebar_label: Enviar Stickers
sidebar_position: 3
description: "Envía y recibe stickers de WhatsApp programáticamente con Node.js — sube archivos WebP, configura dimensiones y descarga stickers entrantes."
keywords: [enviar stickers bot whatsapp, api stickers whatsapp nodejs, enviar sticker webp whatsapp, descargar stickers whatsapp nodejs]
---

import Head from '@docusaurus/Head';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/send-stickers.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/send-stickers.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Enviar Stickers en WhatsApp con Node.js",
      "description": "Envía y recibe stickers de WhatsApp programáticamente con Node.js — sube archivos WebP, configura dimensiones y descarga stickers entrantes.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/send-stickers.png",
      "step": [
        {"@type": "HowToStep", "name": "Subir el archivo del sticker", "text": "Usa uploadMedia() con la ruta del archivo WebP y el tipo de multimedia 'image'."},
        {"@type": "HowToStep", "name": "Enviar el mensaje de sticker", "text": "Usa sendRawMessage con stickerMessage incluyendo width, height (512x512) y mimetype image/webp."},
        {"@type": "HowToStep", "name": "Descargar stickers entrantes", "text": "Escucha los mensajes con stickerMessage y llama a downloadAny() para guardarlos en disco."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Enviar Stickers en WhatsApp con Node.js",
      "description": "Envía y recibe stickers de WhatsApp programáticamente con Node.js — sube archivos WebP, configura dimensiones y descarga stickers entrantes.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/send-stickers.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Enviar Stickers en WhatsApp con Node.js](/img/guides/es/send-stickers.png)
![Cómo Enviar Stickers en WhatsApp con Node.js](/img/guides/es/send-stickers-light.png)

# Cómo Enviar Stickers en WhatsApp con Node.js

Los stickers en WhatsApp son imágenes WebP enviadas con la estructura protobuf `stickerMessage`. whatsmeow-node maneja la subida y encriptación — tú solo proporcionas el archivo y las dimensiones.

## Requisitos Previos

- Una sesión de whatsmeow-node vinculada ([Cómo Vincular](pair-whatsapp))
- Una imagen de sticker en formato WebP, idealmente de 512x512 píxeles

## Paso 1: Subir el Archivo del Sticker

Los stickers usan el mismo flujo de subida que las imágenes. El método `uploadMedia` encripta y sube el archivo a los servidores de WhatsApp:

```typescript
const media = await client.uploadMedia("/path/to/sticker.webp", "image");
```

El objeto devuelto contiene los metadatos del archivo multimedia encriptado que necesitarás para enviar.

## Paso 2: Enviar el Mensaje de Sticker

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
`width` y `height` son obligatorios. Sin ellos, WhatsApp podría mostrar el sticker como un archivo adjunto genérico en lugar de renderizarlo en línea. El tamaño estándar de sticker es 512x512.
:::

## Paso 3: Descargar Stickers Entrantes

Escucha los mensajes y usa `downloadAny()` para guardar los stickers entrantes en disco:

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
`downloadAny()` guarda en un archivo temporal. Si necesitas conservar el sticker permanentemente, cópialo a una ubicación estable con `fs.copyFile()`. Consulta [Cómo Descargar Multimedia](download-media) para más detalles.
:::

## Ejemplo Completo

Un bot que reenvía stickers de vuelta y guarda los entrantes:

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

## Errores Comunes

:::warning Mayúsculas/minúsculas en campos proto
Los campos de respuesta de subida usan las mayúsculas/minúsculas exactas de protobuf: `URL`, `fileSHA256`, `fileEncSHA256` — **no** `url`, `fileSha256`. Usar las mayúsculas incorrectas hará que falle silenciosamente y el sticker no se entregará.
:::

:::warning Mimetype incorrecto
Siempre usa `"image/webp"` para stickers. Enviar un PNG o JPEG como sticker fallará o se mostrará como una imagen normal.
:::

:::warning Tipo de subida
Usa `"image"` como tipo de archivo multimedia al llamar a `uploadMedia()`, aunque sea un sticker. La encriptación se maneja de la misma forma.
:::

## Siguientes Pasos

- [Cómo Descargar Multimedia](download-media) — descarga cualquier tipo de archivo multimedia
- [Cómo Crear un Bot](build-a-bot) — agrega soporte de stickers a un bot completo
- [Ejemplos de Multimedia](/docs/examples/media) — envía imágenes, videos, audio y documentos
