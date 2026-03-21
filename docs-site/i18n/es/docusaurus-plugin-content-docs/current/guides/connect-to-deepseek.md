---
title: "Cómo Conectar WhatsApp con DeepSeek"
sidebar_label: Conectar con DeepSeek
sidebar_position: 15
description: "Crea un chatbot de WhatsApp con DeepSeek usando whatsmeow-node y el SDK de OpenAI. DeepSeek usa una API compatible con OpenAI."
keywords: [conectar whatsapp deepseek, bot whatsapp deepseek, deepseek whatsapp nodejs, integración whatsapp deepseek, chatbot deepseek whatsapp]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-deepseek.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-deepseek.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Connect WhatsApp to DeepSeek",
      "description": "Build a WhatsApp chatbot powered by DeepSeek using whatsmeow-node and the OpenAI SDK. DeepSeek uses an OpenAI-compatible API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-deepseek.png",
      "step": [
        {"@type": "HowToStep", "name": "Set Up Both Clients", "text": "Initialize WhatsmeowClient with createClient() and OpenAI client pointing to DeepSeek's base URL."},
        {"@type": "HowToStep", "name": "Handle Incoming Messages", "text": "Listen for the message event, skip own messages, show typing, and extract text."},
        {"@type": "HowToStep", "name": "Send to DeepSeek", "text": "Call openai.chat.completions.create() with the deepseek-chat model and send the response back via sendMessage."},
        {"@type": "HowToStep", "name": "Add Conversation History", "text": "Store message history per user JID in a Map and pass it to DeepSeek for multi-turn conversations."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Connect WhatsApp to DeepSeek",
      "description": "Build a WhatsApp chatbot powered by DeepSeek using whatsmeow-node and the OpenAI SDK. DeepSeek uses an OpenAI-compatible API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-deepseek.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Conectar WhatsApp con DeepSeek](/img/guides/es/connect-to-deepseek.png)
![Cómo Conectar WhatsApp con DeepSeek](/img/guides/es/connect-to-deepseek-light.png)

# Cómo Conectar WhatsApp con DeepSeek

DeepSeek expone una API compatible con OpenAI, así que puedes usar el mismo paquete npm `openai` — solo apúntalo al endpoint de DeepSeek. Esto facilita cambiar entre OpenAI, DeepSeek y otros proveedores compatibles.

## Requisitos Previos

- Una sesión vinculada de whatsmeow-node ([Cómo Vincular](pair-whatsapp))
- Una API key de DeepSeek (configurada como variable de entorno `DEEPSEEK_API_KEY`) — obtén una en [platform.deepseek.com](https://platform.deepseek.com/)
- El SDK de OpenAI: `npm install openai`

## Paso 1: Configurar Ambos Clientes

La única diferencia con OpenAI es el `baseURL` y la API key:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import OpenAI from "openai";

const client = createClient({ store: "session.db" });
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

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

  const reply = await askDeepSeek(info.sender, text);
  await client.sendMessage(info.chat, { conversation: reply });
});
```

## Paso 3: Enviar a DeepSeek

```typescript
async function askDeepSeek(userJid: string, userMessage: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  return response.choices[0].message.content ?? "I couldn't generate a response.";
}
```

:::info
DeepSeek también ofrece `deepseek-reasoner` para tareas de razonamiento complejo. Cambia el nombre del modelo para probarlo.
:::

## Paso 4: Agregar Historial de Conversación

Como DeepSeek usa el formato compatible con OpenAI, el patrón de historial es idéntico:

```typescript
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const conversations = new Map<string, ChatCompletionMessageParam[]>();
const MAX_HISTORY = 20;

async function askDeepSeek(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
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
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";

const conversations = new Map<string, ChatCompletionMessageParam[]>();
const MAX_HISTORY = 20;

async function askDeepSeek(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
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
    const reply = await askDeepSeek(info.sender, text);
    await client.sendMessage(info.chat, { conversation: reply });
    console.log(`→ ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error("DeepSeek API error:", err);
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
  console.log("DeepSeek bot is online!");

  process.on("SIGINT", async () => {
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Cambiar Entre Proveedores

Como DeepSeek, OpenAI y muchos otros proveedores usan el mismo formato de API, puedes hacer configurable el proveedor:

```typescript
const openai = new OpenAI({
  baseURL: process.env.AI_BASE_URL ?? "https://api.openai.com/v1",
  apiKey: process.env.AI_API_KEY,
});

const model = process.env.AI_MODEL ?? "gpt-4o";
```

Esto funciona con cualquier proveedor compatible con OpenAI — DeepSeek, Groq, Together AI, Mistral y más.

## Errores Comunes

:::warning Bucles de eco
Siempre verifica `info.isFromMe` primero. Sin esto, el bot responde a sus propios mensajes para siempre.
:::

:::warning Exposición de la API key
Nunca escribas tu API key directamente en el código. Usa variables de entorno o un archivo `.env` (agregado a `.gitignore`).
:::

<RelatedGuides slugs={["connect-to-chatgpt", "connect-to-ai", "connect-to-ollama"]} />
