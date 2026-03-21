---
title: "Cómo Usar whatsmeow-node con n8n"
sidebar_label: Integración con n8n
sidebar_position: 22
description: "Conecta whatsmeow-node a n8n para automatización de flujos de WhatsApp — envía mensajes, recibe webhooks y crea flujos automatizados sin la Cloud API oficial."
keywords: [whatsmeow-node n8n, n8n bot whatsapp, n8n integración whatsapp, n8n whatsapp sin cloud api, n8n whatsapp gratis, automatización whatsapp n8n]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-n8n.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-n8n.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Use whatsmeow-node with n8n",
      "description": "Connect whatsmeow-node to n8n for WhatsApp workflow automation — send messages, receive webhooks, and build automated flows without the official Cloud API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-n8n.png",
      "step": [
        {"@type": "HowToStep", "name": "Create a whatsmeow-node REST API", "text": "Wrap whatsmeow-node in an Express server with send and webhook endpoints."},
        {"@type": "HowToStep", "name": "Forward Messages to n8n", "text": "POST incoming WhatsApp messages to an n8n webhook trigger URL."},
        {"@type": "HowToStep", "name": "Send Messages from n8n", "text": "Use n8n's HTTP Request node to call the whatsmeow-node REST API."},
        {"@type": "HowToStep", "name": "Build Automated Flows", "text": "Create n8n workflows that process messages, query databases, call APIs, and reply."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Use whatsmeow-node with n8n",
      "description": "Connect whatsmeow-node to n8n for WhatsApp workflow automation — send messages, receive webhooks, and build automated flows without the official Cloud API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-n8n.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Usar whatsmeow-node con n8n](/img/guides/es/integrate-n8n.png)
![Cómo Usar whatsmeow-node con n8n](/img/guides/es/integrate-n8n-light.png)

# Cómo Usar whatsmeow-node con n8n

[n8n](https://n8n.io) es una plataforma de automatización de flujos autoalojada — como Zapier, pero open source. Su nodo de WhatsApp integrado requiere la Cloud API oficial (verificación de Meta Business, precio por mensaje). Con whatsmeow-node, puedes conectar n8n a WhatsApp gratis usando un puente REST simple.

## Cómo Funciona

```
n8n Workflow
  ↕ HTTP requests / webhooks
whatsmeow-node REST API (Express)
  ↕
WhatsApp
```

1. **Recibir**: whatsmeow-node recibe un mensaje de WhatsApp → lo envía por POST a un webhook de n8n
2. **Enviar**: el flujo de n8n hace una petición HTTP → la API REST de whatsmeow-node envía el mensaje

## Requisitos Previos

- Una sesión vinculada de whatsmeow-node ([Cómo Vincular](pair-whatsapp))
- n8n corriendo (autoalojado o en la nube) — `npx n8n` para inicio rápido
- Express: `npm install express`

## Paso 1: Crear la API REST de whatsmeow-node

Este servidor hace dos cosas: envía mensajes vía REST y reenvía mensajes entrantes a n8n.

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

## Paso 2: Configurar el Trigger Webhook de n8n

En n8n, crea un nuevo flujo de trabajo:

1. Agrega un nodo **Webhook** como trigger
2. Configura el método como `POST`
3. Configura el path como `whatsapp` (la URL queda `http://localhost:5678/webhook/whatsapp`)
4. Configura la URL del webhook como `N8N_WEBHOOK_URL` en el entorno de tu API REST

Ahora cada mensaje entrante de WhatsApp dispara este flujo de n8n.

## Paso 3: Enviar Mensajes desde n8n

Agrega un nodo **HTTP Request** a tu flujo de n8n:

- **Method**: POST
- **URL**: `http://localhost:3000/api/send`
- **Body (JSON)**:
```json
{
  "phone": "{{ $json.from.replace('@s.whatsapp.net', '') }}",
  "message": "Thanks for your message! We'll get back to you soon."
}
```

## Ejemplo: Flujo de Auto-Respuesta

Un flujo completo de n8n que auto-responde a mensajes:

```
[Webhook Trigger] → [IF: text contains "price"] → [HTTP Request: send reply]
                  → [IF: text contains "help"]  → [HTTP Request: send help menu]
                  → [Default]                    → [HTTP Request: send acknowledgment]
```

## Ejemplo: Integración con CRM

Reenvía mensajes de WhatsApp a un CRM y responde con el número de ticket:

```
[Webhook Trigger] → [HTTP Request: create CRM ticket]
                  → [Set: extract ticket ID]
                  → [HTTP Request: send "Your ticket #{{ ticketId }} has been created"]
```

## Ejemplo: Auto-Respuesta con IA

Combina con OpenAI en n8n:

```
[Webhook Trigger] → [OpenAI Chat: generate reply]
                  → [HTTP Request: send AI reply via whatsmeow-node]
```

## Agregar Más Endpoints

Extiende la API REST para flujos de n8n que necesiten más funcionalidades:

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

## Errores Comunes

:::warning Mantén ambos servicios corriendo
La API REST de whatsmeow-node y n8n deben estar corriendo al mismo tiempo. Usa PM2 o Docker Compose para gestionarlos juntos.
:::

:::warning La URL del webhook debe ser accesible
La URL del webhook de n8n debe ser accesible desde el servidor de whatsmeow-node. En Docker, usa el nombre del contenedor o alias de red, no `localhost`.
:::

:::warning Límites de tasa
Los flujos de n8n pueden ejecutarse muy rápido. Si tu flujo envía múltiples mensajes, agrega un nodo **Wait** (1-3 segundos) entre envíos para evitar los límites de tasa de WhatsApp.
:::

<RelatedGuides slugs={["send-notifications", "integrate-whaticket", "build-a-bot", "connect-to-chatgpt"]} />
