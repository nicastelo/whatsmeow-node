---
title: "Cómo Conectar WhatsApp con Ollama (IA Local)"
sidebar_label: Conectar con Ollama
sidebar_position: 16
description: "Crea un chatbot de WhatsApp con un modelo de IA local usando whatsmeow-node y Ollama. Sin API key — corre completamente en tu máquina."
keywords: [conectar whatsapp ollama, bot whatsapp ia local, bot whatsapp ollama nodejs, bot whatsapp llama, whatsapp llm local, whatsapp ia autoalojada]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-ollama.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-ollama.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Connect WhatsApp to Ollama (Local AI)",
      "description": "Build a WhatsApp chatbot powered by a local AI model using whatsmeow-node and Ollama. No API key needed — runs entirely on your machine.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-ollama.png",
      "step": [
        {"@type": "HowToStep", "name": "Install Ollama and Pull a Model", "text": "Install Ollama from ollama.com and pull a model like llama3.2 or gemma3."},
        {"@type": "HowToStep", "name": "Set Up Both Clients", "text": "Initialize WhatsmeowClient with createClient() and Ollama client with new Ollama()."},
        {"@type": "HowToStep", "name": "Handle Incoming Messages", "text": "Listen for the message event, skip own messages, show typing, and extract text."},
        {"@type": "HowToStep", "name": "Send to Ollama", "text": "Call ollama.chat() with the user message and send the response back via sendMessage."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Connect WhatsApp to Ollama (Local AI)",
      "description": "Build a WhatsApp chatbot powered by a local AI model using whatsmeow-node and Ollama. No API key needed — runs entirely on your machine.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-ollama.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Conectar WhatsApp con Ollama (IA Local)](/img/guides/es/connect-to-ollama.png)
![Cómo Conectar WhatsApp con Ollama (IA Local)](/img/guides/es/connect-to-ollama-light.png)

# Cómo Conectar WhatsApp con Ollama (IA Local)

Ejecuta tu chatbot de WhatsApp completamente en tu propia máquina — sin API keys, sin costos de nube, sin datos saliendo de tu red. Ollama facilita ejecutar modelos open source como Llama, Gemma y Mistral localmente.

## Requisitos Previos

- Una sesión vinculada de whatsmeow-node ([Cómo Vincular](pair-whatsapp))
- [Ollama](https://ollama.com/) instalado y corriendo
- Un modelo descargado: `ollama pull llama3.2`
- El SDK de Ollama: `npm install ollama`

## Paso 1: Descargar un Modelo

```bash
# Install Ollama from https://ollama.com, then:
ollama pull llama3.2
```

Otras buenas opciones para chat:
- `gemma3` — modelo abierto de Google, rápido y capaz
- `mistral` — potente para su tamaño
- `llama3.2:1b` — el Llama más pequeño, respuestas más rápidas

## Paso 2: Configurar Ambos Clientes

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { Ollama } from "ollama";

const client = createClient({ store: "session.db" });
const ollama = new Ollama({ host: "http://localhost:11434" });

const MODEL = "llama3.2";
const SYSTEM_PROMPT = "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";
```

## Paso 3: Manejar Mensajes Entrantes

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  await client.sendChatPresence(info.chat, "composing");

  const reply = await askOllama(info.sender, text);
  await client.sendMessage(info.chat, { conversation: reply });
});
```

## Paso 4: Enviar a Ollama

```typescript
async function askOllama(userJid: string, userMessage: string): Promise<string> {
  const response = await ollama.chat({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  return response.message.content;
}
```

## Paso 5: Agregar Historial de Conversación

```typescript
import type { Message } from "ollama";

const conversations = new Map<string, Message[]>();
const MAX_HISTORY = 20;

async function askOllama(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const reply = response.message.content;
  history.push({ role: "assistant", content: reply });
  conversations.set(userJid, history);

  return reply;
}
```

## Ejemplo Completo

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { Ollama } from "ollama";
import type { Message } from "ollama";

const client = createClient({ store: "session.db" });
const ollama = new Ollama({ host: "http://localhost:11434" });

const MODEL = "llama3.2";
const SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";

const conversations = new Map<string, Message[]>();
const MAX_HISTORY = 20;

async function askOllama(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const reply = response.message.content;
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
    const reply = await askOllama(info.sender, text);
    await client.sendMessage(info.chat, { conversation: reply });
    console.log(`→ ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error("Ollama error:", err);
    await client.sendMessage(info.chat, {
      conversation: "Sorry, I'm having trouble right now. Make sure Ollama is running.",
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
  console.log(`Ollama bot is online! (model: ${MODEL})`);

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

:::warning Ollama debe estar corriendo
Asegúrate de que el servidor de Ollama esté corriendo (`ollama serve`) antes de iniciar el bot. Si no está corriendo, todas las peticiones van a fallar.
:::

:::warning El tiempo de respuesta depende del hardware
Los modelos locales corren en tu CPU/GPU. Modelos más pequeños como `llama3.2:1b` responden en 1-3 segundos en hardware moderno. Modelos más grandes pueden tardar 10+ segundos — el indicador de escritura mantiene informado al usuario mientras espera.
:::

:::warning Bucles de eco
Siempre verifica `info.isFromMe` primero. Sin esto, el bot responde a sus propios mensajes para siempre.
:::

:::warning El modelo debe estar descargado primero
Ejecuta `ollama pull llama3.2` antes de iniciar el bot. Si el modelo no está descargado, las peticiones van a fallar.
:::

<RelatedGuides slugs={["connect-to-ai", "connect-to-chatgpt", "connect-to-gemini", "connect-to-deepseek"]} />
