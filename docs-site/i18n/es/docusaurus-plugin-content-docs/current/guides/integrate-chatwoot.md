---
title: "Cómo Usar whatsmeow-node con Chatwoot"
sidebar_label: Integración con Chatwoot
sidebar_position: 23
description: "Conecta whatsmeow-node a Chatwoot como canal de WhatsApp — recibe y responde mensajes de WhatsApp desde el dashboard de agentes de Chatwoot sin la Cloud API oficial."
keywords: [chatwoot whatsapp, chatwoot whatsmeow, chatwoot whatsapp gratis, chatwoot whatsapp sin cloud api, chatwoot integración whatsapp, chatwoot whatsapp nodejs]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-chatwoot.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-chatwoot.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Use whatsmeow-node with Chatwoot",
      "description": "Connect whatsmeow-node to Chatwoot as a WhatsApp channel — receive and reply to WhatsApp messages from the Chatwoot agent dashboard without the official Cloud API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-chatwoot.png",
      "step": [
        {"@type": "HowToStep", "name": "Create a Chatwoot API Channel", "text": "Set up an API channel in Chatwoot to receive messages via webhook and send via API."},
        {"@type": "HowToStep", "name": "Build the whatsmeow-node Bridge", "text": "Create a service that forwards WhatsApp messages to Chatwoot and Chatwoot replies to WhatsApp."},
        {"@type": "HowToStep", "name": "Forward Messages to Chatwoot", "text": "POST incoming WhatsApp messages to Chatwoot's API as incoming messages on the channel."},
        {"@type": "HowToStep", "name": "Handle Chatwoot Outgoing Webhooks", "text": "Listen for Chatwoot's message_created webhook and send agent replies via whatsmeow-node."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Use whatsmeow-node with Chatwoot",
      "description": "Connect whatsmeow-node to Chatwoot as a WhatsApp channel — receive and reply to WhatsApp messages from the Chatwoot agent dashboard without the official Cloud API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-chatwoot.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Usar whatsmeow-node con Chatwoot](/img/guides/es/integrate-chatwoot.png)
![Cómo Usar whatsmeow-node con Chatwoot](/img/guides/es/integrate-chatwoot-light.png)

# Cómo Usar whatsmeow-node con Chatwoot

[Chatwoot](https://www.chatwoot.com) es una plataforma de soporte al cliente open source — como Intercom o Zendesk. Su integración de WhatsApp integrada requiere la Cloud API oficial (verificación de Meta Business, precio por mensaje). Con whatsmeow-node y el canal API de Chatwoot, puedes conectar WhatsApp gratis.

## Cómo Funciona

```
WhatsApp User
  ↕
whatsmeow-node Bridge (Express)
  ↕ Chatwoot API
Chatwoot Dashboard (agents reply here)
```

El puente se ubica entre WhatsApp y Chatwoot:
- **Entrante**: Mensaje de WhatsApp → whatsmeow-node → API de Chatwoot (crea conversación)
- **Saliente**: El agente responde en Chatwoot → webhook → puente → whatsmeow-node → WhatsApp

## Requisitos Previos

- Una sesión vinculada de whatsmeow-node ([Cómo Vincular](pair-whatsapp))
- Chatwoot corriendo (autoalojado o en la nube)
- Express: `npm install express`

## Paso 1: Crear un Canal API en Chatwoot

1. En Chatwoot, ve a **Settings → Inboxes → Add Inbox**
2. Selecciona **API** como tipo de canal
3. Nómbralo "WhatsApp" y guarda
4. Anota el **Inbox ID** y genera un **API access token** desde Settings → Account Settings

Configúralos como variables de entorno:

```bash
CHATWOOT_URL=http://localhost:3001        # Your Chatwoot URL
CHATWOOT_API_TOKEN=your_api_token
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_INBOX_ID=1
```

## Paso 2: Configurar el Webhook de Chatwoot

En Chatwoot, ve a **Settings → Integrations → Webhooks**:
- **URL**: `http://localhost:3000/chatwoot/webhook` (tu servidor puente)
- **Events**: Selecciona `message_created`

Esto le dice a Chatwoot que envíe las respuestas de los agentes por POST a tu puente.

## Paso 3: Construir el Puente

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import express from "express";

const client = createClient({ store: "session.db" });
const app = express();
app.use(express.json());

const CHATWOOT_URL = process.env.CHATWOOT_URL!;
const CHATWOOT_API_TOKEN = process.env.CHATWOOT_API_TOKEN!;
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID!;
const CHATWOOT_INBOX_ID = process.env.CHATWOOT_INBOX_ID!;

// Map WhatsApp JID → Chatwoot contact ID + conversation ID
const contactMap = new Map<string, { contactId: number; conversationId: number }>();

// --- Helper: Chatwoot API call ---
async function chatwootAPI(path: string, method: string, body?: unknown) {
  const res = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      api_access_token: CHATWOOT_API_TOKEN,
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  return res.json();
}

// --- Find or create Chatwoot contact ---
async function getOrCreateContact(jid: string, name: string) {
  const cached = contactMap.get(jid);
  if (cached) return cached;

  const phone = jid.split("@")[0];

  // Search for existing contact
  const search = await chatwootAPI(`/contacts/search?q=${phone}`, "GET");
  let contactId: number;

  if (search.payload?.length > 0) {
    contactId = search.payload[0].id;
  } else {
    // Create new contact
    const created = await chatwootAPI("/contacts", "POST", {
      name: name || phone,
      phone_number: `+${phone}`,
      inbox_id: CHATWOOT_INBOX_ID,
    });
    contactId = created.payload?.contact?.id ?? created.id;
  }

  // Find or create conversation
  const convos = await chatwootAPI(`/contacts/${contactId}/conversations`, "GET");
  let conversationId: number;

  const openConvo = convos.payload?.find(
    (c: { inbox_id: number; status: string }) =>
      c.inbox_id === Number(CHATWOOT_INBOX_ID) && c.status !== "resolved",
  );

  if (openConvo) {
    conversationId = openConvo.id;
  } else {
    const created = await chatwootAPI("/conversations", "POST", {
      contact_id: contactId,
      inbox_id: CHATWOOT_INBOX_ID,
    });
    conversationId = created.id;
  }

  const mapping = { contactId, conversationId };
  contactMap.set(jid, mapping);
  return mapping;
}

// --- Forward WhatsApp messages to Chatwoot ---
client.on("message", async ({ info, message }) => {
  if (info.isFromMe || info.isGroup) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  try {
    const { conversationId } = await getOrCreateContact(info.sender, info.pushName);

    await chatwootAPI(`/conversations/${conversationId}/messages`, "POST", {
      content: text,
      message_type: "incoming",
    });
  } catch (err) {
    console.error("Failed to forward to Chatwoot:", err);
  }
});

// --- Handle Chatwoot agent replies ---
app.post("/chatwoot/webhook", async (req, res) => {
  const { event, message_type, conversation, content } = req.body;

  // Only handle outgoing messages from agents
  if (event !== "message_created" || message_type !== "outgoing") {
    return res.sendStatus(200);
  }

  // Find the WhatsApp JID for this conversation
  const jid = [...contactMap.entries()].find(
    ([, v]) => v.conversationId === conversation?.id,
  )?.[0];

  if (!jid || !content) return res.sendStatus(200);

  try {
    await client.sendMessage(jid, { conversation: content });
  } catch (err) {
    console.error("Failed to send WhatsApp reply:", err);
  }

  res.sendStatus(200);
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired!");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  app.listen(3000, () => console.log("Chatwoot bridge on :3000"));
}

main().catch(console.error);
```

## Cómo lo Usan los Agentes

Una vez conectado:

1. Los usuarios de WhatsApp envían un mensaje
2. Aparece en Chatwoot como una nueva conversación
3. Los agentes responden desde el dashboard de Chatwoot — igual que con cualquier otro canal
4. La respuesta vuelve a WhatsApp a través del puente

Los agentes no necesitan saber sobre whatsmeow-node — simplemente usan Chatwoot normalmente.

## Errores Comunes

:::warning El mapa de contactos está en memoria
El ejemplo almacena el mapeo JID → contacto de Chatwoot en un `Map`. Para producción, persiste esto en una base de datos para que sobreviva a los reinicios.
:::

:::warning La URL del webhook debe ser accesible
Chatwoot necesita alcanzar el endpoint de webhook de tu puente. Si corres en Docker, usa el nombre del contenedor o una red compartida.
:::

:::warning Mensajes de grupo
Este ejemplo omite los mensajes de grupo (`info.isGroup`). Si necesitas soporte de grupos, tendrás que mapear los JID de grupo a conversaciones de Chatwoot de forma diferente.
:::

<RelatedGuides slugs={["integrate-whaticket", "integrate-n8n", "send-notifications", "build-a-bot"]} />
