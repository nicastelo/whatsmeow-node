---
title: Exemplos de Midia
sidebar_label: Midia
sidebar_position: 4
description: "Faca upload e envie imagens, videos, audio, documentos e stickers no WhatsApp com Node.js e TypeScript. Inclui exemplos de download."
keywords: [enviar imagem whatsapp nodejs, whatsapp upload midia typescript, whatsapp sticker api nodejs, enviar video audio whatsapp api]
---

# Midia

:::tip Procurando um tutorial passo a passo?
Veja [Como Enviar Stickers](/docs/guides/send-stickers) e [Como Baixar Midia](/docs/guides/download-media).
:::

Upload e envio de imagens, video, audio, documentos e stickers. Toda midia segue o mesmo padrao de duas etapas: upload, depois envio.

## Enviar uma Imagem

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
Os campos da resposta de upload usam a mesma capitalizacao do protobuf: `URL`, `fileSHA256`, `fileEncSHA256` — **nao** `url`, `fileSha256`, `fileEncSha256`. Usar a capitalizacao errada vai falhar silenciosamente.
:::

[Codigo fonte completo: `media-send.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/media-send.ts)

---

## Enviar Video, Audio e Documentos

Os tres tipos de midia seguem o mesmo padrao de upload + envio com campos proto especificos de cada tipo.

### Etapa de upload compartilhada

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

[Codigo fonte completo: `media-send-all.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/media-send-all.ts)

---

## Enviar um Sticker

Stickers usam o mesmo fluxo de upload mas requerem formato WebP e dimensoes explicitas.

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
`width` e `height` sao obrigatorios para stickers. Sem eles, o WhatsApp pode exibir o sticker como um anexo de arquivo generico. O tamanho padrao de sticker e 512x512.
:::

[Codigo fonte completo: `sticker-send.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/sticker-send.ts)

---

## Baixar Midia Recebida

Ouca stickers recebidos (ou qualquer midia) e salve em disco.

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
`downloadAny()` funciona com qualquer tipo de midia — imagens, videos, audio, documentos e stickers. Basta verificar o campo apropriado da mensagem (`imageMessage`, `videoMessage`, `audioMessage`, `documentMessage`, `stickerMessage`).
:::

[Codigo fonte completo: `sticker-download.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/sticker-download.ts)
