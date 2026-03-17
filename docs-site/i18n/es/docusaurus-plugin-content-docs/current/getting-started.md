---
title: Primeros Pasos
sidebar_position: 3
description: "Guía de inicio rápido para whatsmeow-node — conéctate a WhatsApp, envía mensajes, maneja media y gestiona eventos en TypeScript."
keywords: [whatsmeow-node inicio rápido, tutorial bot whatsapp, enviar mensaje whatsapp nodejs, tutorial whatsapp typescript]
---

# Primeros Pasos

## Inicio rápido

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("qr", ({ code }) => console.log("Scan this QR:", code));
client.on("connected", ({ jid }) => console.log("Connected as", jid));
client.on("message", ({ info, message }) => {
  console.log(`${info.pushName}: ${message.conversation ?? JSON.stringify(message)}`);
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    await client.getQRChannel();
  }
  await client.connect();
}
main();
```

## Opciones del cliente

| Opción           | Tipo     | Por defecto | Descripción                              |
|------------------|----------|-------------|------------------------------------------|
| `store`          | `string` | requerido   | Ruta SQLite (`session.db`) o URL de Postgres (`postgresql://host/db`) |
| `binaryPath`     | `string` | auto        | Ruta al binario de Go (se resuelve automáticamente desde el paquete de plataforma) |
| `commandTimeout` | `number` | `30000`     | Timeout de comandos IPC en milisegundos  |

## Enviar mensajes

**Mensaje de texto:**

```typescript
await client.sendMessage("5512345678@s.whatsapp.net", {
  conversation: "Hello!",
});
```

**Responder a un mensaje:**

```typescript
await client.sendMessage(jid, {
  extendedTextMessage: {
    text: "This is a reply",
    contextInfo: {
      stanzaId: originalMessageId,
      participant: originalSenderJid,
      quotedMessage: { conversation: "the original text" },
    },
  },
});
```

**Imagen, ubicación, tarjeta de contacto** — usa `sendRawMessage` para cualquier estructura proto:

```typescript
// Upload then send an image
const media = await client.uploadMedia("/path/to/photo.jpg", "image");
await client.sendRawMessage(jid, {
  imageMessage: {
    URL: media.URL,
    directPath: media.directPath,
    mediaKey: media.mediaKey,
    fileEncSHA256: media.fileEncSHA256,
    fileSHA256: media.fileSHA256,
    fileLength: String(media.fileLength),
    mimetype: "image/jpeg",
    caption: "Check this out",
  },
});

// Send a location
await client.sendRawMessage(jid, {
  locationMessage: {
    degreesLatitude: -34.9011,
    degreesLongitude: -56.1645,
    name: "Montevideo",
  },
});

// Send a contact card
await client.sendRawMessage(jid, {
  contactMessage: {
    displayName: "John Doe",
    vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+1234567890\nEND:VCARD",
  },
});
```

`sendRawMessage` acepta cualquier `Record<string, unknown>` que coincida con el [esquema proto `waE2E.Message` de whatsmeow](https://pkg.go.dev/go.mau.fi/whatsmeow/proto/waE2E#Message).

## Descargar media

Cuando recibes un mensaje con media, descárgalo a un archivo temporal:

```typescript
client.on("message", async ({ info, message }) => {
  // downloadAny auto-detects the media type
  if (message.imageMessage || message.videoMessage || message.audioMessage || message.documentMessage) {
    const filePath = await client.downloadAny(message);
    console.log("Media saved to:", filePath);
  }
});
```

Para más control, usa `downloadMediaWithPath` con claves explícitas:

```typescript
const filePath = await client.downloadMediaWithPath({
  directPath: msg.imageMessage.directPath,
  mediaKey: msg.imageMessage.mediaKey,
  fileHash: msg.imageMessage.fileSHA256,
  encFileHash: msg.imageMessage.fileEncSHA256,
  fileLength: msg.imageMessage.fileLength,
  mediaType: "image",
});
```

:::info Nombres de campos
Al **recibir** mensajes, los nombres de campo siguen el casing de proto (`fileSHA256`, `fileEncSHA256`).
Al pasar argumentos **a los métodos de descarga**, usa los nombres de parámetros propios del método (`fileHash`, `encFileHash`).
Consulta [Solución de problemas](/docs/troubleshooting/common-issues#proto-field-naming) para más detalles.
:::

## Cerrar limpiamente

```typescript
await client.disconnect();
client.close();
```
