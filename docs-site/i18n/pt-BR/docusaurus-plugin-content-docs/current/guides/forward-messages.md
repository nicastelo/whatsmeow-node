---
title: "Como Encaminhar Mensagens do WhatsApp Programaticamente"
sidebar_label: Encaminhar Mensagens
sidebar_position: 20
description: "Encaminhe mensagens entre chats do WhatsApp programaticamente com Node.js — texto, mídia e mensagens de grupo usando whatsmeow-node."
keywords: [encaminhar mensagens whatsapp api, whatsapp encaminhar mensagem nodejs, bot encaminhamento whatsapp, encaminhar mensagens whatsapp programaticamente, bot relay whatsapp]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/forward-messages.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/forward-messages.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Encaminhar Mensagens do WhatsApp Programaticamente",
      "description": "Encaminhe mensagens entre chats do WhatsApp programaticamente com Node.js — texto, mídia e mensagens de grupo usando whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/forward-messages.png",
      "step": [
        {"@type": "HowToStep", "name": "Escutar Mensagens", "text": "Inscreva-se no evento message e filtre as mensagens que deseja encaminhar."},
        {"@type": "HowToStep", "name": "Encaminhar Mensagens de Texto", "text": "Use sendRawMessage com o conteúdo original da mensagem e a flag isForwarded no contextInfo."},
        {"@type": "HowToStep", "name": "Encaminhar Mensagens de Mídia", "text": "Passe a mensagem de mídia original diretamente — não é necessário fazer upload novamente."},
        {"@type": "HowToStep", "name": "Criar um Bot Relay", "text": "Encaminhe mensagens entre um grupo e um chat privado, ou entre vários grupos."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Encaminhar Mensagens do WhatsApp Programaticamente",
      "description": "Encaminhe mensagens entre chats do WhatsApp programaticamente com Node.js — texto, mídia e mensagens de grupo usando whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/forward-messages.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/forward-messages.png"}}
    })}
  </script>
</Head>

![Como Encaminhar Mensagens do WhatsApp Programaticamente](/img/guides/pt-BR/forward-messages.png)
![Como Encaminhar Mensagens do WhatsApp Programaticamente](/img/guides/pt-BR/forward-messages-light.png)

# Como Encaminhar Mensagens do WhatsApp Programaticamente

Encaminhe mensagens entre chats do WhatsApp usando `sendRawMessage()`. Você pode encaminhar texto, mídia, enquetes e qualquer outro tipo de mensagem — com ou sem o rótulo "Encaminhada".

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))

## Encaminhar uma Mensagem de Texto

Para encaminhar uma mensagem recebida para outro chat, passe-a via `sendRawMessage` com a flag `isForwarded`:

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

A flag `isForwarded: true` exibe o rótulo "Encaminhada" na mensagem. O `forwardingScore` rastreia quantas vezes a mensagem foi encaminhada — o WhatsApp mostra "Encaminhada com frequência" quando atinge 4+.

## Encaminhar Sem o Rótulo "Encaminhada"

Para repassar uma mensagem sem o rótulo de encaminhamento, simplesmente envie como uma mensagem nova:

```typescript
// Send as if it's a new message — no forwarding label
await client.sendMessage(targetJid, { conversation: text });
```

## Encaminhar Mensagens de Mídia

Mensagens de mídia (imagens, vídeos, documentos) podem ser encaminhadas passando o conteúdo original da mensagem. A mídia já está hospedada nos servidores do WhatsApp, então não é necessário reenviar:

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

## Encaminhar Qualquer Tipo de Mensagem

Uma função genérica que encaminha qualquer mensagem detectando o tipo:

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

## Criar um Bot Relay

Encaminhe todas as mensagens de um grupo para outro:

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

## Exemplo Completo

Um bot relay que encaminha mensagens entre um chat privado e um grupo:

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

## Erros Comuns

:::warning Loops de eco
Se você encaminha mensagens de um chat e também ouve o chat de destino, pode criar um loop infinito. Sempre verifique o chat de origem e ignore suas próprias mensagens.
:::

:::warning Expiração de mídia
As URLs de mídia do WhatsApp expiram após algum tempo. Se você salvar uma mensagem e tentar encaminhá-la muito depois, a mídia pode não estar mais disponível. Encaminhe mídia rapidamente ou baixe-a primeiro com `downloadAny()`.
:::

:::warning Rate limiting
Encaminhar muitas mensagens rapidamente vai atingir os rate limits do WhatsApp. Espaçe os envios, especialmente para operações de relay em massa. Veja [Rate Limiting](/docs/rate-limiting).
:::

<RelatedGuides slugs={["build-a-bot", "download-media", "automate-group-messages"]} />
