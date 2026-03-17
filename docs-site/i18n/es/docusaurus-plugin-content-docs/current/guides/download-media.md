---
title: "Cómo Descargar Multimedia de WhatsApp con Node.js"
sidebar_label: Descargar Multimedia
sidebar_position: 4
description: "Descarga y guarda imágenes, videos, audio, documentos y stickers de WhatsApp en disco con Node.js usando whatsmeow-node."
keywords: [descargar multimedia whatsapp nodejs, guardar imágenes whatsapp api, descargar videos whatsapp programáticamente, descarga multimedia whatsapp typescript]
---

# Cómo Descargar Multimedia de WhatsApp con Node.js

whatsmeow-node puede descargar cualquier tipo de multimedia — imágenes, videos, audio, documentos y stickers — con una sola llamada a `downloadAny()`. El archivo se desencripta y se guarda en una ruta temporal en disco.

## Requisitos Previos

- Una sesión de whatsmeow-node vinculada ([Cómo Vincular](pair-whatsapp))

## Paso 1: Escuchar Mensajes Entrantes

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;
  // Process the message...
});
```

## Paso 2: Detectar el Tipo de Multimedia

Verifica qué campo de multimedia está presente en el mensaje:

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

## Paso 3: Descargar con `downloadAny()`

```typescript
const mediaType = getMediaType(message);
if (!mediaType) return;

const filePath = await client.downloadAny(message);
console.log(`Downloaded ${mediaType} to: ${filePath}`);
```

`downloadAny()` auto-detecta el tipo de multimedia del mensaje y descarga el archivo. Maneja la desencriptación internamente y devuelve la ruta a un archivo temporal.

## Paso 4: Guardar en una Ubicación Permanente

El archivo temporal puede ser limpiado por el sistema operativo. Cópialo a una ubicación permanente:

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

## Ejemplo Completo

Un bot que guarda multimedia y las organiza por tipo:

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

## Errores Comunes

:::warning Los archivos temporales no son permanentes
`downloadAny()` guarda en un directorio temporal. El sistema operativo puede eliminar estos archivos en cualquier momento. Siempre copia los archivos multimedia a una ubicación permanente si necesitas conservarlos.
:::

:::warning Diferencias en nombres de campos
Al **recibir** mensajes, los campos usan la notación proto: `fileSHA256`, `fileEncSHA256`. Al pasar argumentos **a** `downloadMediaWithPath()`, usa los nombres de parámetros del método: `fileHash`, `encFileHash`. Consulta [Solución de Problemas](/docs/troubleshooting/common-issues#proto-field-naming).
:::

:::warning Los enlaces de multimedia expiran
Las URLs de multimedia de WhatsApp expiran después de un tiempo. Descarga los archivos multimedia rápidamente cuando los recibas — no podrás descargarlos después de que el enlace expire.
:::

## Siguientes Pasos

- [Cómo Enviar Stickers](send-stickers) — sube y envía stickers
- [Cómo Crear un Bot](build-a-bot) — agrega manejo de multimedia a un bot completo
- [Ejemplos de Multimedia](/docs/examples/media) — sube y envía imágenes, videos, audio y documentos
