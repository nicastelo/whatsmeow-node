---
title: "Como Usar o whatsmeow-node com Whaticket"
sidebar_label: Integração com Whaticket
sidebar_position: 21
description: "Substitua o whatsapp-web.js pelo whatsmeow-node no Whaticket — elimine o Puppeteer, reduza o uso de memória e tenha uma conexão WhatsApp mais estável para seu helpdesk."
keywords: [whaticket whatsmeow, whaticket sem baileys, whaticket alternativa whatsapp-web.js, whaticket whatsmeow-node, whaticket estável, whaticket sem puppeteer]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-whaticket.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-whaticket.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Use whatsmeow-node with Whaticket",
      "description": "Replace whatsapp-web.js with whatsmeow-node in Whaticket — drop Puppeteer, cut memory usage, and get a more stable WhatsApp connection for your helpdesk.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-whaticket.png",
      "step": [
        {"@type": "HowToStep", "name": "Install whatsmeow-node", "text": "Add whatsmeow-node to the Whaticket backend and remove whatsapp-web.js and Puppeteer."},
        {"@type": "HowToStep", "name": "Create the WhatsApp Service", "text": "Build a service module that wraps whatsmeow-node and exposes send/receive methods for Whaticket."},
        {"@type": "HowToStep", "name": "Handle QR Pairing", "text": "Emit QR codes to the Whaticket frontend via the existing WebSocket connection."},
        {"@type": "HowToStep", "name": "Route Messages to Tickets", "text": "Listen for incoming messages and create or update tickets in the database."},
        {"@type": "HowToStep", "name": "Send Replies", "text": "When agents reply in the Whaticket UI, send the message via whatsmeow-node."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Use whatsmeow-node with Whaticket",
      "description": "Replace whatsapp-web.js with whatsmeow-node in Whaticket — drop Puppeteer, cut memory usage, and get a more stable WhatsApp connection for your helpdesk.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-whaticket.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Usar o whatsmeow-node com Whaticket](/img/guides/pt-BR/integrate-whaticket.png)
![Como Usar o whatsmeow-node com Whaticket](/img/guides/pt-BR/integrate-whaticket-light.png)

# Como Usar o whatsmeow-node com Whaticket

O [Whaticket](https://github.com/canove/whaticket-community) é um helpdesk WhatsApp open-source construído com Express + React. Ele usa whatsapp-web.js (baseado em Puppeteer) para conectividade com o WhatsApp, que é pesado (~500 MB de RAM), quebra com atualizações do WhatsApp Web e requer um navegador headless.

O whatsmeow-node é um substituto direto — mesmo padrão orientado a eventos, mesmo runtime Node.js, mas 10-20 MB de RAM em vez de 500 MB, sem navegador e protocolo mais estável.

## Por Que Substituir o whatsapp-web.js no Whaticket?

| | whatsapp-web.js (atual) | whatsmeow-node |
|---|---|---|
| **Memória por sessão** | 200-500 MB (Chromium) | ~10-20 MB |
| **Startup** | 5-15s (iniciar navegador) | Menos de 1 segundo |
| **Estabilidade** | Quebra com atualizações do WhatsApp Web | Upstream estável (whatsmeow) |
| **Imagem Docker** | ~1 GB+ (precisa do Chrome) | ~50 MB |
| **Protocolo** | Automação do client web | Multi-dispositivo nativo |

Para deploys Whaticket multi-sessão, isso significa rodar 10+ conexões WhatsApp em um único VPS de 1 GB em vez de precisar de 4+ GB.

## Visão Geral da Arquitetura

A integração WhatsApp do Whaticket fica no backend Express:

```
Whaticket Frontend (React)
  ↕ WebSocket + REST
Whaticket Backend (Express)
  ↕ WhatsApp Service
whatsapp-web.js → Replace with whatsmeow-node
  ↕
WhatsApp
```

A troca acontece na camada do serviço WhatsApp — tudo acima (tickets, contatos, UI) continua igual.

## Passo 1: Instalar o whatsmeow-node

No diretório do backend do Whaticket:

```bash
# Remove whatsapp-web.js and Puppeteer
npm uninstall whatsapp-web.js puppeteer

# Install whatsmeow-node
npm install @whatsmeow-node/whatsmeow-node
```

## Passo 2: Criar o Serviço WhatsApp

Substitua o serviço whatsapp-web.js por um wrapper do whatsmeow-node:

```typescript
// src/services/WhatsappService.ts
import { createClient, WhatsmeowClient } from "@whatsmeow-node/whatsmeow-node";
import { EventEmitter } from "events";

export class WhatsappService extends EventEmitter {
  private client: WhatsmeowClient;
  private jid: string | null = null;

  constructor(sessionId: string, storePath: string) {
    super();
    this.client = createClient({ store: `${storePath}/${sessionId}.db` });
    this.setupListeners();
  }

  private setupListeners() {
    this.client.on("qr", ({ code }) => {
      this.emit("qr", code);
    });

    this.client.on("connected", ({ jid }) => {
      this.jid = jid;
      this.emit("ready", jid);
    });

    this.client.on("message", ({ info, message }) => {
      if (info.isFromMe) return;
      this.emit("message", { info, message });
    });

    this.client.on("disconnected", () => {
      this.emit("disconnected");
    });

    this.client.on("logged_out", ({ reason }) => {
      this.emit("logged_out", reason);
    });
  }

  async start() {
    const { jid } = await this.client.init();
    if (jid) {
      this.jid = jid;
      await this.client.connect();
      return { paired: true, jid };
    }
    // Not paired — start QR flow
    await this.client.getQRChannel();
    await this.client.connect();
    return { paired: false };
  }

  async sendText(to: string, text: string) {
    return this.client.sendMessage(to, { conversation: text });
  }

  async sendMedia(to: string, filePath: string, mediaType: "image" | "video" | "audio" | "document", caption?: string) {
    const media = await this.client.uploadMedia(filePath, mediaType);
    const typeKey = `${mediaType}Message`;
    return this.client.sendRawMessage(to, {
      [typeKey]: {
        URL: media.URL,
        directPath: media.directPath,
        mediaKey: media.mediaKey,
        fileEncSHA256: media.fileEncSHA256,
        fileSHA256: media.fileSHA256,
        fileLength: String(media.fileLength),
        mimetype: this.getMimeType(filePath, mediaType),
        ...(caption && { caption }),
      },
    });
  }

  async markRead(messageId: string, chat: string, sender?: string) {
    await this.client.markRead([messageId], chat, sender);
  }

  async disconnect() {
    await this.client.sendPresence("unavailable");
    await this.client.disconnect();
    this.client.close();
  }

  getJid() {
    return this.jid;
  }

  private getMimeType(filePath: string, mediaType: string): string {
    const ext = filePath.split(".").pop()?.toLowerCase();
    const mimes: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
      mp4: "video/mp4", mp3: "audio/mpeg", ogg: "audio/ogg",
      pdf: "application/pdf", doc: "application/msword",
    };
    return mimes[ext ?? ""] ?? `${mediaType}/*`;
  }
}
```

## Passo 3: Tratar o Pareamento via QR por WebSocket

O Whaticket exibe QR codes na UI administrativa. Encaminhe-os pelo WebSocket existente:

```typescript
// In your session initialization handler
import { WhatsappService } from "./services/WhatsappService";

const sessions = new Map<string, WhatsappService>();

function initSession(sessionId: string, io: SocketIO.Server) {
  const service = new WhatsappService(sessionId, "./sessions");

  service.on("qr", (code) => {
    // Send QR to the admin UI via WebSocket
    io.to(sessionId).emit("whatsapp:qr", { code });
  });

  service.on("ready", (jid) => {
    io.to(sessionId).emit("whatsapp:ready", { jid });
    // Update session status in database
    updateSessionStatus(sessionId, "connected", jid);
  });

  service.on("message", async ({ info, message }) => {
    // Route to ticket system
    await handleIncomingMessage(sessionId, info, message);
  });

  service.on("disconnected", () => {
    io.to(sessionId).emit("whatsapp:disconnected");
    updateSessionStatus(sessionId, "disconnected");
  });

  service.start();
  sessions.set(sessionId, service);
}
```

## Passo 4: Rotear Mensagens para Tickets

Converta mensagens recebidas do WhatsApp em tickets do Whaticket:

```typescript
async function handleIncomingMessage(
  sessionId: string,
  info: { chat: string; sender: string; pushName: string; id: string; isGroup: boolean },
  message: Record<string, unknown>,
) {
  const contactJid = info.isGroup ? info.sender : info.chat;

  // Find or create contact
  const contact = await findOrCreateContact(contactJid, info.pushName);

  // Find open ticket or create new one
  const ticket = await findOrCreateTicket(contact.id, sessionId);

  // Extract message text
  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text ??
    "[media]";

  // Save message to ticket
  await createMessage({
    ticketId: ticket.id,
    contactId: contact.id,
    body: text,
    fromMe: false,
    messageId: info.id,
  });

  // Notify agents via WebSocket
  io.to(`ticket:${ticket.id}`).emit("ticket:message", {
    ticketId: ticket.id,
    message: text,
    contact: contact.name,
  });
}
```

## Passo 5: Enviar Respostas

Quando um agente responde pela UI do Whaticket:

```typescript
// In your message sending endpoint
app.post("/api/messages/:ticketId", async (req, res) => {
  const { ticketId } = req.params;
  const { body, mediaPath, mediaType } = req.body;

  const ticket = await getTicket(ticketId);
  const session = sessions.get(ticket.sessionId);
  if (!session) return res.status(400).json({ error: "Session not connected" });

  let response;
  if (mediaPath) {
    response = await session.sendMedia(ticket.contactJid, mediaPath, mediaType, body);
  } else {
    response = await session.sendText(ticket.contactJid, body);
  }

  // Save outgoing message
  await createMessage({
    ticketId: ticket.id,
    body,
    fromMe: true,
    messageId: response.id,
  });

  res.json({ sent: true, id: response.id });
});
```

## Gerenciamento Multi-Sessão

O Whaticket suporta múltiplos números de WhatsApp. O whatsmeow-node trata isso com instâncias de client separadas:

```typescript
// Each session gets its own client + database
const session1 = new WhatsappService("support", "./sessions");   // sessions/support.db
const session2 = new WhatsappService("sales", "./sessions");     // sessions/sales.db
const session3 = new WhatsappService("marketing", "./sessions"); // sessions/marketing.db

// Total memory: ~30-60 MB for 3 sessions
// With whatsapp-web.js: ~1.5 GB for 3 sessions
```

## Limpeza do Docker

Remova o Chromium do seu Dockerfile:

```dockerfile
# Before (whatsapp-web.js)
FROM node:20
RUN apt-get update && apt-get install -y chromium
# Image size: ~1.2 GB

# After (whatsmeow-node)
FROM node:20-slim
# Image size: ~200 MB
```

## Erros Comuns

:::warning Migração de sessão
As sessões do whatsapp-web.js não podem ser migradas. Cada número do WhatsApp precisa parear novamente escaneando um QR code. O histórico de conversas e os contatos não são afetados.
:::

:::warning Mudança no formato de JID
O whatsapp-web.js usa `number@c.us` para contatos. O whatsmeow-node usa `number@s.whatsapp.net`. Atualize quaisquer JIDs armazenados no seu banco de dados.
:::

:::warning Tratamento de mídia
O whatsapp-web.js oferece `msg.downloadMedia()` que retorna base64. O `downloadAny()` do whatsmeow-node salva em um arquivo temporário. Ajuste seu pipeline de mídia conforme necessário.
:::

<RelatedGuides slugs={["migrate-from-whatsapp-web-js", "send-notifications", "whatsmeow-in-node", "automate-group-messages"]} />
