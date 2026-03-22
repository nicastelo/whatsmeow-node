---
title: "Cómo Usar whatsmeow-node con Typebot"
sidebar_label: Integración con Typebot
sidebar_position: 24
description: "Conecta whatsmeow-node a Typebot para flujos de chatbot en WhatsApp — reemplaza Evolution API con un backend de WhatsApp más ligero y estable."
keywords: [typebot whatsapp, typebot whatsmeow, typebot alternativa evolution api, typebot bot whatsapp, typebot integración whatsapp, typebot whatsapp nodejs]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-typebot.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-typebot.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Usar whatsmeow-node con Typebot",
      "description": "Conecta whatsmeow-node a Typebot para flujos de chatbot en WhatsApp — reemplaza Evolution API con un backend de WhatsApp más ligero y estable.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-typebot.png",
      "step": [
        {"@type": "HowToStep", "name": "Construir una API REST de whatsmeow-node", "text": "Crea un servidor Express que haga de puente entre los mensajes de WhatsApp y Typebot vía HTTP."},
        {"@type": "HowToStep", "name": "Iniciar un flujo de Typebot", "text": "Envía por POST el primer mensaje a la API de Typebot para iniciar un flujo de conversación."},
        {"@type": "HowToStep", "name": "Continuar la conversación", "text": "Envía las respuestas del usuario al endpoint continueChat de Typebot y retransmite las respuestas del bot a WhatsApp."},
        {"@type": "HowToStep", "name": "Manejar mensajes enriquecidos", "text": "Analiza los bloques de respuesta de Typebot (texto, imagen, input) y envía los mensajes de WhatsApp apropiados."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Usar whatsmeow-node con Typebot",
      "description": "Conecta whatsmeow-node a Typebot para flujos de chatbot en WhatsApp — reemplaza Evolution API con un backend de WhatsApp más ligero y estable.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/integrate-typebot.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Usar whatsmeow-node con Typebot](/img/guides/es/integrate-typebot.png)
![Cómo Usar whatsmeow-node con Typebot](/img/guides/es/integrate-typebot-light.png)

# Cómo Usar whatsmeow-node con Typebot

[Typebot](https://typebot.io) es un constructor de chatbots open source con un editor visual de flujos. Típicamente se conecta a WhatsApp a través de [Evolution API](https://github.com/EvolutionAPI/evolution-api) (que usa Baileys). Puedes reemplazar toda esa capa con whatsmeow-node para una conexión más ligera y estable.

## Cómo Funciona

```
WhatsApp User
  ↕
whatsmeow-node Bridge (Express)
  ↕ Typebot API
Typebot Flow Engine
```

En vez de `WhatsApp → Evolution API (Baileys) → Typebot`, usas `WhatsApp → whatsmeow-node → Typebot` directamente. Menos piezas móviles, menos memoria, más estabilidad.

## Requisitos Previos

- Una sesión vinculada de whatsmeow-node ([Cómo Vincular](pair-whatsapp))
- Una instancia de Typebot (autoalojada o en la nube) con un flujo publicado
- Express: `npm install express`

## Paso 1: Obtener tu ID de Typebot

1. Abre tu flujo de Typebot en el editor
2. Haz clic en **Share** y anota el ID del typebot de la URL o la configuración de embed
3. La URL base de la API de Typebot es `https://typebot.io` (nube) o tu URL autoalojada

## Paso 2: Construir el Puente

El puente administra conversaciones — inicia una sesión de Typebot por usuario de WhatsApp y retransmite mensajes en ambas direcciones:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

const TYPEBOT_URL = process.env.TYPEBOT_URL ?? "https://typebot.io";
const TYPEBOT_ID = process.env.TYPEBOT_ID!;

// Track active Typebot sessions per WhatsApp user
const sessions = new Map<string, string>(); // JID → sessionId

// --- Start or continue a Typebot conversation ---
async function handleMessage(jid: string, text: string): Promise<string[]> {
  const sessionId = sessions.get(jid);

  let response;

  if (!sessionId) {
    // Start a new Typebot session
    response = await fetch(`${TYPEBOT_URL}/api/v1/typebots/${TYPEBOT_ID}/startChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { type: "text", text } }),
    }).then((r) => r.json());

    if (response.sessionId) {
      sessions.set(jid, response.sessionId);
    }
  } else {
    // Continue existing session
    response = await fetch(`${TYPEBOT_URL}/api/v1/sessions/${sessionId}/continueChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { type: "text", text } }),
    }).then((r) => r.json());
  }

  // Extract text messages from Typebot response
  return extractMessages(response);
}

