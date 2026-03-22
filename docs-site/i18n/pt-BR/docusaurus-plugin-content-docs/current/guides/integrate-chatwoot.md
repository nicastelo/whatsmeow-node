---
title: "Como Usar o whatsmeow-node com Chatwoot"
sidebar_label: Integração com Chatwoot
sidebar_position: 23
description: "Conecte o whatsmeow-node ao Chatwoot como canal WhatsApp — receba e responda mensagens do WhatsApp pelo painel de agentes do Chatwoot sem a Cloud API oficial."
keywords: [chatwoot whatsapp, chatwoot whatsmeow, chatwoot whatsapp grátis, chatwoot whatsapp sem cloud api, chatwoot integração whatsapp, chatwoot whatsapp nodejs]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-chatwoot.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-chatwoot.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Usar o whatsmeow-node com Chatwoot",
      "description": "Conecte o whatsmeow-node ao Chatwoot como canal WhatsApp — receba e responda mensagens do WhatsApp pelo painel de agentes do Chatwoot sem a Cloud API oficial.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-chatwoot.png",
      "step": [
        {"@type": "HowToStep", "name": "Criar um Canal API no Chatwoot", "text": "Configure um canal API no Chatwoot para receber mensagens via webhook e enviar via API."},
        {"@type": "HowToStep", "name": "Construir a Ponte whatsmeow-node", "text": "Crie um serviço que encaminha mensagens do WhatsApp para o Chatwoot e respostas do Chatwoot para o WhatsApp."},
        {"@type": "HowToStep", "name": "Encaminhar Mensagens para o Chatwoot", "text": "Faça POST das mensagens recebidas do WhatsApp para a API do Chatwoot como mensagens de entrada no canal."},
        {"@type": "HowToStep", "name": "Tratar Webhooks de Saída do Chatwoot", "text": "Escute o webhook message_created do Chatwoot e envie as respostas dos agentes via whatsmeow-node."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Usar o whatsmeow-node com Chatwoot",
      "description": "Conecte o whatsmeow-node ao Chatwoot como canal WhatsApp — receba e responda mensagens do WhatsApp pelo painel de agentes do Chatwoot sem a Cloud API oficial.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-chatwoot.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Usar o whatsmeow-node com Chatwoot](/img/guides/pt-BR/integrate-chatwoot.png)
![Como Usar o whatsmeow-node com Chatwoot](/img/guides/pt-BR/integrate-chatwoot-light.png)

# Como Usar o whatsmeow-node com Chatwoot

O [Chatwoot](https://www.chatwoot.com) é uma plataforma open-source de suporte ao cliente — como Intercom ou Zendesk. Sua integração nativa com WhatsApp requer a Cloud API oficial (verificação Meta Business, cobrança por mensagem). Com o whatsmeow-node e o canal API do Chatwoot, você pode conectar o WhatsApp de graça.

## Como Funciona

```
WhatsApp User
  ↕
whatsmeow-node Bridge (Express)
  ↕ Chatwoot API
Chatwoot Dashboard (agents reply here)
```

A ponte fica entre o WhatsApp e o Chatwoot:
- **Entrada**: mensagem do WhatsApp, whatsmeow-node, Chatwoot API (cria conversa)
- **Saída**: agente responde no Chatwoot, webhook, ponte, whatsmeow-node, WhatsApp

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))
- Chatwoot rodando (self-hosted ou cloud)
- Express: `npm install express`

## Passo 1: Criar um Canal API no Chatwoot

1. No Chatwoot, vá em **Settings, Inboxes, Add Inbox**
2. Selecione **API** como tipo de canal
3. Nomeie como "WhatsApp" e salve
4. Anote o **Inbox ID** e gere um **API access token** em Settings, Account Settings

Defina como variáveis de ambiente:

```bash
CHATWOOT_URL=http://localhost:3001        # Your Chatwoot URL
CHATWOOT_API_TOKEN=your_api_token
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_INBOX_ID=1
```

## Passo 2: Configurar o Webhook do Chatwoot

No Chatwoot, vá em **Settings, Integrations, Webhooks**:
- **URL**: `http://localhost:3000/chatwoot/webhook` (seu servidor ponte)
- **Events**: Selecione `message_created`

Isso configura o Chatwoot para fazer POST das respostas dos agentes para a sua ponte.

## Passo 3: Construir a Ponte

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

## Como os Agentes Usam

Uma vez conectado:

1. Usuários do WhatsApp enviam uma mensagem
2. Ela aparece no Chatwoot como uma nova conversa
3. Os agentes respondem pelo painel do Chatwoot — como qualquer outro canal
4. A resposta volta para o WhatsApp pela ponte

Os agentes não precisam saber sobre o whatsmeow-node — eles usam o Chatwoot normalmente.

## Erros Comuns

:::warning Mapa de contatos em memória
O exemplo armazena o mapeamento JID para contato do Chatwoot em um `Map`. Para produção, persista isso em um banco de dados para sobreviver a reinicializações.
:::

:::warning A URL do webhook precisa ser acessível
O Chatwoot precisa alcançar o endpoint do webhook da sua ponte. Se estiver rodando no Docker, use o nome do container ou uma rede compartilhada.
:::

:::warning Mensagens de grupo
Este exemplo ignora mensagens de grupo (`info.isGroup`). Se você precisa de suporte a grupos, precisará mapear os JIDs de grupo para conversas do Chatwoot de forma diferente.
:::

<RelatedGuides slugs={["integrate-whaticket", "integrate-n8n", "send-notifications", "build-a-bot"]} />
