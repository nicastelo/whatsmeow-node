---
title: "Como Enviar Mensagens no WhatsApp com TypeScript"
sidebar_label: Enviar Mensagens (TypeScript)
sidebar_position: 9
description: "Envie mensagens pelo WhatsApp com TypeScript e tipagem completa — texto, respostas, menções, mídia, enquetes e reações usando whatsmeow-node."
keywords: [enviar mensagem whatsapp typescript, whatsapp api typescript, whatsapp bot typescript, enviar texto whatsapp nodejs, whatsapp typescript biblioteca]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/send-messages-typescript.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/send-messages-typescript.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Enviar Mensagens no WhatsApp com TypeScript",
      "description": "Envie mensagens pelo WhatsApp com TypeScript e tipagem completa — texto, respostas, menções, mídia, enquetes e reações usando whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/send-messages-typescript.png",
      "step": [
        {"@type": "HowToStep", "name": "Configurar o Client", "text": "Instale o whatsmeow-node e crie um client com createClient(). Pareie via QR code na primeira execução."},
        {"@type": "HowToStep", "name": "Enviar uma Mensagem de Texto", "text": "Use sendMessage(jid, { conversation: texto }) para mensagens simples."},
        {"@type": "HowToStep", "name": "Responder com Citações e Menções", "text": "Use sendRawMessage com extendedTextMessage e contextInfo para respostas com citação e @menções."},
        {"@type": "HowToStep", "name": "Enviar Mensagens de Mídia", "text": "Faça upload de arquivos com uploadMedia(), depois envie com sendRawMessage usando os metadados de mídia retornados."},
        {"@type": "HowToStep", "name": "Reagir, Editar e Apagar", "text": "Use sendReaction(), editMessage() e revokeMessage() para interagir com mensagens enviadas."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Enviar Mensagens no WhatsApp com TypeScript",
      "description": "Envie mensagens pelo WhatsApp com TypeScript e tipagem completa — texto, respostas, menções, mídia, enquetes e reações usando whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/send-messages-typescript.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/send-messages-typescript.png"}}
    })}
  </script>
</Head>

![Como Enviar Mensagens no WhatsApp com TypeScript](/img/guides/pt-BR/send-messages-typescript.png)
![Como Enviar Mensagens no WhatsApp com TypeScript](/img/guides/pt-BR/send-messages-typescript-light.png)

# Como Enviar Mensagens no WhatsApp com TypeScript

O whatsmeow-node oferece métodos async tipados para cada tipo de mensagem do WhatsApp — texto, respostas, menções, mídia, enquetes e reações. Este guia cobre cada um deles com exemplos em TypeScript.

## Pré-requisitos

- whatsmeow-node instalado ([Guia de instalação](/docs/installation))
- Uma sessão pareada ([Como Parear o WhatsApp](pair-whatsapp))

## Configurar o Client

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

## Enviar uma Mensagem de Texto

A forma mais simples — passe uma string `conversation`:

```typescript
const resp = await client.sendMessage(recipient, {
  conversation: "Hello from TypeScript!",
});

console.log(`Sent with ID: ${resp.id}`);
```

`sendMessage` é o método de alto nível. Ele recebe um JID e um objeto `MessageContent`, e retorna um `SendResponse` com o `id` e o `timestamp` da mensagem.

## Responder com Citação

Para mostrar a mensagem original em um balão de citação, use `sendRawMessage` com `contextInfo`:

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

## Mencionar Usuários com @

Inclua os JIDs em `mentionedJid` e use `@<número>` no texto:

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

Para mencionar todos em um grupo:

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

## Enviar Mídia

Faça o upload primeiro, depois envie os metadados com uma raw message:

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

Outros tipos de mídia seguem o mesmo padrão — `videoMessage`, `audioMessage`, `documentMessage`, `stickerMessage`.

:::warning Casing dos campos proto
Os campos da resposta do upload usam o casing exato do protobuf: `URL`, `fileSHA256`, `fileEncSHA256` — **não** `url`, `fileSha256`. O casing errado falha silenciosamente.
:::

## Enviar uma Enquete

```typescript
const resp = await client.sendPollCreation(
  groupJid,
  "Where should we eat?",       // question
  ["Pizza", "Sushi", "Tacos"],   // options
  1,                              // max selectable
);
```

## Reagir a uma Mensagem

```typescript
// Add a reaction
await client.sendReaction(chat, senderJid, messageId, "🔥");

// Remove a reaction (empty string)
await client.sendReaction(chat, senderJid, messageId, "");
```

## Editar uma Mensagem Enviada

```typescript
const sent = await client.sendMessage(recipient, {
  conversation: "Hello!",
});

// Edit it — only works on your own messages
await client.editMessage(recipient, sent.id, {
  conversation: "Hello! (edited)",
});
```

## Apagar uma Mensagem

```typescript
// Revoke for everyone — only your own messages, within the time limit
await client.revokeMessage(chat, myJid, sent.id);
```

## Marcar como Lida

```typescript
await client.markRead([info.id], info.chat, info.sender);
```

## Exemplo Completo

Um bot que ecoa mensagens de texto como respostas com citação:

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

## Erros Comuns

:::warning `sendMessage` vs `sendRawMessage`
`sendMessage` é para texto simples. Para qualquer coisa estruturada (citações, menções, mídia), use `sendRawMessage` com o formato protobuf completo.
:::

:::warning Mensagens de grupo vão para `info.chat`
Em grupos, sempre envie para `info.chat` (o JID do grupo), não para `info.sender` (o indivíduo). Enviar para `info.sender` inicia uma conversa privada.
:::

:::warning Rate limiting
O WhatsApp limita a taxa de envio. Espaçe as mensagens, especialmente em grupos. Veja [Rate Limiting](/docs/rate-limiting) para detalhes.
:::

<RelatedGuides slugs={["build-a-bot", "automate-group-messages", "send-stickers", "send-notifications"]} />
