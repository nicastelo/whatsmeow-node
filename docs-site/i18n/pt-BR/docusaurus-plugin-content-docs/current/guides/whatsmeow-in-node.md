---
title: "Como Usar o whatsmeow no Node.js"
sidebar_label: whatsmeow no Node.js
sidebar_position: 8
description: "Use o whatsmeow a partir do Node.js e TypeScript — instale o pacote npm, conecte ao WhatsApp, envie mensagens e trate eventos sem escrever Go."
keywords: [whatsmeow nodejs, whatsmeow node, whatsmeow typescript, whatsmeow npm, usar whatsmeow em javascript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/whatsmeow-in-node.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/whatsmeow-in-node.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Use whatsmeow in Node.js",
      "description": "Use whatsmeow from Node.js and TypeScript — install the npm package, connect to WhatsApp, send messages, and handle events without writing Go.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/whatsmeow-in-node.png",
      "step": [
        {"@type": "HowToStep", "name": "Install whatsmeow-node", "text": "Run npm install @whatsmeow-node/whatsmeow-node to get the precompiled Go binary and TypeScript wrapper."},
        {"@type": "HowToStep", "name": "Create a Client", "text": "Use createClient() with a store path. The Go binary is spawned and managed automatically."},
        {"@type": "HowToStep", "name": "Connect to WhatsApp", "text": "Call init() to check for an existing session, then connect(). Pair via QR code on first run."},
        {"@type": "HowToStep", "name": "Send Messages and Handle Events", "text": "Use typed async methods like sendMessage() and listen for events like message, connected, and group:info."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Use whatsmeow in Node.js",
      "description": "Use whatsmeow from Node.js and TypeScript — install the npm package, connect to WhatsApp, send messages, and handle events without writing Go.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/whatsmeow-in-node.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/whatsmeow-in-node.png"}}
    })}
  </script>
</Head>

![Como Usar o whatsmeow no Node.js](/img/guides/pt-BR/whatsmeow-in-node.png)
![Como Usar o whatsmeow no Node.js](/img/guides/pt-BR/whatsmeow-in-node-light.png)

# Como Usar o whatsmeow no Node.js

[whatsmeow](https://github.com/tulir/whatsmeow) é a biblioteca Go mais testada em batalha para o protocolo multi-dispositivo do WhatsApp — ela alimenta a [Mautrix WhatsApp bridge](https://github.com/mautrix/whatsapp) usada por milhares de homeservers Matrix 24/7. O whatsmeow-node traz isso para o Node.js com métodos async tipados e uma API orientada a eventos, sem precisar configurar Go.

## Como Funciona

O whatsmeow-node inclui um binário Go pré-compilado para a sua plataforma (macOS, Linux, Windows). Quando você chama `createClient()`, ele inicia esse binário e se comunica via JSON-line IPC através de stdin/stdout:

```
Node.js (TypeScript) → stdin JSON → Go binary (whatsmeow) → WhatsApp
                     ← stdout JSON ←
```

Você nunca interage com o binário diretamente. Cada método do whatsmeow é exposto como uma função async tipada no client.

## Passo 1: Instalar

```bash
npm install @whatsmeow-node/whatsmeow-node
```

O binário correto para o seu SO e arquitetura é instalado automaticamente via dependência opcional.

:::info
Plataformas suportadas: macOS (arm64, x64), Linux (arm64, x64), Windows (x64). Veja [Instalação](/docs/installation) para detalhes.
:::

## Passo 2: Criar o Client

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("error", (err) => {
  console.error("Error:", err);
});
```

`store` é onde o whatsmeow persiste a sessão. Use um caminho de arquivo para SQLite (desenvolvimento) ou uma URI PostgreSQL para produção.

## Passo 3: Conectar ao WhatsApp

```typescript
import qrcode from "qrcode-terminal";

async function main() {
  const { jid } = await client.init();

  if (jid) {
    // Já pareado — reconectar
    console.log(`Resuming session for ${jid}`);
    await client.connect();
  } else {
    // Primeira execução — parear via QR code
    client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
    await client.getQRChannel();
    await client.connect();
  }
}

main().catch(console.error);
```

Depois de escanear o QR code uma vez, a sessão é armazenada e as execuções seguintes vão direto para o `connect()`.

## Passo 4: Enviar Mensagens e Tratar Eventos

```typescript
// Send a text message
const jid = "5512345678@s.whatsapp.net";
await client.sendMessage(jid, { conversation: "Hello from whatsmeow!" });

// Listen for incoming messages
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  if (text) {
    console.log(`${info.pushName}: ${text}`);
  }
});

// Listen for group events
client.on("group:info", (event) => {
  if (event.join) console.log(`${event.join.join(", ")} joined ${event.jid}`);
});
```

## O Que Está Disponível

O whatsmeow-node encapsula mais de 100 métodos do whatsmeow. As principais áreas:

| Categoria | Métodos |
|----------|---------|
| **Mensagens** | `sendMessage`, `sendRawMessage`, `editMessage`, `revokeMessage`, `sendReaction`, `markRead` |
| **Mídia** | `uploadMedia`, `downloadAny`, `downloadMedia` |
| **Grupos** | `createGroup`, `getJoinedGroups`, `getGroupInfo`, `updateGroupParticipants`, `setGroupAnnounce` |
| **Presença** | `sendPresence`, `sendChatPresence`, `subscribePresence` |
| **Privacidade** | `getPrivacySettings`, `setPrivacySetting`, `getBlocklist`, `updateBlocklist` |
| **Enquetes** | `sendPollCreation`, `sendPollVote` |
| **Newsletters** | `createNewsletter`, `getSubscribedNewsletters`, `followNewsletter` |

Veja a [Referência da API](/docs/api/overview) para a lista completa.

## Exemplo Completo

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import qrcode from "qrcode-terminal";

const client = createClient({ store: "session.db" });

client.on("error", (err) => console.error("Error:", err));
client.on("logged_out", ({ reason }) => {
  console.error(`Logged out: ${reason}`);
  client.close();
  process.exit(1);
});

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  if (text) {
    console.log(`${info.pushName}: ${text}`);
    await client.markRead([info.id], info.chat, info.sender);
  }
});

async function main() {
  const { jid } = await client.init();

  if (jid) {
    await client.connect();
    console.log(`Connected as ${jid}`);
  } else {
    client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
    await client.getQRChannel();
    await client.connect();
  }

  await client.sendPresence("available");

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

:::warning Não precisa instalar Go
Você não precisa instalar Go. O binário pré-compilado já vem incluído no pacote npm. Se você está tentando compilar o whatsmeow por conta própria, está complicando demais — apenas faça `npm install`.
:::

:::warning Formato de JID
Os JIDs do WhatsApp seguem o formato `5512345678@s.whatsapp.net` (individual) ou `120363XXXXX@g.us` (grupo). Não inclua o prefixo `+`.
:::

:::warning Gerenciamento de sessão
O banco de dados da sessão contém chaves de criptografia. Se você apagá-lo, precisará parear novamente. Em produção, faça backup ou use PostgreSQL.
:::

<RelatedGuides slugs={["pair-whatsapp", "build-a-bot", "send-messages-typescript", "migrate-from-baileys"]} />
