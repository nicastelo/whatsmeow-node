---
title: "Como Usar o whatsmeow-node com n8n"
sidebar_label: Integração com n8n
sidebar_position: 22
description: "Conecte o whatsmeow-node ao n8n para automação de fluxos com WhatsApp — envie mensagens, receba webhooks e construa fluxos automatizados sem a Cloud API oficial."
keywords: [whatsmeow-node n8n, n8n bot whatsapp, n8n integração whatsapp, n8n whatsapp sem cloud api, n8n whatsapp grátis, automação whatsapp n8n]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-n8n.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-n8n.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Usar o whatsmeow-node com n8n",
      "description": "Conecte o whatsmeow-node ao n8n para automação de fluxos com WhatsApp — envie mensagens, receba webhooks e construa fluxos automatizados sem a Cloud API oficial.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-n8n.png",
      "step": [
        {"@type": "HowToStep", "name": "Criar a REST API do whatsmeow-node", "text": "Encapsule o whatsmeow-node em um servidor Express com endpoints de envio e webhook."},
        {"@type": "HowToStep", "name": "Encaminhar Mensagens para o n8n", "text": "Faça POST das mensagens recebidas do WhatsApp para uma URL de webhook trigger do n8n."},
        {"@type": "HowToStep", "name": "Enviar Mensagens a partir do n8n", "text": "Use o nó HTTP Request do n8n para chamar a REST API do whatsmeow-node."},
        {"@type": "HowToStep", "name": "Construir Fluxos Automatizados", "text": "Crie workflows no n8n que processam mensagens, consultam bancos de dados, chamam APIs e respondem."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Usar o whatsmeow-node com n8n",
      "description": "Conecte o whatsmeow-node ao n8n para automação de fluxos com WhatsApp — envie mensagens, receba webhooks e construa fluxos automatizados sem a Cloud API oficial.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-n8n.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Usar o whatsmeow-node com n8n](/img/guides/pt-BR/integrate-n8n.png)
![Como Usar o whatsmeow-node com n8n](/img/guides/pt-BR/integrate-n8n-light.png)

# Como Usar o whatsmeow-node com n8n

O [n8n](https://n8n.io) é uma plataforma de automação de workflows self-hosted — como o Zapier, mas open source. Seu nó WhatsApp nativo requer a Cloud API oficial (verificação Meta Business, cobrança por mensagem). Com o whatsmeow-node, você pode conectar o n8n ao WhatsApp de graça usando uma ponte REST simples.

## Como Funciona

```
n8n Workflow
  ↕ HTTP requests / webhooks
whatsmeow-node REST API (Express)
  ↕
WhatsApp
```

1. **Recebendo**: whatsmeow-node recebe uma mensagem do WhatsApp e faz POST para um webhook do n8n
2. **Enviando**: um workflow do n8n faz uma requisição HTTP para a REST API do whatsmeow-node, que envia a mensagem

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))
- n8n rodando (self-hosted ou cloud) — `npx n8n` para começar rápido
- Express: `npm install express`

## Passo 1: Criar a REST API do whatsmeow-node

Este servidor faz duas coisas: envia mensagens via REST e encaminha mensagens recebidas para o n8n.

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import express from "express";

const client = createClient({ store: "session.db" });
const app = express();
app.use(express.json());

// n8n webhook URL — you'll set this up in Step 3
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL ?? "http://localhost:5678/webhook/whatsapp";

// --- Sending endpoint (n8n calls this) ---
app.post("/api/send", async (req, res) => {
  const { phone, message, groupJid } = req.body;
  const jid = groupJid ?? `${phone}@s.whatsapp.net`;

  try {
    const resp = await client.sendMessage(jid, { conversation: message });
    res.json({ sent: true, id: resp.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to send" });
  }
});

// --- Forward incoming messages to n8n ---
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  // POST to n8n webhook
  try {
    await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: info.sender,
        chat: info.chat,
        pushName: info.pushName,
        messageId: info.id,
        text: text ?? null,
        isGroup: info.isGroup,
        timestamp: info.timestamp,
        hasMedia: !!(
          message.imageMessage ??
          message.videoMessage ??
          message.audioMessage ??
          message.documentMessage
        ),
      }),
    });
  } catch (err) {
    console.error("Failed to forward to n8n:", err);
  }
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired!");
    process.exit(1);
  }
  await client.connect();
  app.listen(3000, () => console.log("WhatsApp API on :3000"));
}

