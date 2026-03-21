---
title: "Cómo Conectar WhatsApp con Claude AI"
sidebar_label: Conectar con IA
sidebar_position: 7
description: "Construye un chatbot de WhatsApp con IA conectando whatsmeow-node con Claude a través del SDK de Anthropic. Incluye historial de conversación e indicadores de escritura."
keywords: [conectar whatsapp con claude, bot ia whatsapp, integración claude whatsapp, chatbot ia whatsapp nodejs]
---

import Head from '@docusaurus/Head';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-ai.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-ai.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Conectar WhatsApp con Claude AI",
      "description": "Construye un chatbot de WhatsApp con IA conectando whatsmeow-node con Claude a través del SDK de Anthropic. Incluye historial de conversación e indicadores de escritura.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-ai.png",
      "step": [
        {"@type": "HowToStep", "name": "Set Up Both Clients", "text": "Initialize WhatsmeowClient with createClient() and Anthropic client with new Anthropic()."},
        {"@type": "HowToStep", "name": "Handle Incoming Messages", "text": "Listen for the message event, skip own messages, show typing, and extract text."},
        {"@type": "HowToStep", "name": "Send to Claude", "text": "Call anthropic.messages.create() with the user message and send the response back via sendMessage."},
        {"@type": "HowToStep", "name": "Add Conversation History", "text": "Store message history per user JID in a Map and pass it to Claude for multi-turn conversations."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Conectar WhatsApp con Claude AI",
      "description": "Construye un chatbot de WhatsApp con IA conectando whatsmeow-node con Claude a través del SDK de Anthropic. Incluye historial de conversación e indicadores de escritura.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/connect-to-ai.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Conectar WhatsApp con Claude AI](/img/guides/es/connect-to-ai.png)
![Cómo Conectar WhatsApp con Claude AI](/img/guides/es/connect-to-ai-light.png)

# Cómo Conectar WhatsApp con Claude AI

Combina whatsmeow-node con el SDK de Anthropic para construir un chatbot de WhatsApp potenciado por Claude. Los mensajes llegan vía WhatsApp, se envían a Claude para obtener una respuesta, y la respuesta regresa al usuario — con indicadores de escritura mientras Claude piensa.

## Requisitos Previos

- Una sesión de whatsmeow-node vinculada ([Cómo Vincular](pair-whatsapp))
- Una API key de Anthropic (configurada como variable de entorno `ANTHROPIC_API_KEY`)
- El SDK de Anthropic: `npm install @anthropic-ai/sdk`

## Paso 1: Configurar Ambos Clientes

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import Anthropic from "@anthropic-ai/sdk";

const client = createClient({ store: "session.db" });
const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const SYSTEM_PROMPT = "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";
```

## Paso 2: Manejar Mensajes Entrantes

```typescript
client.on("message", async ({ info, message }) => {
  // Skip own messages to avoid loops
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  // Show typing while Claude thinks
  await client.sendChatPresence(info.chat, "composing");

  // Get response from Claude
  const reply = await askClaude(info.sender, text);

  // Send the reply
  await client.sendMessage(info.chat, { conversation: reply });
});
```

## Paso 3: Enviar a Claude

```typescript
async function askClaude(userJid: string, userMessage: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "I couldn't generate a response.";
}
```

## Paso 4: Agregar Historial de Conversación

Para conversaciones de múltiples turnos, almacena el historial de mensajes por usuario:

```typescript
type Message = { role: "user" | "assistant"; content: string };
const conversations = new Map<string, Message[]>();
const MAX_HISTORY = 20;

async function askClaude(userJid: string, userMessage: string): Promise<string> {
  // Get or create conversation history
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  // Trim to last N messages to control token usage
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  const block = response.content[0];
  const reply = block.type === "text" ? block.text : "I couldn't generate a response.";

  // Store the assistant's reply
  history.push({ role: "assistant", content: reply });
  conversations.set(userJid, history);

  return reply;
}
```

## Ejemplo Completo

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import Anthropic from "@anthropic-ai/sdk";

const client = createClient({ store: "session.db" });
const anthropic = new Anthropic();

const SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";

type Message = { role: "user" | "assistant"; content: string };
const conversations = new Map<string, Message[]>();
const MAX_HISTORY = 20;

async function askClaude(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  const block = response.content[0];
  const reply = block.type === "text" ? block.text : "I couldn't generate a response.";

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

  // Show typing while Claude thinks
  await client.sendChatPresence(info.chat, "composing");

  try {
    const reply = await askClaude(info.sender, text);
    await client.sendMessage(info.chat, { conversation: reply });
    console.log(`→ ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error("Claude API error:", err);
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
  console.log("AI bot is online!");

  process.on("SIGINT", async () => {
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Mejoras

Aquí hay algunas ideas para extender esto aún más:

- **Comprensión de imágenes** — descarga imágenes entrantes con `downloadAny()`, lee el archivo y envíalo a Claude como un bloque de imagen en base64
- **Limitación de tasa** — rastrea la cantidad de mensajes por usuario para prevenir abuso de la API
- **Comando de reinicio** — agrega un comando `!reset` para limpiar el historial de conversación
- **Historial persistente** — almacena las conversaciones en una base de datos en lugar de en memoria para que persistan entre reinicios

## Errores Comunes

:::warning Bucles de eco
Siempre verifica `info.isFromMe` primero. Sin esto, el bot envía un mensaje, ve su propio mensaje, lo envía a Claude, y responde de nuevo — indefinidamente.
:::

:::warning Exposición de API key
Nunca escribas tu API key directamente en el código fuente. Usa variables de entorno (`ANTHROPIC_API_KEY`) o un archivo `.env` (agregado a `.gitignore`).
:::

:::warning Límites de tasa en ambos lados
Tanto la API de Anthropic como WhatsApp tienen límites de tasa. Para la API de Anthropic, maneja errores `429` con backoff exponencial. Para WhatsApp, evita enviar demasiados mensajes demasiado rápido — consulta [Límites de Tasa](/docs/rate-limiting).
:::

## Siguientes Pasos

- [Cómo Crear un Bot](build-a-bot) — fundamentos del manejo de mensajes y comandos
- [Cómo Mostrar Indicadores de Escritura](typing-indicators) — haz que la IA se sienta más natural
- [Ejemplo de Echo Bot](/docs/examples/bots-and-resilience#echo-bot) — bot de referencia completo
- [Límites de Tasa](/docs/rate-limiting) — comprende los límites de envío de WhatsApp
