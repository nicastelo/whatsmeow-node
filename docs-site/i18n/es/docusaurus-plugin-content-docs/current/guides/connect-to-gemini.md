---
title: "Cómo Conectar WhatsApp con Google Gemini"
sidebar_label: Conectar con Gemini
sidebar_position: 14
description: "Crea un chatbot de WhatsApp con Google Gemini usando whatsmeow-node y el SDK de Google GenAI. Incluye historial de conversación e indicadores de escritura."
keywords: [conectar whatsapp gemini, bot whatsapp gemini, bot whatsapp google ai nodejs, integración gemini whatsapp, whatsapp gemini typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-gemini.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-gemini.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Conectar WhatsApp con Google Gemini",
      "description": "Crea un chatbot de WhatsApp con Google Gemini usando whatsmeow-node y el SDK de Google GenAI. Incluye historial de conversación e indicadores de escritura.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-gemini.png",
      "step": [
        {"@type": "HowToStep", "name": "Configurar ambos clientes", "text": "Inicializa WhatsmeowClient con createClient() y Google GenAI con new GoogleGenAI()."},
        {"@type": "HowToStep", "name": "Manejar mensajes entrantes", "text": "Escucha el evento message, omite los mensajes propios, muestra el indicador de escritura y extrae el texto."},
        {"@type": "HowToStep", "name": "Enviar a Gemini", "text": "Llama a ai.models.generateContent() con el mensaje del usuario y envía la respuesta de vuelta con sendMessage."},
        {"@type": "HowToStep", "name": "Agregar historial de conversación", "text": "Usa la función de chat multi-turno de Gemini para mantener el contexto de conversación por usuario."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Conectar WhatsApp con Google Gemini",
      "description": "Crea un chatbot de WhatsApp con Google Gemini usando whatsmeow-node y el SDK de Google GenAI. Incluye historial de conversación e indicadores de escritura.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-gemini.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Conectar WhatsApp con Google Gemini](/img/guides/es/connect-to-gemini.png)
![Cómo Conectar WhatsApp con Google Gemini](/img/guides/es/connect-to-gemini-light.png)

# Cómo Conectar WhatsApp con Google Gemini

Combina whatsmeow-node con el SDK de Google GenAI para crear un chatbot de WhatsApp potenciado por Gemini. Los mensajes entran por WhatsApp, se envían a Gemini para obtener una respuesta, y la respuesta vuelve al usuario — con indicadores de escritura mientras el modelo piensa.

## Requisitos Previos

- Una sesión vinculada de whatsmeow-node ([Cómo Vincular](pair-whatsapp))
- Una API key de Google AI (configurada como variable de entorno `GEMINI_API_KEY`) — obtén una en [ai.google.dev](https://ai.google.dev/)
- El SDK de Google GenAI: `npm install @google/genai`

## Paso 1: Configurar Ambos Clientes

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { GoogleGenAI } from "@google/genai";

const client = createClient({ store: "session.db" });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  const reply = await askGemini(info.sender, text);
  await client.sendMessage(info.chat, { conversation: reply });
});
```

## Paso 3: Enviar a Gemini

```typescript
async function askGemini(userJid: string, userMessage: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userMessage,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    },
  });

  return response.text ?? "I couldn't generate a response.";
}
```

## Paso 4: Agregar Historial de Conversación

Gemini soporta chat multi-turno a través de la API `chats.create()`. Almacena una sesión de chat por usuario:

```typescript
import type { Chat } from "@google/genai";

const chats = new Map<string, Chat>();

function getChat(userJid: string): Chat {
  let chat = chats.get(userJid);
  if (!chat) {
    chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });
    chats.set(userJid, chat);
  }
  return chat;
}

async function askGemini(userJid: string, userMessage: string): Promise<string> {
  const chat = getChat(userJid);
  const response = await chat.sendMessage({ message: userMessage });
  return response.text ?? "I couldn't generate a response.";
}
```

## Ejemplo Completo

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { GoogleGenAI } from "@google/genai";
import type { Chat } from "@google/genai";

const client = createClient({ store: "session.db" });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";

const chats = new Map<string, Chat>();

function getChat(userJid: string): Chat {
  let chat = chats.get(userJid);
  if (!chat) {
    chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });
    chats.set(userJid, chat);
  }
  return chat;
}

async function askGemini(userJid: string, userMessage: string): Promise<string> {
  const chat = getChat(userJid);
  const response = await chat.sendMessage({ message: userMessage });
  return response.text ?? "I couldn't generate a response.";
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
    const reply = await askGemini(info.sender, text);
    await client.sendMessage(info.chat, { conversation: reply });
    console.log(`→ ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error("Gemini API error:", err);
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
  console.log("Gemini bot is online!");

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
Siempre verifica `info.isFromMe` primero. Sin esto, el bot envía un mensaje, ve su propio mensaje, lo envía a Gemini y responde de nuevo — para siempre.
:::

:::warning Exposición de la API key
Nunca escribas tu API key directamente en el código. Usa variables de entorno (`GEMINI_API_KEY`) o un archivo `.env` (agregado a `.gitignore`).
:::

:::warning El historial de chat está en memoria
Los objetos `Chat` se almacenan en un `Map` y se pierden al reiniciar. Para persistencia, guarda el historial de conversación en una base de datos y recrea los chats con la opción `history`.
:::

<RelatedGuides slugs={["connect-to-ai", "connect-to-chatgpt", "connect-to-ollama", "connect-to-deepseek"]} />
