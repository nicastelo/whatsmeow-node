---
title: "Cómo Transcribir Notas de Voz de WhatsApp con IA"
sidebar_label: Transcribir Notas de Voz
sidebar_position: 28
description: "Transcribe automáticamente las notas de voz de WhatsApp con la API de speech-to-text de OpenAI y responde con la transcripción, usando whatsmeow-node y Node.js."
keywords: [transcribir notas de voz whatsapp, audio de whatsapp a texto, bot transcripción audios whatsapp, whatsapp voz a texto nodejs, transcripción openai whatsapp, bot notas de voz whatsapp typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/transcribe-voice-notes.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/transcribe-voice-notes.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Transcribir Notas de Voz de WhatsApp con IA",
      "description": "Transcribe automáticamente las notas de voz de WhatsApp con la API de speech-to-text de OpenAI y responde con la transcripción, usando whatsmeow-node y Node.js.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/transcribe-voice-notes.png",
      "step": [
        {"@type": "HowToStep", "name": "Configurar Ambos Clientes", "text": "Inicializa WhatsmeowClient con createClient() y el cliente de OpenAI con new OpenAI()."},
        {"@type": "HowToStep", "name": "Detectar Notas de Voz", "text": "Escucha el evento message y verifica que haya un audioMessage con PTT en true."},
        {"@type": "HowToStep", "name": "Descargar el Audio", "text": "Llama a downloadAny() para desencriptar la nota de voz en un archivo temporal y renómbralo con extensión .ogg."},
        {"@type": "HowToStep", "name": "Transcribir con OpenAI", "text": "Envía el archivo a openai.audio.transcriptions.create() con el modelo gpt-transcribe."},
        {"@type": "HowToStep", "name": "Responder con la Transcripción", "text": "Envía el texto como respuesta citada usando contextInfo.stanzaID y participant, y luego elimina el archivo temporal."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Transcribir Notas de Voz de WhatsApp con IA",
      "description": "Transcribe automáticamente las notas de voz de WhatsApp con la API de speech-to-text de OpenAI y responde con la transcripción, usando whatsmeow-node y Node.js.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/transcribe-voice-notes.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Transcribir Notas de Voz de WhatsApp con IA](/img/guides/es/transcribe-voice-notes.png)
![Cómo Transcribir Notas de Voz de WhatsApp con IA](/img/guides/es/transcribe-voice-notes-light.png)

# Cómo Transcribir Notas de Voz de WhatsApp con IA

No siempre se puede escuchar una nota de voz en el momento. Esta guía construye un bot que toma las notas de voz entrantes de WhatsApp, las transcribe con la API de speech-to-text de OpenAI y responde con la transcripción citando el audio original. En grupos, solo transcribe cuando se lo piden.

## Requisitos Previos

- Una sesión vinculada de whatsmeow-node ([Cómo Vincular](pair-whatsapp))
- Una API key de OpenAI (configurada como variable de entorno `OPENAI_API_KEY`)
- El SDK de OpenAI: `npm install openai`

## Paso 1: Configurar Ambos Clientes

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import OpenAI from "openai";

const client = createClient({ store: "session.db" });
const openai = new OpenAI(); // reads OPENAI_API_KEY from env

const TRANSCRIBE_MODEL = "gpt-transcribe";
```

`gpt-transcribe` es el modelo recomendado por OpenAI para transcribir audio grabado. `gpt-4o-transcribe` y `gpt-4o-mini-transcribe` también funcionan. Usa `whisper-1` si necesitas marcas de tiempo por palabra o formatos de subtítulos (SRT/VTT). Consulta la [guía de speech-to-text de OpenAI](https://developers.openai.com/api/docs/guides/speech-to-text) para ver la lista actual.

## Paso 2: Detectar Notas de Voz Entrantes

Las notas de voz y los archivos de audio normales llegan como `audioMessage`. La diferencia es el flag `PTT` ("push to talk"), que usa la notación proto exacta, todo en mayúsculas:

```typescript
interface AudioMessage {
  PTT?: boolean;
  seconds?: number;
  mimetype?: string;
  fileLength?: string; // uint64 → string in protojson
}

function getVoiceNote(message: Record<string, unknown>): AudioMessage | null {
  const audio = message.audioMessage as AudioMessage | undefined;
  return audio?.PTT ? audio : null;
}
```

Los mensajes se serializan desde el protobuf `waE2E.Message` con protojson, así que los enteros de 64 bits como `fileLength` llegan como **strings**, mientras que `seconds` es un número. Las notas de voz normalmente tienen un `mimetype` de `audio/ogg; codecs=opus`.

## Paso 3: Descargar la Nota de Voz

```typescript
import { rename } from "node:fs/promises";

const tempPath = await client.downloadAny({ audioMessage: message.audioMessage });
const oggPath = `${tempPath}.ogg`;
await rename(tempPath, oggPath);
```

`downloadAny()` desencripta el archivo multimedia y lo guarda en un archivo temporal. El archivo **no tiene extensión**, y OpenAI necesita suficientes metadatos de formato para identificar el audio (recomienda un nombre de archivo con extensión), así que renómbralo a `.ogg` antes de subirlo. (Consulta [Cómo Descargar Multimedia](download-media) para más detalles sobre `downloadAny()`.)

## Paso 4: Transcribir con OpenAI

Combina la descarga y la llamada a la API en una sola función. El bloque `finally` elimina el archivo temporal tanto si la transcripción funciona como si falla:

```typescript
import { createReadStream } from "node:fs";
import { rename, stat, unlink } from "node:fs/promises";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // OpenAI's per-file limit

async function transcribe(message: Record<string, unknown>): Promise<string> {
  // Downloads + decrypts to a temp file with no extension
  const tempPath = await client.downloadAny(message);
  const oggPath = `${tempPath}.ogg`;
  await rename(tempPath, oggPath);

  try {
    const { size } = await stat(oggPath);
    if (size > MAX_UPLOAD_BYTES) {
      throw new Error(`Voice note too large (${size} bytes)`);
    }

    const result = await openai.audio.transcriptions.create({
      file: createReadStream(oggPath),
      model: TRANSCRIBE_MODEL,
    });
    return result.text.trim();
  } finally {
    await unlink(oggPath).catch(() => {});
  }
}
```

La [referencia de la API de transcripción](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create) incluye `ogg` como formato de entrada soportado (junto con `flac`, `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav` y `webm`), así que no necesitas ffmpeg para convertir el audio Opus de WhatsApp. Si algún modelo rechaza el archivo por formato no soportado, conviértelo a MP3 con ffmpeg y sube ese archivo.

## Paso 5: Responder con la Transcripción

Cita la nota de voz original para que quede claro a qué audio corresponde la transcripción. Los campos de `contextInfo` usan la notación proto exacta: `stanzaID` (no `stanzaId`) y `participant`:

```typescript
await client.sendChatPresence(info.chat, "composing"); // show "typing..." while transcribing

const text = await transcribe({ audioMessage: message.audioMessage });

await client.sendMessage(info.chat, {
  extendedTextMessage: {
    text: `Transcript: ${text || "(no speech detected)"}`,
    contextInfo: {
      stanzaID: info.id,
      participant: info.sender,
      quotedMessage: { audioMessage: message.audioMessage },
    },
  },
});
```

Los indicadores de escritura podrían no aparecer si no has llamado a `sendPresence("available")`, así que el ejemplo completo lo establece justo después de conectarse. Enviar el mensaje quita el indicador de escritura automáticamente. Si en cambio vas a responder con una nota de voz propia, usa `sendChatPresence(info.chat, "composing", "audio")` para mostrar "grabando audio..." — consulta [Indicadores de Escritura](typing-indicators).

## Paso 6: Manejar Grupos

Transcribir cada nota de voz en un grupo activo genera ruido y consume créditos de la API, y las notas de voz no pueden @mencionar a nadie. Un patrón más amigable: transcribir solo cuando un miembro responde a una nota de voz con `!transcribe`. La nota de voz citada está disponible en el `contextInfo` de la respuesta:

```typescript
const GROUP_COMMAND = "!transcribe";

interface VoiceNote {
  /** A message object containing only the audioMessage — what downloadAny() needs. */
  message: Record<string, unknown>;
  /** ID and sender of the voice note, for the quoted reply. */
  stanzaID: string;
  participant: string;
}

function getQuotedVoiceNote(message: Record<string, unknown>): VoiceNote | null {
  const ext = message.extendedTextMessage as
    | {
        text?: string;
        contextInfo?: {
          stanzaID?: string;
          participant?: string;
          quotedMessage?: Record<string, unknown>;
        };
      }
    | undefined;
  if (ext?.text?.trim().toLowerCase() !== GROUP_COMMAND) return null;

  const ctx = ext.contextInfo;
  if (!ctx?.quotedMessage || !ctx.stanzaID || !ctx.participant) return null;
  if (!getVoiceNote(ctx.quotedMessage)) return null;

  return {
    message: { audioMessage: ctx.quotedMessage.audioMessage },
    stanzaID: ctx.stanzaID,
    participant: ctx.participant,
  };
}
```

La respuesta cita entonces la **nota de voz** (usando el `stanzaID` y `participant` del mensaje citado), no el comando `!transcribe`.

## Opcional: Responder a la Nota de Voz con un LLM

Una transcripción es solo texto, así que puedes pasarla a un chatbot y responder a la nota de voz en lugar de (o además de) transcribirla:

```typescript
const transcript = await transcribe({ audioMessage: message.audioMessage });

const response = await openai.chat.completions.create({
  model: "gpt-6-astra",
  messages: [
    { role: "system", content: "You are a helpful WhatsApp assistant. Reply concisely." },
    { role: "user", content: transcript },
  ],
});

await client.sendMessage(info.chat, {
  conversation: response.choices[0].message.content ?? "I couldn't generate a response.",
});
```

Para historial de conversación por usuario y manejo de errores, consulta [Cómo Conectar WhatsApp a ChatGPT](connect-to-chatgpt).

## Ejemplo Completo

Transcribe cada nota de voz en chats directos, y las notas de voz citadas con `!transcribe` en grupos:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import OpenAI from "openai";
import { createReadStream } from "node:fs";
import { rename, stat, unlink } from "node:fs/promises";

const client = createClient({ store: "session.db" });
const openai = new OpenAI(); // reads OPENAI_API_KEY from env

const TRANSCRIBE_MODEL = "gpt-transcribe";
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // OpenAI's per-file limit
const GROUP_COMMAND = "!transcribe";

interface AudioMessage {
  PTT?: boolean;
  seconds?: number;
  mimetype?: string;
  fileLength?: string; // uint64 → string in protojson
}

interface VoiceNote {
  /** A message object containing only the audioMessage — what downloadAny() needs. */
  message: Record<string, unknown>;
  /** ID and sender of the voice note, for the quoted reply. */
  stanzaID: string;
  participant: string;
}

function getVoiceNote(message: Record<string, unknown>): AudioMessage | null {
  const audio = message.audioMessage as AudioMessage | undefined;
  return audio?.PTT ? audio : null;
}

/** In groups: find a voice note quoted by a "!transcribe" reply. */
function getQuotedVoiceNote(message: Record<string, unknown>): VoiceNote | null {
  const ext = message.extendedTextMessage as
    | {
        text?: string;
        contextInfo?: {
          stanzaID?: string;
          participant?: string;
          quotedMessage?: Record<string, unknown>;
        };
      }
    | undefined;
  if (ext?.text?.trim().toLowerCase() !== GROUP_COMMAND) return null;

  const ctx = ext.contextInfo;
  if (!ctx?.quotedMessage || !ctx.stanzaID || !ctx.participant) return null;
  if (!getVoiceNote(ctx.quotedMessage)) return null;

  return {
    message: { audioMessage: ctx.quotedMessage.audioMessage },
    stanzaID: ctx.stanzaID,
    participant: ctx.participant,
  };
}

async function transcribe(message: Record<string, unknown>): Promise<string> {
  // Downloads + decrypts to a temp file with no extension
  const tempPath = await client.downloadAny(message);
  const oggPath = `${tempPath}.ogg`;
  await rename(tempPath, oggPath);

  try {
    const { size } = await stat(oggPath);
    if (size > MAX_UPLOAD_BYTES) {
      throw new Error(`Voice note too large (${size} bytes)`);
    }

    const result = await openai.audio.transcriptions.create({
      file: createReadStream(oggPath),
      model: TRANSCRIBE_MODEL,
    });
    return result.text.trim();
  } finally {
    await unlink(oggPath).catch(() => {});
  }
}

async function replyWithTranscript(chat: string, note: VoiceNote, text: string) {
  await client.sendMessage(chat, {
    extendedTextMessage: {
      text: `Transcript: ${text || "(no speech detected)"}`,
      contextInfo: {
        stanzaID: note.stanzaID,
        participant: note.participant,
        quotedMessage: note.message,
      },
    },
  });
}

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  let note: VoiceNote | null = null;
  if (!info.isGroup && getVoiceNote(message)) {
    // Direct chats: transcribe every voice note automatically
    note = {
      message: { audioMessage: message.audioMessage },
      stanzaID: info.id,
      participant: info.sender,
    };
  } else if (info.isGroup) {
    // Groups: only transcribe when someone replies "!transcribe" to a voice note
    note = getQuotedVoiceNote(message);
  }
  if (!note) return;

  console.log(`Voice note from ${info.pushName} in ${info.chat}`);

  // Async listeners must catch their own errors, or a failed call becomes an unhandled rejection
  try {
    await client.sendChatPresence(info.chat, "composing");
    const text = await transcribe(note.message);
    await replyWithTranscript(info.chat, note, text);
    console.log(`→ ${text.slice(0, 80)}`);
  } catch (err) {
    console.error("Transcription failed:", err);
    await client
      .sendMessage(info.chat, { conversation: "Sorry, I couldn't transcribe that voice note." })
      .catch((e) => console.error("Failed to send error reply:", e));
  }
});

client.on("logged_out", ({ reason }) => {
  console.error(`Logged out: ${reason}`);
  client.close();
  process.exit(1);
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! See: How to Pair WhatsApp");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available"); // needed for the typing indicator to show
  console.log("Voice note transcriber is online!");

  process.on("SIGINT", async () => {
    try {
      await client.sendPresence("unavailable");
      await client.disconnect();
    } catch (err) {
      console.error("Shutdown error:", err);
    } finally {
      client.close();
      process.exit(0);
    }
  });
}

main().catch(console.error);
```

## Transcripción Local

Si no puedes enviar audio a una API de terceros (por privacidad, costo o uso sin conexión), puedes ejecutar un modelo Whisper de código abierto en tu propio hardware — por ejemplo [whisper.cpp](https://github.com/ggml-org/whisper.cpp) o [faster-whisper](https://github.com/SYSTRAN/faster-whisper). La parte de WhatsApp no cambia: descarga con `downloadAny()`, pasa la ruta del archivo a tu transcriptor local (normalmente mediante un proceso hijo o un pequeño servicio HTTP) y responde con el texto. Algunas herramientas locales solo aceptan WAV, así que puede que necesites convertir el audio Opus con ffmpeg primero.

## Errores Comunes

:::warning Los archivos temporales no tienen extensión
`downloadAny()` escribe en un archivo temporal sin extensión. OpenAI necesita suficientes metadatos de formato para identificar el audio y recomienda un nombre de archivo con extensión, así que renombra el archivo a `.ogg` (o súbelo con `toFile(buffer, "voice.ogg")` del paquete `openai`). Sin ella, la solicitud puede ser rechazada por formato no soportado.
:::

:::warning Límite de subida de 25 MB
La API de transcripción de OpenAI acepta archivos de hasta 25 MB. Con el bitrate de las notas de voz de WhatsApp eso es una grabación muy larga, pero verifica el tamaño (o `audioMessage.seconds`) antes de subir y omite o divide lo que sea demasiado grande. Los *archivos* de audio reenviados pueden ser mucho más grandes que las notas de voz.
:::

:::warning Siempre limpia los archivos temporales
Cada descarga crea un nuevo archivo temporal. Elimínalo en un bloque `finally` — de lo contrario, un bot con mucho tráfico va llenando el disco, y guardas mensajes de voz privados más tiempo del necesario.
:::

:::warning Notación: `PTT` y `stanzaID`
Los campos de los mensajes usan la notación proto exacta. Es `audioMessage.PTT`, no `ptt`, y `contextInfo.stanzaID`, no `stanzaId`. Una notación incorrecta en mensajes recibidos devuelve `undefined` en silencio; en mensajes enviados se rechaza con un error `unknown field`.
:::

:::warning Grupos y privacidad
Transcribir automáticamente cada nota de voz de un grupo publica el audio privado de otras personas como texto para que todos lo lean. Transcribe solo cuando te lo pidan (como en el Paso 6), y asegúrate de que los miembros sepan que un bot procesa sus audios con una API de terceros.
:::

<RelatedGuides slugs={["connect-to-chatgpt", "download-media", "typing-indicators", "connect-to-ollama"]} />
