---
title: "Cómo Reenviar Mensajes de WhatsApp Programáticamente"
sidebar_label: Reenviar Mensajes
sidebar_position: 20
description: "Reenvía mensajes de WhatsApp entre chats programáticamente con Node.js — texto, multimedia y mensajes de grupo usando whatsmeow-node."
keywords: [reenviar mensajes whatsapp api, whatsapp reenviar mensaje nodejs, bot reenvío whatsapp, reenviar mensajes whatsapp programáticamente, bot relay whatsapp]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/forward-messages.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/forward-messages.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Forward WhatsApp Messages Programmatically",
      "description": "Forward WhatsApp messages between chats programmatically with Node.js — text, media, and group messages using whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/forward-messages.png",
      "step": [
        {"@type": "HowToStep", "name": "Listen for Messages", "text": "Subscribe to the message event and filter for messages you want to forward."},
        {"@type": "HowToStep", "name": "Forward Text Messages", "text": "Use sendRawMessage with the original message content and isForwarded flag in contextInfo."},
        {"@type": "HowToStep", "name": "Forward Media Messages", "text": "Pass the original media message directly — no need to re-upload."},
        {"@type": "HowToStep", "name": "Build a Relay Bot", "text": "Forward messages between a group and a private chat, or between multiple groups."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Forward WhatsApp Messages Programmatically",
      "description": "Forward WhatsApp messages between chats programmatically with Node.js — text, media, and group messages using whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/forward-messages.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Reenviar Mensajes de WhatsApp Programáticamente](/img/guides/es/forward-messages.png)
![Cómo Reenviar Mensajes de WhatsApp Programáticamente](/img/guides/es/forward-messages-light.png)

# Cómo Reenviar Mensajes de WhatsApp Programáticamente

Reenvía mensajes entre chats de WhatsApp usando `sendRawMessage()`. Puedes reenviar texto, multimedia, encuestas y cualquier otro tipo de mensaje — con o sin la etiqueta "Reenviado".

## Requisitos Previos

- Una sesión vinculada de whatsmeow-node ([Cómo Vincular](pair-whatsapp))

## Reenviar un Mensaje de Texto

Para reenviar un mensaje recibido a otro chat, pásalo vía `sendRawMessage` con el flag `isForwarded`:

```typescript
const targetJid = "5598765432@s.whatsapp.net";

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  // Forward as a new message with the "Forwarded" label
  await client.sendRawMessage(targetJid, {
    extendedTextMessage: {
      text,
      contextInfo: {
        isForwarded: true,
        forwardingScore: 1,
      },
    },
  });
});
```

El flag `isForwarded: true` muestra la etiqueta "Reenviado" en el mensaje. `forwardingScore` rastrea cuántas veces se ha reenviado el mensaje — WhatsApp muestra "Reenviado muchas veces" cuando llega a 4+.

## Reenviar Sin la Etiqueta "Reenviado"

Para retransmitir un mensaje sin la etiqueta de reenvío, simplemente envíalo como mensaje nuevo:

```typescript
// Send as if it's a new message — no forwarding label
await client.sendMessage(targetJid, { conversation: text });
```

## Reenviar Mensajes Multimedia

Los mensajes multimedia (imágenes, videos, documentos) se pueden reenviar pasando el contenido del mensaje original. La multimedia ya está subida a los servidores de WhatsApp, así que no se necesita re-subir:

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  // Forward images
  if (message.imageMessage) {
    await client.sendRawMessage(targetJid, {
      imageMessage: {
        ...message.imageMessage,
        contextInfo: {
          isForwarded: true,
          forwardingScore: 1,
        },
      },
    });
    return;
  }

  // Forward videos
  if (message.videoMessage) {
    await client.sendRawMessage(targetJid, {
      videoMessage: {
        ...message.videoMessage,
        contextInfo: {
          isForwarded: true,
          forwardingScore: 1,
        },
      },
    });
    return;
  }

  // Forward documents
  if (message.documentMessage) {
    await client.sendRawMessage(targetJid, {
      documentMessage: {
        ...message.documentMessage,
        contextInfo: {
          isForwarded: true,
          forwardingScore: 1,
        },
      },
    });
    return;
  }
});
```

## Reenviar Cualquier Tipo de Mensaje

Una función genérica que reenvía cualquier mensaje detectando su tipo:

```typescript
const MESSAGE_TYPES = [
  "conversation",
  "extendedTextMessage",
  "imageMessage",
  "videoMessage",
  "audioMessage",
  "documentMessage",
  "stickerMessage",
  "contactMessage",
  "locationMessage",
  "pollCreationMessage",
] as const;