main().catch(console.error);
```

## Passo 2: Configurar o Webhook Trigger no n8n

No n8n, crie um novo workflow:

1. Adicione um nó **Webhook** como trigger
2. Defina o método como `POST`
3. Defina o path como `whatsapp` (gerando a URL `http://localhost:5678/webhook/whatsapp`)
4. Configure a URL do webhook como `N8N_WEBHOOK_URL` no ambiente da sua REST API

Agora cada mensagem recebida pelo WhatsApp aciona esse workflow do n8n.

## Passo 3: Enviar Mensagens a partir do n8n

Adicione um nó **HTTP Request** ao seu workflow do n8n:

- **Method**: POST
- **URL**: `http://localhost:3000/api/send`
- **Body (JSON)**:
```json
{
  "phone": "{{ $json.from.replace('@s.whatsapp.net', '') }}",
  "message": "Thanks for your message! We'll get back to you soon."
}
```

## Exemplo: Workflow de Auto-Resposta

Um workflow completo do n8n que responde automaticamente a mensagens:

```
[Webhook Trigger] → [IF: text contains "price"] → [HTTP Request: send reply]
                  → [IF: text contains "help"]  → [HTTP Request: send help menu]
                  → [Default]                    → [HTTP Request: send acknowledgment]
```

## Exemplo: Integração com CRM

Encaminhe mensagens do WhatsApp para um CRM e responda com o número do ticket:

```
[Webhook Trigger] → [HTTP Request: create CRM ticket]
                  → [Set: extract ticket ID]
                  → [HTTP Request: send "Your ticket #{{ ticketId }} has been created"]
```

## Exemplo: Auto-Resposta com IA

Combine com OpenAI no n8n:

```
[Webhook Trigger] → [OpenAI Chat: generate reply]
                  → [HTTP Request: send AI reply via whatsmeow-node]
```

## Adicionando Mais Endpoints

Expanda a REST API para workflows do n8n que precisam de mais funcionalidades:

```typescript
// Send media
app.post("/api/send-media", async (req, res) => {
  const { phone, filePath, mediaType, caption } = req.body;
  const jid = `${phone}@s.whatsapp.net`;
  const media = await client.uploadMedia(filePath, mediaType);
  await client.sendRawMessage(jid, {
    [`${mediaType}Message`]: {
      URL: media.URL,
      directPath: media.directPath,
      mediaKey: media.mediaKey,
      fileEncSHA256: media.fileEncSHA256,
      fileSHA256: media.fileSHA256,
      fileLength: String(media.fileLength),
      mimetype: `${mediaType}/*`,
      ...(caption && { caption }),
    },
  });
  res.json({ sent: true });
});

// Send to group
app.post("/api/send-group", async (req, res) => {
  const { groupJid, message } = req.body;
  const resp = await client.sendMessage(groupJid, { conversation: message });
  res.json({ sent: true, id: resp.id });
});

// Mark as read
app.post("/api/read", async (req, res) => {
  const { messageId, chat, sender } = req.body;
  await client.markRead([messageId], chat, sender);
  res.json({ ok: true });
});
```

## Erros Comuns

:::warning Mantenha os dois serviços rodando
A REST API do whatsmeow-node e o n8n precisam estar rodando ao mesmo tempo. Use PM2 ou Docker Compose para gerenciá-los juntos.
:::

:::warning A URL do webhook precisa ser acessível
A URL do webhook do n8n precisa ser acessível a partir do servidor do whatsmeow-node. No Docker, use o nome do container ou alias de rede, não `localhost`.
:::

:::warning Rate limiting
Workflows do n8n podem executar muito rápido. Se o seu workflow envia múltiplas mensagens, adicione um nó **Wait** (1-3 segundos) entre os envios para evitar rate limiting do WhatsApp.
:::

<RelatedGuides slugs={["send-notifications", "integrate-whaticket", "build-a-bot", "connect-to-chatgpt"]} />
