---
title: "Como Enviar Notificações pelo WhatsApp com Node.js"
sidebar_label: Enviar Notificações
sidebar_position: 17
description: "Envie notificações, alertas e lembretes pelo WhatsApp com Node.js — atualizações de pedidos, lembretes de consultas, alertas do sistema e mais usando whatsmeow-node."
keywords: [enviar notificação whatsapp nodejs, whatsapp notificação api, bot alerta whatsapp, bot lembrete whatsapp, enviar mensagem whatsapp programaticamente]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/send-notifications.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/send-notifications.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Enviar Notificações pelo WhatsApp com Node.js",
      "description": "Envie notificações, alertas e lembretes pelo WhatsApp com Node.js — atualizações de pedidos, lembretes de consultas, alertas do sistema e mais usando whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/send-notifications.png",
      "step": [
        {"@type": "HowToStep", "name": "Configurar o Client", "text": "Crie um WhatsmeowClient, inicialize e conecte. O client fica conectado em background."},
        {"@type": "HowToStep", "name": "Enviar uma Notificação", "text": "Chame sendMessage() com o JID do destinatário e uma mensagem de texto."},
        {"@type": "HowToStep", "name": "Disparar a partir de Eventos Externos", "text": "Chame sendMessage a partir de um endpoint HTTP, trigger de banco de dados ou cron job."},
        {"@type": "HowToStep", "name": "Enviar para Múltiplos Destinatários", "text": "Itere sobre uma lista de JIDs com um delay entre os envios para evitar rate limiting."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Enviar Notificações pelo WhatsApp com Node.js",
      "description": "Envie notificações, alertas e lembretes pelo WhatsApp com Node.js — atualizações de pedidos, lembretes de consultas, alertas do sistema e mais usando whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/send-notifications.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Enviar Notificações pelo WhatsApp com Node.js](/img/guides/pt-BR/send-notifications.png)
![Como Enviar Notificações pelo WhatsApp com Node.js](/img/guides/pt-BR/send-notifications-light.png)

# Como Enviar Notificações pelo WhatsApp com Node.js

Envie alertas, lembretes e atualizações pelo WhatsApp a partir de qualquer app Node.js. O whatsmeow-node fica conectado em background — basta chamar `sendMessage()` sempre que precisar notificar alguém.

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))
- O número de telefone do destinatário (como JID: `5512345678@s.whatsapp.net`)

## Passo 1: Configurar uma Conexão Persistente

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

async function start() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! See: How to Pair WhatsApp");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  console.log("Notification service is ready");
}

start().catch(console.error);
```

O client fica conectado e pronto para enviar mensagens a qualquer momento.

## Passo 2: Enviar uma Notificação

```typescript
async function notify(phone: string, message: string) {
  const jid = `${phone}@s.whatsapp.net`;
  await client.sendMessage(jid, { conversation: message });
}

// Example: order update
await notify("5512345678", "Your order #1234 has shipped! Track it at https://example.com/track/1234");
```

## Passo 3: Disparar a partir de um Endpoint HTTP

Encapsule a notificação em uma rota Express para que outros serviços possam acioná-la:

```typescript
import express from "express";

const app = express();
app.use(express.json());

app.post("/notify", async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: "phone and message are required" });
  }

  try {
    const jid = `${phone}@s.whatsapp.net`;
    const resp = await client.sendMessage(jid, { conversation: message });
    res.json({ sent: true, id: resp.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to send" });
  }
});

app.listen(3000, () => console.log("Notification API on :3000"));
```

Agora qualquer serviço pode enviar uma notificação:

```bash
curl -X POST http://localhost:3000/notify \
  -H "Content-Type: application/json" \
  -d '{"phone": "5512345678", "message": "Your appointment is in 1 hour"}'
```

## Passo 4: Enviar para Múltiplos Destinatários

```typescript
async function broadcast(phones: string[], message: string) {
  for (const phone of phones) {
    const jid = `${phone}@s.whatsapp.net`;
    await client.sendMessage(jid, { conversation: message });

    // Wait between sends to avoid rate limiting
    await new Promise((r) => setTimeout(r, 2000));
  }
}

await broadcast(
  ["5512345678", "5598765432", "5511223344"],
  "Reminder: team meeting at 3 PM today",
);
```

:::warning Rate limiting
O WhatsApp limita a taxa de envio. Espaçe as mensagens de 1 a 3 segundos para envios em massa. Enviar rápido demais pode restringir temporariamente sua conta. Veja [Rate Limiting](/docs/rate-limiting).
:::

## Padrões de Notificação

### Lembrete de consulta

```typescript
await notify(phone, `Reminder: your appointment with Dr. Smith is tomorrow at 10:00 AM.

Reply CONFIRM to confirm or CANCEL to cancel.`);
```

### Atualização de pedido

```typescript
await notify(phone, `Order #${orderId} update: ${status}

${status === "shipped" ? `Track: ${trackingUrl}` : ""}`);
```

### Alerta do sistema

```typescript
await notify(adminPhone, `⚠ Server alert: CPU usage at ${cpuPercent}% on ${hostname}`);
```

### Notificação para grupo

```typescript
// Send to a group instead of an individual
const groupJid = "120363XXXXX@g.us";
await client.sendMessage(groupJid, {
  conversation: "Deploy complete: v2.1.0 is live",
});
```

## Exemplo Completo

Um serviço de notificações com API HTTP:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import express from "express";

const client = createClient({ store: "session.db" });
const app = express();
app.use(express.json());

app.post("/notify", async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: "phone and message are required" });
  }

  try {
    const jid = `${phone}@s.whatsapp.net`;
    const resp = await client.sendMessage(jid, { conversation: message });
    res.json({ sent: true, id: resp.id });
  } catch (err) {
    console.error("Send failed:", err);
    res.status(500).json({ error: "Failed to send" });
  }
});

app.post("/broadcast", async (req, res) => {
  const { phones, message } = req.body;
  if (!phones?.length || !message) {
    return res.status(400).json({ error: "phones[] and message are required" });
  }

  // Send in background
  (async () => {
    for (const phone of phones) {
      try {
        const jid = `${phone}@s.whatsapp.net`;
        await client.sendMessage(jid, { conversation: message });
      } catch (err) {
        console.error(`Failed to send to ${phone}:`, err);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    console.log(`Broadcast complete: ${phones.length} recipients`);
  })();

  res.json({ queued: true, count: phones.length });
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired!");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");

  app.listen(3000, () => console.log("Notification API on :3000"));

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

:::warning Não faça spam
Enviar mensagens em massa não solicitadas viola os Termos de Serviço do WhatsApp e pode resultar no banimento da sua conta. Envie notificações apenas para usuários que optaram por recebê-las.
:::

:::warning Rate limiting
Espaçe os envios com delay de 1 a 3 segundos. Veja [Rate Limiting](/docs/rate-limiting) para detalhes.
:::

:::warning Mantenha a conexão ativa
O client precisa estar conectado para enviar mensagens. Se o processo encerrar, será necessário reconectar. Em produção, use um gerenciador de processos como PM2 ou rode como serviço systemd.
:::

<RelatedGuides slugs={["schedule-messages", "automate-group-messages", "build-a-bot"]} />
