---
title: Ejemplos de Medios
sidebar_label: Medios
sidebar_position: 4
description: "Sube y envía imágenes, videos, audio, documentos y stickers en WhatsApp con Node.js y TypeScript. Incluye ejemplos de descarga."
keywords: [enviar imagen whatsapp nodejs, whatsapp subir medios typescript, whatsapp sticker api nodejs, enviar video audio whatsapp api]
---

# Medios

:::tip Buscas un tutorial paso a paso?
Consulta [Cómo Enviar Stickers](/docs/guides/send-stickers) y [Cómo Descargar Medios](/docs/guides/download-media).
:::

Subida y envío de imágenes, video, audio, documentos y stickers. Todos los medios siguen el mismo patrón de dos pasos: subir y luego enviar.

## Enviar una Imagen

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
Los campos de respuesta de upload usan el casing exacto de protobuf: `URL`, `fileSHA256`, `fileEncSHA256` — **no** `url`, `fileSha256`, `fileEncSha256`. Usar el casing incorrecto fallará silenciosamente.
:::

[Código fuente completo: `media-send.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/media-send.ts)

---

## Enviar Video, Audio y Documentos

Los tres tipos de medios siguen el mismo patrón de subida + envío con campos proto específicos para cada tipo.

### Paso de subida compartido

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

### Audio (nota de voz)

```typescript
await client.sendRawMessage(jid, {
  audioMessage: {
    ...sharedFields,
    ptt: true,  // true = voice note (blue mic icon), false = audio file
    // seconds: 15,
  },
});
```

### Documento

```typescript
await client.sendRawMessage(jid, {
  documentMessage: {
    ...sharedFields,
    fileName: "report.pdf",  // displayed as the document title
    caption: "Sent from whatsmeow-node",
  },
});
```

[Código fuente completo: `media-send-all.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/media-send-all.ts)

---

## Enviar un Sticker

Los stickers usan el mismo flujo de subida pero requieren formato WebP y dimensiones explícitas.

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
`width` y `height` son obligatorios para stickers. Sin ellos, WhatsApp puede mostrar el sticker como un archivo adjunto genérico. El tamaño estándar de sticker es 512x512.
:::

[Código fuente completo: `sticker-send.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/sticker-send.ts)

---

## Descargar Medios Entrantes

Escucha stickers entrantes (o cualquier medio) y guárdalos en disco.

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
`downloadAny()` funciona con cualquier tipo de medio — imágenes, videos, audio, documentos y stickers. Solo verifica el campo de mensaje apropiado (`imageMessage`, `videoMessage`, `audioMessage`, `documentMessage`, `stickerMessage`).
:::

[Código fuente completo: `sticker-download.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/sticker-download.ts)
