---
title: "Cómo Enviar Notificaciones de WhatsApp desde Node.js"
sidebar_label: Enviar Notificaciones
sidebar_position: 17
description: "Envía notificaciones, alertas y recordatorios de WhatsApp desde Node.js — actualizaciones de pedidos, recordatorios de citas, alertas del sistema y más usando whatsmeow-node."
keywords: [enviar notificación whatsapp nodejs, whatsapp notificación api, bot alertas whatsapp, bot recordatorios whatsapp, enviar mensaje whatsapp programáticamente]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/send-notifications.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/send-notifications.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Enviar Notificaciones de WhatsApp desde Node.js",
      "description": "Envía notificaciones, alertas y recordatorios de WhatsApp desde Node.js — actualizaciones de pedidos, recordatorios de citas, alertas del sistema y más usando whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/send-notifications.png",
      "step": [
        {"@type": "HowToStep", "name": "Configurar el cliente", "text": "Crea un WhatsmeowClient, inicializa y conecta. El cliente se mantiene conectado en segundo plano."},
        {"@type": "HowToStep", "name": "Enviar una notificación", "text": "Llama a sendMessage() con el JID del destinatario y un mensaje de conversación."},
        {"@type": "HowToStep", "name": "Disparar desde eventos externos", "text": "Llama a sendMessage desde un endpoint HTTP, un trigger de base de datos o un cron job."},
        {"@type": "HowToStep", "name": "Enviar a múltiples destinatarios", "text": "Itera sobre una lista de JIDs con un delay entre envíos para evitar límites de tasa."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Enviar Notificaciones de WhatsApp desde Node.js",
      "description": "Envía notificaciones, alertas y recordatorios de WhatsApp desde Node.js — actualizaciones de pedidos, recordatorios de citas, alertas del sistema y más usando whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/send-notifications.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Enviar Notificaciones de WhatsApp desde Node.js](/img/guides/es/send-notifications.png)
![Cómo Enviar Notificaciones de WhatsApp desde Node.js](/img/guides/es/send-notifications-light.png)

# Cómo Enviar Notificaciones de WhatsApp desde Node.js

Envía alertas, recordatorios y actualizaciones a WhatsApp desde cualquier app Node.js. whatsmeow-node se mantiene conectado en segundo plano — solo llamas a `sendMessage()` cuando necesites notificar a alguien.

## Requisitos Previos

- Una sesión vinculada de whatsmeow-node ([Cómo Vincular](pair-whatsapp))
- El número de teléfono del destinatario (como JID: `5512345678@s.whatsapp.net`)

## Paso 1: Configurar una Conexión Persistente

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

El cliente se mantiene conectado y listo para enviar mensajes en cualquier momento.

## Paso 2: Enviar una Notificación

```typescript
async function notify(phone: string, message: string) {
  const jid = `${phone}@s.whatsapp.net`;
  await client.sendMessage(jid, { conversation: message });
}

// Example: order update
await notify("5512345678", "Your order #1234 has shipped! Track it at https://example.com/track/1234");
```

## Paso 3: Disparar desde un Endpoint HTTP

Envuelve la notificación en una ruta de Express para que otros servicios puedan activarla:

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

Ahora cualquier servicio puede enviar una notificación:

```bash
curl -X POST http://localhost:3000/notify \
  -H "Content-Type: application/json" \
  -d '{"phone": "5512345678", "message": "Your appointment is in 1 hour"}'
```

## Paso 4: Enviar a Múltiples Destinatarios

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

:::warning Límites de tasa
WhatsApp limita la tasa de envío. Espacia los mensajes de 1 a 3 segundos para envíos masivos. Enviar demasiado rápido puede hacer que tu cuenta sea restringida temporalmente. Consulta [Límites de Tasa](/docs/rate-limiting).
:::

## Patrones de Notificación

### Recordatorio de cita

```typescript
await notify(phone, `Reminder: your appointment with Dr. Smith is tomorrow at 10:00 AM.

Reply CONFIRM to confirm or CANCEL to cancel.`);
```

### Actualización de pedido

```typescript
await notify(phone, `Order #${orderId} update: ${status}

${status === "shipped" ? `Track: ${trackingUrl}` : ""}`);
```

### Alerta del sistema

```typescript
await notify(adminPhone, `⚠ Server alert: CPU usage at ${cpuPercent}% on ${hostname}`);
```

### Notificación a grupo

```typescript
// Send to a group instead of an individual
const groupJid = "120363XXXXX@g.us";
await client.sendMessage(groupJid, {
  conversation: "Deploy complete: v2.1.0 is live",
});
```

## Ejemplo Completo

Un servicio de notificaciones con API HTTP:

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

## Errores Comunes

:::warning No hagas spam
Enviar mensajes masivos no solicitados viola los Términos de Servicio de WhatsApp y hará que tu cuenta sea baneada. Solo envía notificaciones a usuarios que hayan dado su consentimiento.
:::

:::warning Límites de tasa
Espacia los envíos con un delay de 1-3 segundos. Consulta [Límites de Tasa](/docs/rate-limiting) para más detalles.
:::

:::warning Mantén la conexión activa
El cliente debe permanecer conectado para enviar mensajes. Si el proceso termina, tendrás que reconectar. Para producción, usa un gestor de procesos como PM2 o ejecútalo como servicio de systemd.
:::

<RelatedGuides slugs={["schedule-messages", "automate-group-messages", "build-a-bot"]} />
