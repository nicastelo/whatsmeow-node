---
title: "Cómo Enviar Mensajes de WhatsApp desde TypeScript"
sidebar_label: Enviar Mensajes (TypeScript)
sidebar_position: 9
description: "Envía mensajes de WhatsApp desde TypeScript con tipado completo — texto, respuestas, menciones, multimedia, encuestas y reacciones usando whatsmeow-node."
keywords: [enviar mensaje whatsapp typescript, whatsapp api typescript, whatsapp bot typescript, enviar texto whatsapp nodejs, whatsapp typescript librería]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/send-messages-typescript.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/send-messages-typescript.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Enviar Mensajes de WhatsApp desde TypeScript",
      "description": "Envía mensajes de WhatsApp desde TypeScript con tipado completo — texto, respuestas, menciones, multimedia, encuestas y reacciones usando whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/send-messages-typescript.png",
      "step": [
        {"@type": "HowToStep", "name": "Configurar el cliente", "text": "Instala whatsmeow-node y crea un cliente con createClient(). Vincula vía QR code en la primera ejecución."},
        {"@type": "HowToStep", "name": "Enviar un mensaje de texto", "text": "Usa sendMessage(jid, { conversation: text }) para mensajes simples."},
        {"@type": "HowToStep", "name": "Responder con citas y menciones", "text": "Usa sendRawMessage con extendedTextMessage y contextInfo para respuestas citadas y @menciones."},
        {"@type": "HowToStep", "name": "Enviar mensajes multimedia", "text": "Sube archivos con uploadMedia(), luego envía con sendRawMessage usando los metadatos de multimedia devueltos."},
        {"@type": "HowToStep", "name": "Reaccionar, editar y eliminar", "text": "Usa sendReaction(), editMessage() y revokeMessage() para interactuar con los mensajes enviados."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Enviar Mensajes de WhatsApp desde TypeScript",
      "description": "Envía mensajes de WhatsApp desde TypeScript con tipado completo — texto, respuestas, menciones, multimedia, encuestas y reacciones usando whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/send-messages-typescript.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/send-messages-typescript.png"}}
    })}
  </script>
</Head>

![Cómo Enviar Mensajes de WhatsApp desde TypeScript](/img/guides/es/send-messages-typescript.png)
![Cómo Enviar Mensajes de WhatsApp desde TypeScript](/img/guides/es/send-messages-typescript-light.png)

# Cómo Enviar Mensajes de WhatsApp desde TypeScript

whatsmeow-node te da métodos async tipados para cada tipo de mensaje de WhatsApp — texto, respuestas, menciones, multimedia, encuestas y reacciones. Esta guía cubre cada uno con ejemplos en TypeScript.

## Requisitos Previos

- whatsmeow-node instalado ([Guía de instalación](/docs/installation))
- Una sesión vinculada ([Cómo Vincular WhatsApp](pair-whatsapp))

## Configurar el Cliente

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

async function main() {
  const { jid: myJid } = await client.init();
  if (!myJid) {
    console.error("Not paired — run the pairing flow first");
    process.exit(1);
  }
  await client.connect();
  await client.waitForConnection();

  const recipient = "5512345678@s.whatsapp.net";

  // ... send messages here
}

main().catch(console.error);
```

## Enviar un Mensaje de Texto

La forma más simple — pasa un string `conversation`:

```typescript
const resp = await client.sendMessage(recipient, {
  conversation: "Hello from TypeScript!",
});

console.log(`Sent with ID: ${resp.id}`);
```

`sendMessage` es el método de alto nivel. Recibe un JID y un objeto `MessageContent`, y devuelve un `SendResponse` con el `id` y `timestamp` del mensaje.

## Responder con Cita

Para mostrar el mensaje original en una burbuja de cita, usa `sendRawMessage` con `contextInfo`:

```typescript
// Assume we received a message and have its info
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  await client.sendRawMessage(info.chat, {
    extendedTextMessage: {
      text: `You said: "${text}"`,
      contextInfo: {
        stanzaId: info.id,
        participant: info.sender,
        quotedMessage: { conversation: text },
      },
    },
  });
});
```

## @Mencionar Usuarios

Incluye los JID en `mentionedJid` y usa `@<número>` en el texto:

```typescript
await client.sendRawMessage(groupJid, {
  extendedTextMessage: {
    text: `Hey @${memberJid.split("@")[0]}, check this out!`,
    contextInfo: {
      mentionedJid: [memberJid],
    },
  },
});
```

Para mencionar a todos en un grupo:

```typescript
const group = await client.getGroupInfo(groupJid);
const jids = group.participants.map((p) => p.jid);
const mentions = jids.map((j) => `@${j.split("@")[0]}`).join(" ");

