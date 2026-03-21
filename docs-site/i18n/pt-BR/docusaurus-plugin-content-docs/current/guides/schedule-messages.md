---
title: "Como Agendar Mensagens no WhatsApp com Node.js"
sidebar_label: Agendar Mensagens
sidebar_position: 18
description: "Agende mensagens no WhatsApp para enviar em um horário específico com Node.js — envios com delay, lembretes recorrentes e agendamento com cron usando whatsmeow-node."
keywords: [agendar mensagens whatsapp nodejs, whatsapp mensagens agendadas api, whatsapp cron job, mensagem whatsapp com delay, bot lembrete whatsapp nodejs]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/schedule-messages.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/schedule-messages.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Schedule WhatsApp Messages with Node.js",
      "description": "Schedule WhatsApp messages to send at a specific time with Node.js — delayed sends, recurring reminders, and cron-based scheduling using whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/schedule-messages.png",
      "step": [
        {"@type": "HowToStep", "name": "Send a Delayed Message", "text": "Use setTimeout to send a message after a delay."},
        {"@type": "HowToStep", "name": "Schedule at a Specific Time", "text": "Calculate the delay from now until the target time and use setTimeout."},
        {"@type": "HowToStep", "name": "Set Up Recurring Messages", "text": "Use node-cron to send messages on a cron schedule — daily reminders, weekly reports."},
        {"@type": "HowToStep", "name": "Build a User-Facing Scheduler", "text": "Let users schedule messages via WhatsApp commands like !remind 30m Take a break."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Schedule WhatsApp Messages with Node.js",
      "description": "Schedule WhatsApp messages to send at a specific time with Node.js — delayed sends, recurring reminders, and cron-based scheduling using whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/schedule-messages.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Agendar Mensagens no WhatsApp com Node.js](/img/guides/pt-BR/schedule-messages.png)
![Como Agendar Mensagens no WhatsApp com Node.js](/img/guides/pt-BR/schedule-messages-light.png)

# Como Agendar Mensagens no WhatsApp com Node.js

O WhatsApp não tem uma API nativa de agendamento, mas você pode construir uma com whatsmeow-node e ferramentas padrão de agendamento do Node.js — `setTimeout` para delays únicos, `node-cron` para mensagens recorrentes, ou uma fila com banco de dados para persistência.

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))
- Para agendamentos recorrentes: `npm install node-cron`

## Enviar uma Mensagem com Delay

A abordagem mais simples — envie uma mensagem após um delay:

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

## Agendar para um Horário Específico

Calcule o delay entre agora e o horário desejado:

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

## Configurar Mensagens Recorrentes com Cron

Use `node-cron` para agendamentos recorrentes:

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

:::info Sintaxe cron
O `node-cron` usa o formato cron padrão: `minuto hora dia-do-mês mês dia-da-semana`. Use [crontab.guru](https://crontab.guru/) para criar expressões.
:::

## Criar um Agendador para o Usuário

Permita que os usuários agendem lembretes via comandos no WhatsApp:

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

## Exemplo Completo

Um bot de agendamento com comandos `!remind` e um cron diário:

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

## Erros Comuns

:::warning Agendamentos em memória são perdidos ao reiniciar
Os agendamentos via `setTimeout` e `node-cron` vivem na memória. Se o processo reiniciar, os lembretes pendentes são perdidos. Para produção, persista os agendamentos em um banco de dados e recarregue-os na inicialização.
:::

:::warning Fuso horário
O `node-cron` usa o fuso horário do servidor por padrão. Defina-o explicitamente com a opção `timezone` se seus usuários estão em fusos diferentes: `cron.schedule("0 9 * * *", fn, { timezone: "America/Sao_Paulo" })`.
:::

:::warning Rate limiting
Se um cron job envia para muitos destinatários, espaçe os envios. Veja [Rate Limiting](/docs/rate-limiting).
:::

<RelatedGuides slugs={["send-notifications", "automate-group-messages", "build-a-bot"]} />
