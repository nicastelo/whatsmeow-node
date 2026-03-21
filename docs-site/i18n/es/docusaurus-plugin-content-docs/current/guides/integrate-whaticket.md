---
title: "Cómo Usar whatsmeow-node con Whaticket"
sidebar_label: Integración con Whaticket
sidebar_position: 21
description: "Reemplaza whatsapp-web.js con whatsmeow-node en Whaticket — elimina Puppeteer, reduce el consumo de memoria y obtén una conexión de WhatsApp más estable para tu helpdesk."
keywords: [whaticket whatsmeow, whaticket sin baileys, whaticket alternativa whatsapp-web.js, whaticket whatsmeow-node, whaticket estable, whaticket sin puppeteer]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-whaticket.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-whaticket.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Use whatsmeow-node with Whaticket",
      "description": "Replace whatsapp-web.js with whatsmeow-node in Whaticket — drop Puppeteer, cut memory usage, and get a more stable WhatsApp connection for your helpdesk.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-whaticket.png",
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
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-whaticket.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Usar whatsmeow-node con Whaticket](/img/guides/es/integrate-whaticket.png)
![Cómo Usar whatsmeow-node con Whaticket](/img/guides/es/integrate-whaticket-light.png)

# Cómo Usar whatsmeow-node con Whaticket

[Whaticket](https://github.com/canove/whaticket-community) es un helpdesk de WhatsApp open source construido con Express + React. Usa whatsapp-web.js (basado en Puppeteer) para la conectividad de WhatsApp, lo cual es pesado (~500 MB de RAM), se rompe con actualizaciones de WhatsApp Web y requiere un navegador headless.

whatsmeow-node es un reemplazo directo — mismo patrón basado en eventos, mismo runtime de Node.js, pero 10-20 MB de RAM en vez de 500 MB, sin navegador y un protocolo más estable.

## ¿Por Qué Reemplazar whatsapp-web.js en Whaticket?

| | whatsapp-web.js (actual) | whatsmeow-node |
|---|---|---|
| **Memoria por sesión** | 200-500 MB (Chromium) | ~10-20 MB |
| **Arranque** | 5-15s (lanzamiento del navegador) | Menos de 1 segundo |
| **Estabilidad** | Se rompe con actualizaciones de WhatsApp Web | Upstream estable (whatsmeow) |
| **Imagen Docker** | ~1 GB+ (necesita Chrome) | ~50 MB |
| **Protocolo** | Automatización del cliente web | Multi-dispositivo nativo |

Para despliegues de Whaticket multi-sesión, esto significa ejecutar 10+ conexiones de WhatsApp en un solo VPS de 1 GB en lugar de necesitar 4+ GB.

## Visión General de la Arquitectura

La integración de WhatsApp de Whaticket está en el backend Express:

```
Whaticket Frontend (React)
  ↕ WebSocket + REST
Whaticket Backend (Express)
  ↕ WhatsApp Service
whatsapp-web.js → Replace with whatsmeow-node
  ↕
WhatsApp
```

El cambio ocurre en la capa del servicio de WhatsApp — todo lo de arriba (tickets, contactos, UI) se mantiene igual.

## Paso 1: Instalar whatsmeow-node

En el directorio del backend de Whaticket:

```bash
# Remove whatsapp-web.js and Puppeteer
npm uninstall whatsapp-web.js puppeteer

# Install whatsmeow-node
npm install @whatsmeow-node/whatsmeow-node
```

## Paso 2: Crear el Servicio de WhatsApp

Reemplaza el servicio de whatsapp-web.js con un wrapper de whatsmeow-node:

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

## Paso 3: Manejar el Emparejamiento QR vía WebSocket

Whaticket muestra los QR codes en la UI de administración. Reenvíalos a través de la conexión WebSocket existente:

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

## Paso 4: Enrutar Mensajes a Tickets

Convierte los mensajes entrantes de WhatsApp en tickets de Whaticket:

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

## Paso 5: Enviar Respuestas

Cuando un agente responde desde la UI de Whaticket:

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

## Gestión Multi-Sesión

Whaticket soporta múltiples números de WhatsApp. whatsmeow-node lo maneja con instancias de cliente separadas:

```typescript
// Each session gets its own client + database
const session1 = new WhatsappService("support", "./sessions");   // sessions/support.db
const session2 = new WhatsappService("sales", "./sessions");     // sessions/sales.db
const session3 = new WhatsappService("marketing", "./sessions"); // sessions/marketing.db

// Total memory: ~30-60 MB for 3 sessions
// With whatsapp-web.js: ~1.5 GB for 3 sessions
```

## Limpieza de Docker

Elimina Chromium de tu Dockerfile:

```dockerfile
# Before (whatsapp-web.js)
FROM node:20
RUN apt-get update && apt-get install -y chromium
# Image size: ~1.2 GB

# After (whatsmeow-node)
FROM node:20-slim
# Image size: ~200 MB
```

## Errores Comunes

:::warning Migración de sesión
Las sesiones de whatsapp-web.js no se pueden migrar. Cada número de WhatsApp necesita vincularse de nuevo escaneando un QR code. El historial de chat y los contactos no se ven afectados.
:::

:::warning Cambio de formato de JID
whatsapp-web.js usa `number@c.us` para contactos. whatsmeow-node usa `number@s.whatsapp.net`. Actualiza cualquier JID almacenado en tu base de datos.
:::

:::warning Manejo de multimedia
whatsapp-web.js te da `msg.downloadMedia()` que devuelve base64. `downloadAny()` de whatsmeow-node guarda en un archivo temporal. Ajusta tu pipeline de multimedia acorde.
:::

<RelatedGuides slugs={["migrate-from-whatsapp-web-js", "send-notifications", "whatsmeow-in-node", "automate-group-messages"]} />