await client.sendRawMessage(groupJid, {
  extendedTextMessage: {
    text: `Attention: ${mentions}`,
    contextInfo: { mentionedJid: jids },
  },
});
```

## Enviar Multimedia

Primero sube el archivo, luego envía los metadatos con un mensaje raw:

```typescript
// Upload an image
const media = await client.uploadMedia("/path/to/photo.jpg", "image");

await client.sendRawMessage(recipient, {
  imageMessage: {
    URL: media.URL,
    directPath: media.directPath,
    mediaKey: media.mediaKey,
    fileEncSHA256: media.fileEncSHA256,
    fileSHA256: media.fileSHA256,
    fileLength: String(media.fileLength),
    mimetype: "image/jpeg",
    caption: "Check this out!",
  },
});
```

Otros tipos de multimedia siguen el mismo patrón — `videoMessage`, `audioMessage`, `documentMessage`, `stickerMessage`.

:::warning Casing de campos proto
Los campos de respuesta de upload usan el casing exacto de protobuf: `URL`, `fileSHA256`, `fileEncSHA256` — **no** `url`, `fileSha256`. Un casing incorrecto falla silenciosamente.
:::

## Enviar una Encuesta

```typescript
const resp = await client.sendPollCreation(
  groupJid,
  "Where should we eat?",       // question
  ["Pizza", "Sushi", "Tacos"],   // options
  1,                              // max selectable
);
```

## Reaccionar a un Mensaje

```typescript
// Add a reaction
await client.sendReaction(chat, senderJid, messageId, "🔥");

// Remove a reaction (empty string)
await client.sendReaction(chat, senderJid, messageId, "");
```

## Editar un Mensaje Enviado

```typescript
const sent = await client.sendMessage(recipient, {
  conversation: "Hello!",
});

// Edit it — only works on your own messages
await client.editMessage(recipient, sent.id, {
  conversation: "Hello! (edited)",
});
```

## Eliminar un Mensaje

```typescript
// Revoke for everyone — only your own messages, within the time limit
await client.revokeMessage(chat, myJid, sent.id);
```

## Marcar como Leído

```typescript
await client.markRead([info.id], info.chat, info.sender);
```

## Ejemplo Completo

Un bot que repite los mensajes de texto como respuestas citadas:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import qrcode from "qrcode-terminal";

const client = createClient({ store: "session.db" });

client.on("error", (err) => console.error("Error:", err));

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  await client.markRead([info.id], info.chat, info.sender);
  await client.sendChatPresence(info.chat, "composing");

  await client.sendRawMessage(info.chat, {
    extendedTextMessage: {
      text: `Echo: ${text}`,
      contextInfo: {
        stanzaId: info.id,
        participant: info.sender,
        quotedMessage: { conversation: text },
      },
    },
  });
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
    await client.getQRChannel();
  }
  await client.connect();
  console.log("Listening for messages...");

  process.on("SIGINT", async () => {
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Errores Comunes

:::warning `sendMessage` vs `sendRawMessage`
`sendMessage` es para texto simple. Para cualquier cosa estructurada (citas, menciones, multimedia), usa `sendRawMessage` con la forma completa del protobuf.
:::

:::warning Los mensajes de grupo van a `info.chat`
En grupos, siempre envía a `info.chat` (el JID del grupo), no a `info.sender` (el individuo). Enviar a `info.sender` inicia una conversación privada.
:::

:::warning Límites de tasa
WhatsApp limita la tasa de envío. Espacia los mensajes, especialmente en grupos. Consulta [Límites de Tasa](/docs/rate-limiting) para más detalles.
:::

<RelatedGuides slugs={["build-a-bot", "automate-group-messages", "send-stickers", "send-notifications"]} />
