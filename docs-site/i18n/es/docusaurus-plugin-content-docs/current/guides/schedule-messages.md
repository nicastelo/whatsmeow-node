---
title: "Cómo Programar Mensajes de WhatsApp con Node.js"
sidebar_label: Programar Mensajes
sidebar_position: 18
description: "Programa mensajes de WhatsApp para enviar a una hora específica con Node.js — envíos diferidos, recordatorios recurrentes y programación con cron usando whatsmeow-node."
keywords: [programar mensajes whatsapp nodejs, whatsapp mensajes programados api, whatsapp cron job, mensaje whatsapp diferido, bot recordatorio whatsapp nodejs]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/schedule-messages.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/schedule-messages.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Programar Mensajes de WhatsApp con Node.js",
      "description": "Programa mensajes de WhatsApp para enviar a una hora específica con Node.js — envíos diferidos, recordatorios recurrentes y programación con cron usando whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/schedule-messages.png",
      "step": [
        {"@type": "HowToStep", "name": "Enviar un mensaje diferido", "text": "Usa setTimeout para enviar un mensaje después de un delay."},
        {"@type": "HowToStep", "name": "Programar a una hora específica", "text": "Calcula el delay desde ahora hasta la hora objetivo y usa setTimeout."},
        {"@type": "HowToStep", "name": "Configurar mensajes recurrentes", "text": "Usa node-cron para enviar mensajes con un horario cron — recordatorios diarios, reportes semanales."},
        {"@type": "HowToStep", "name": "Crear un programador para usuarios", "text": "Permite que los usuarios programen mensajes vía comandos de WhatsApp como !remind 30m Tomar un descanso."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Programar Mensajes de WhatsApp con Node.js",
      "description": "Programa mensajes de WhatsApp para enviar a una hora específica con Node.js — envíos diferidos, recordatorios recurrentes y programación con cron usando whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/schedule-messages.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Programar Mensajes de WhatsApp con Node.js](/img/guides/es/schedule-messages.png)
![Cómo Programar Mensajes de WhatsApp con Node.js](/img/guides/es/schedule-messages-light.png)

# Cómo Programar Mensajes de WhatsApp con Node.js

WhatsApp no tiene una API de programación incorporada, pero puedes construir una con whatsmeow-node y herramientas estándar de programación de Node.js — `setTimeout` para delays únicos, `node-cron` para mensajes recurrentes, o una cola respaldada por base de datos para persistencia.

## Requisitos Previos

- Una sesión vinculada de whatsmeow-node ([Cómo Vincular](pair-whatsapp))
- Para programaciones recurrentes: `npm install node-cron`

## Enviar un Mensaje Diferido

El enfoque más simple — envía un mensaje después de un delay:

```typescript
function sendLater(jid: string, message: string, delayMs: number) {
  setTimeout(async () => {
    await client.sendMessage(jid, { conversation: message });
    console.log(`Sent scheduled message to ${jid}`);
  }, delayMs);
}

// Send in 30 minutes
sendLater("5512345678@s.whatsapp.net", "Time's up!", 30 * 60 * 1000);
```

## Programar a una Hora Específica

Calcula el delay desde ahora hasta la hora objetivo:

```typescript
function sendAt(jid: string, message: string, date: Date) {
  const delay = date.getTime() - Date.now();

  if (delay <= 0) {
    console.error("Scheduled time is in the past");
    return;
  }

  console.log(`Scheduled for ${date.toLocaleString()} (in ${Math.round(delay / 1000)}s)`);

  setTimeout(async () => {
    await client.sendMessage(jid, { conversation: message });
  }, delay);
}

// Send tomorrow at 9 AM
const tomorrow9am = new Date();
tomorrow9am.setDate(tomorrow9am.getDate() + 1);
tomorrow9am.setHours(9, 0, 0, 0);

sendAt("5512345678@s.whatsapp.net", "Good morning! Don't forget the meeting at 10.", tomorrow9am);
```

## Configurar Mensajes Recurrentes con Cron

Usa `node-cron` para programaciones recurrentes:

```bash
npm install node-cron
```

```typescript
import cron from "node-cron";

// Every weekday at 8:55 AM — "standup in 5 minutes"
cron.schedule("55 8 * * 1-5", async () => {
  const groupJid = "120363XXXXX@g.us";
  await client.sendMessage(groupJid, {
    conversation: "Standup in 5 minutes!",
  });
});

// Every Monday at 9 AM — weekly report
cron.schedule("0 9 * * 1", async () => {
  const reportChat = "5512345678@s.whatsapp.net";
  await client.sendMessage(reportChat, {
    conversation: "Weekly report is ready: https://example.com/reports/latest",
  });
});

// First day of every month — billing reminder
cron.schedule("0 10 1 * *", async () => {
  const billingGroup = "120363YYYYY@g.us";
  await client.sendMessage(billingGroup, {
    conversation: "Reminder: invoices are due by the 5th",
  });
});
```

:::info Sintaxis cron
`node-cron` usa el formato estándar de cron: `minuto hora día-del-mes mes día-de-la-semana`. Usa [crontab.guru](https://crontab.guru/) para construir expresiones.
:::

## Crear un Programador para Usuarios

Permite que los usuarios programen recordatorios vía comandos de WhatsApp:

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text?.startsWith("!remind")) return;

  // Parse: !remind 30m Take a break
  const match = text.match(/^!remind\s+(\d+)(m|h|s)\s+(.+)$/);
  if (!match) {
    await client.sendMessage(info.chat, {
      conversation: "Usage: !remind <number><m|h|s> <message>\nExample: !remind 30m Take a break",
    });
    return;
  }

  const [, amount, unit, reminder] = match;
  const multiplier = { s: 1000, m: 60_000, h: 3_600_000 }[unit]!;
  const delayMs = parseInt(amount) * multiplier;

  setTimeout(async () => {
    await client.sendRawMessage(info.chat, {
      extendedTextMessage: {
        text: `Reminder: ${reminder}`,
        contextInfo: {
          mentionedJid: [info.sender],
        },
      },
    });
  }, delayMs);

  const delayText = `${amount}${unit}`;
  await client.sendMessage(info.chat, {
    conversation: `Got it! I'll remind you in ${delayText}: "${reminder}"`,
  });
});
```

## Ejemplo Completo

Un bot programador con comandos `!remind` y un cron diario:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import cron from "node-cron";

const client = createClient({ store: "session.db" });

// Daily standup reminder
cron.schedule("55 8 * * 1-5", async () => {
  const group = "120363XXXXX@g.us";
  await client.sendMessage(group, {
    conversation: "Standup in 5 minutes!",
  });
});

// User-facing !remind command
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text?.startsWith("!remind")) return;

  const match = text.match(/^!remind\s+(\d+)(m|h|s)\s+(.+)$/);
  if (!match) {
    await client.sendMessage(info.chat, {
      conversation: "Usage: !remind <number><m|h|s> <message>\nExample: !remind 30m Take a break",
    });
    return;
  }

  const [, amount, unit, reminder] = match;
  const multiplier = { s: 1000, m: 60_000, h: 3_600_000 }[unit]!;
  const delayMs = parseInt(amount) * multiplier;

  setTimeout(async () => {
    await client.sendRawMessage(info.chat, {
      extendedTextMessage: {
        text: `Reminder: ${reminder}`,
        contextInfo: {
          mentionedJid: [info.sender],
        },
      },
    });
  }, delayMs);

  await client.sendMessage(info.chat, {
    conversation: `I'll remind you in ${amount}${unit}: "${reminder}"`,
  });
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired!");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  console.log("Scheduler bot is online!");

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

:::warning Las programaciones en memoria se pierden al reiniciar
Las programaciones de `setTimeout` y `node-cron` viven en memoria. Si el proceso se reinicia, los recordatorios pendientes se pierden. Para producción, persiste las programaciones en una base de datos y recárgalas al iniciar.
:::

:::warning Zonas horarias
`node-cron` usa la zona horaria del servidor por defecto. Configúrala explícitamente con la opción `timezone` si tus usuarios están en diferentes zonas horarias: `cron.schedule("0 9 * * *", fn, { timezone: "America/Sao_Paulo" })`.
:::

:::warning Límites de tasa
Si un cron job envía a muchos destinatarios, espacia los envíos. Consulta [Límites de Tasa](/docs/rate-limiting).
:::

<RelatedGuides slugs={["send-notifications", "automate-group-messages", "build-a-bot"]} />