// --- Parse Typebot response blocks into text messages ---
function extractMessages(response: Record<string, unknown>): string[] {
  const messages: string[] = [];
  const msgs = (response.messages as Array<{ type: string; content?: { richText?: Array<{ children: Array<{ text?: string }> }> } }>) ?? [];

  for (const msg of msgs) {
    if (msg.type === "text" && msg.content?.richText) {
      const text = msg.content.richText
        .map((block) => block.children.map((c) => c.text ?? "").join(""))
        .join("\n");
      if (text.trim()) messages.push(text);
    }
  }

  return messages;
}

// --- Listen for WhatsApp messages ---
client.on("message", async ({ info, message }) => {
  if (info.isFromMe || info.isGroup) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  await client.sendChatPresence(info.chat, "composing");

  try {
    const replies = await handleMessage(info.sender, text);

    for (const reply of replies) {
      await client.sendMessage(info.chat, { conversation: reply });
      // Small delay between multiple messages
      if (replies.length > 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  } catch (err) {
    console.error("Typebot error:", err);
    await client.sendMessage(info.chat, {
      conversation: "Sorry, I'm having trouble right now. Try again in a moment.",
    });
  }
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired!");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  console.log("Typebot bridge is online!");

  process.on("SIGINT", async () => {
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Manejar Tipos de Input

Los flujos de Typebot pueden solicitar diferentes tipos de input. Manéjalos verificando el bloque `input`:

```typescript
function extractMessages(response: Record<string, unknown>): string[] {
  const messages: string[] = [];
  const msgs = (response.messages as Array<Record<string, unknown>>) ?? [];

  for (const msg of msgs) {
    if (msg.type === "text" && (msg.content as Record<string, unknown>)?.richText) {
      const richText = (msg.content as Record<string, unknown>).richText as Array<{ children: Array<{ text?: string }> }>;
      const text = richText
        .map((block) => block.children.map((c) => c.text ?? "").join(""))
        .join("\n");
      if (text.trim()) messages.push(text);
    }
  }

  // If the flow expects input, prompt the user
  const input = response.input as Record<string, unknown> | undefined;
  if (input) {
    const inputType = input.type as string;
    if (inputType === "choice input") {
      const items = (input.items as Array<{ content: string }>) ?? [];
      const options = items.map((item, i) => `${i + 1}. ${item.content}`).join("\n");
      messages.push(options);
    }
  }

  return messages;
}
```

## Reiniciar Conversaciones

Agrega un comando `!reset` para reiniciar el flujo de Typebot:

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe || info.isGroup) return;

  const text = /* ... extract text ... */;
  if (!text) return;

  if (text.toLowerCase() === "!reset") {
    sessions.delete(info.sender);
    await client.sendMessage(info.chat, {
      conversation: "Conversation reset! Send a message to start over.",
    });
    return;
  }

  // ... handle message as before
});
```

## Evolution API vs whatsmeow-node

Si actualmente estás usando Evolution API con Typebot, esto es lo que cambia:

| | Evolution API | Puente whatsmeow-node |
|---|---|---|
| **Backend de WhatsApp** | Baileys | whatsmeow (Go) |
| **Memoria** | ~50-100 MB | ~10-20 MB |
| **Arquitectura** | Servicio separado | Integrado en el puente |
| **Configuración** | Docker + config | `npm install` + 50 líneas |
| **Estabilidad** | Actualizaciones de forks de Baileys | Upstream estable |

## Errores Comunes

:::warning Expiración de sesión
Las sesiones de Typebot pueden expirar. Si `continueChat` devuelve un error, elimina la sesión del mapa e inicia una nueva.
:::

:::warning Límites de tasa
Los flujos de Typebot pueden enviar múltiples mensajes en secuencia. Agrega un pequeño delay (1 segundo) entre mensajes para evitar los límites de tasa de WhatsApp.
:::

:::warning Contenido enriquecido
Typebot soporta imágenes, videos y botones en los flujos. El puente básico de arriba solo maneja texto. Extiende `extractMessages()` para manejar bloques de multimedia y enviarlos vía `uploadMedia()` + `sendRawMessage()`.
:::

<RelatedGuides slugs={["integrate-whaticket", "integrate-n8n", "connect-to-chatgpt", "build-a-bot"]} />