async function forwardMessage(
  targetJid: string,
  message: Record<string, unknown>,
  showForwarded = true,
) {
  for (const type of MESSAGE_TYPES) {
    if (!(type in message)) continue;

    if (type === "conversation") {
      // Simple text — wrap in extendedTextMessage for contextInfo support
      await client.sendRawMessage(targetJid, {
        extendedTextMessage: {
          text: message.conversation as string,
          ...(showForwarded && {
            contextInfo: { isForwarded: true, forwardingScore: 1 },
          }),
        },
      });
    } else {
      // Structured message — spread and add contextInfo
      const content = message[type] as Record<string, unknown>;
      await client.sendRawMessage(targetJid, {
        [type]: {
          ...content,
          ...(showForwarded && {
            contextInfo: {
              ...(content.contextInfo as Record<string, unknown> ?? {}),
              isForwarded: true,
              forwardingScore: 1,
            },
          }),
        },
      });
    }
    return;
  }
}
```

## Crear un Bot Relay

Reenvía todos los mensajes de un grupo a otro:

```typescript
const SOURCE_GROUP = "120363XXXXX@g.us";
const TARGET_GROUP = "120363YYYYY@g.us";

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;
  if (info.chat !== SOURCE_GROUP) return;

  // Add sender attribution
  const attribution = `[${info.pushName}]:\n`;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  if (text) {
    await client.sendMessage(TARGET_GROUP, {
      conversation: `${attribution}${text}`,
    });
    return;
  }

  // Forward media with caption attribution
  await forwardMessage(TARGET_GROUP, message);
});
```

## Ejemplo Completo

Un bot relay que reenvía mensajes entre un chat privado y un grupo:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

// Forward messages FROM this chat TO the group
const PRIVATE_CHAT = "5512345678@s.whatsapp.net";
const GROUP_CHAT = "120363XXXXX@g.us";

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  // Private → Group
  if (info.chat === PRIVATE_CHAT && text) {
    await client.sendMessage(GROUP_CHAT, {
      conversation: `[${info.pushName}]: ${text}`,
    });
    return;
  }

  // Group → Private
  if (info.chat === GROUP_CHAT && text) {
    await client.sendMessage(PRIVATE_CHAT, {
      conversation: `[${info.pushName} in group]: ${text}`,
    });
    return;
  }
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired!");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  console.log("Relay bot is online!");

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

:::warning Bucles de eco
Si reenvías mensajes de un chat y también escuchas el chat destino, puedes crear un bucle infinito. Siempre verifica el chat de origen y omite tus propios mensajes.
:::

:::warning Expiración de multimedia
Las URLs de multimedia de WhatsApp expiran después de un tiempo. Si guardas un mensaje e intentas reenviarlo mucho después, la multimedia puede ya no estar disponible. Reenvía la multimedia rápidamente o descárgala primero con `downloadAny()`.
:::

:::warning Límites de tasa
Reenviar muchos mensajes rápidamente va a alcanzar los límites de tasa de WhatsApp. Espacia los envíos, especialmente para operaciones de relay masivo. Consulta [Límites de Tasa](/docs/rate-limiting).
:::

<RelatedGuides slugs={["build-a-bot", "download-media", "automate-group-messages"]} />
