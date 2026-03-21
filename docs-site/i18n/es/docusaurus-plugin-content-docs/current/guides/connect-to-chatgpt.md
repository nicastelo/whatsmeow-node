---
title: "Cómo Conectar WhatsApp con ChatGPT (OpenAI)"
sidebar_label: Conectar con ChatGPT
sidebar_position: 13
description: "Crea un chatbot de WhatsApp con ChatGPT usando whatsmeow-node y el SDK de OpenAI. Incluye historial de conversación, indicadores de escritura y GPT-4.1."
keywords: [conectar whatsapp chatgpt, bot whatsapp chatgpt, bot whatsapp openai nodejs, bot whatsapp gpt typescript, integración chatgpt whatsapp]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-chatgpt.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-chatgpt.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Conectar WhatsApp con ChatGPT (OpenAI)",
      "description": "Crea un chatbot de WhatsApp con ChatGPT usando whatsmeow-node y el SDK de OpenAI. Incluye historial de conversación, indicadores de escritura y GPT-4.1.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-chatgpt.png",
      "step": [
        {"@type": "HowToStep", "name": "Configurar ambos clientes", "text": "Inicializa WhatsmeowClient con createClient() y el cliente de OpenAI con new OpenAI()."},
        {"@type": "HowToStep", "name": "Manejar mensajes entrantes", "text": "Escucha el evento message, omite los mensajes propios, muestra el indicador de escritura y extrae el texto."},
        {"@type": "HowToStep", "name": "Enviar a ChatGPT", "text": "Llama a openai.chat.completions.create() con el mensaje del usuario y envía la respuesta de vuelta con sendMessage."},
        {"@type": "HowToStep", "name": "Agregar historial de conversación", "text": "Almacena el historial de mensajes por JID de usuario en un Map y pásalo a ChatGPT para conversaciones multi-turno."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Conectar WhatsApp con ChatGPT (OpenAI)",
      "description": "Crea un chatbot de WhatsApp con ChatGPT usando whatsmeow-node y el SDK de OpenAI. Incluye historial de conversación, indicadores de escritura y GPT-4.1.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-chatgpt.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Conectar WhatsApp con ChatGPT (OpenAI)](/img/guides/es/connect-to-chatgpt.png)
![Cómo Conectar WhatsApp con ChatGPT (OpenAI)](/img/guides/es/connect-to-chatgpt-light.png)

# Cómo Conectar WhatsApp con ChatGPT (OpenAI)

Combina whatsmeow-node con el SDK de OpenAI para crear un chatbot de WhatsApp potenciado por GPT-4.1. Los mensajes entran por WhatsApp, se envían a OpenAI para obtener una respuesta, y la respuesta vuelve al usuario — con indicadores de escritura mientras el modelo piensa.

## Requisitos Previos

- Una sesión vinculada de whatsmeow-node ([Cómo Vincular](pair-whatsapp))
- Una API key de OpenAI (configurada como variable de entorno `OPENAI_API_KEY`)
- El SDK de OpenAI: `npm install openai`

## Paso 1: Configurar Ambos Clientes

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import OpenAI from "openai";

const client = createClient({ store: "session.db" });
const openai = new OpenAI(); // reads OPENAI_API_KEY from env

const SYSTEM_PROMPT = "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";
```

## Paso 2: Manejar Mensajes Entrantes

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  await client.sendChatPresence(info.chat, "composing");

  const reply = await askChatGPT(info.sender, text);
  await client.sendMessage(info.chat, { conversation: reply });
});
```

## Paso 3: Enviar a ChatGPT

```typescript
async function askChatGPT(userJid: string, userMessage: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  return response.choices[0].message.content ?? "I couldn't generate a response.";
}
```

## Paso 4: Agregar Historial de Conversación

Para conversaciones multi-turno, almacena el historial de mensajes por usuario:

```typescript
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const conversations = new Map<string, ChatCompletionMessageParam[]>();
const MAX_HISTORY = 20;

async function askChatGPT(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const reply = response.choices[0].message.content ?? "I couldn't generate a response.";

  history.push({ role: "assistant", content: reply });
  conversations.set(userJid, history);

  return reply;
}
```

## Ejemplo Completo

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const client = createClient({ store: "session.db" });
const openai = new OpenAI();

const SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";

const conversations = new Map<string, ChatCompletionMessageParam[]>();
const MAX_HISTORY = 20;

async function askChatGPT(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const reply = response.choices[0].message.content ?? "I couldn't generate a response.";

  history.push({ role: "assistant", content: reply });
  conversations.set(userJid, history);

  return reply;
}

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  console.log(`${info.pushName}: ${text}`);
  await client.sendChatPresence(info.chat, "composing");

  try {
    const reply = await askChatGPT(info.sender, text);
    await client.sendMessage(info.chat, { conversation: reply });
    console.log(`→ ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error("OpenAI API error:", err);
    await client.sendMessage(info.chat, {
      conversation: "Sorry, I'm having trouble right now. Try again in a moment.",
    });
  }
});

client.on("logged_out", ({ reason }) => {
  console.error(`Logged out: ${reason}`);
  client.close();
  process.exit(1);
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! See: How to Pair WhatsApp");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  console.log("ChatGPT bot is online!");

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

:::warning Bucles de eco
Siempre verifica `info.isFromMe` primero. Sin esto, el bot envía un mensaje, ve su propio mensaje, lo envía a ChatGPT y responde de nuevo — para siempre.
:::

:::warning Exposición de la API key
Nunca escribas tu API key directamente en el código. Usa variables de entorno (`OPENAI_API_KEY`) o un archivo `.env` (agregado a `.gitignore`).
:::

:::warning Límites de tasa en ambos lados
Tanto la API de OpenAI como WhatsApp tienen límites de tasa. Para la API de OpenAI, maneja errores `429` con backoff exponencial. Para WhatsApp, evita enviar demasiados mensajes muy rápido — consulta [Límites de Tasa](/docs/rate-limiting).
:::

<RelatedGuides slugs={["connect-to-ai", "connect-to-gemini", "connect-to-ollama", "connect-to-deepseek"]} />
