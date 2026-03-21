---
title: "Cómo Mostrar Indicadores de Escritura en WhatsApp"
sidebar_label: Indicadores de Escritura
sidebar_position: 5
description: "Muestra indicadores de escritura y grabación en WhatsApp con Node.js — controla el estado de composición, presencia en línea y suscríbete a la escritura de otros."
keywords: [indicador escritura bot whatsapp, mostrar escribiendo whatsapp api, estado composición whatsapp nodejs, api presencia whatsapp typescript]
---

import Head from '@docusaurus/Head';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/typing-indicators.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/typing-indicators.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Mostrar Indicadores de Escritura en WhatsApp",
      "description": "Muestra indicadores de escritura y grabación en WhatsApp con Node.js — controla el estado de composición, presencia en línea y suscríbete a la escritura de otros.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/typing-indicators.png",
      "step": [
        {"@type": "HowToStep", "name": "Show typing...", "text": "Call sendChatPresence(chatJid, 'composing') to show the typing indicator."},
        {"@type": "HowToStep", "name": "Show recording audio...", "text": "Call sendChatPresence(chatJid, 'composing', 'audio') for the recording indicator."},
        {"@type": "HowToStep", "name": "Clear the Indicator", "text": "Call sendChatPresence(chatJid, 'paused') to stop the indicator without sending a message."},
        {"@type": "HowToStep", "name": "Set Online/Offline Status", "text": "Call sendPresence('available') before typing indicators work, and 'unavailable' when shutting down."},
        {"@type": "HowToStep", "name": "Subscribe to Others' Typing", "text": "Call subscribePresence(jid) and listen for presence and chat_presence events."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Mostrar Indicadores de Escritura en WhatsApp",
      "description": "Muestra indicadores de escritura y grabación en WhatsApp con Node.js — controla el estado de composición, presencia en línea y suscríbete a la escritura de otros.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/typing-indicators.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Mostrar Indicadores de Escritura en WhatsApp](/img/guides/es/typing-indicators.png)
![Cómo Mostrar Indicadores de Escritura en WhatsApp](/img/guides/es/typing-indicators-light.png)

# Cómo Mostrar Indicadores de Escritura en WhatsApp

Los indicadores de escritura de WhatsApp ("escribiendo..." y "grabando audio...") hacen que los bots se sientan más naturales. whatsmeow-node te da control total sobre estos indicadores con `sendChatPresence()`.

## Requisitos Previos

- Una sesión de whatsmeow-node vinculada ([Cómo Vincular](pair-whatsapp))

## Paso 1: Mostrar "escribiendo..."

```typescript
await client.sendChatPresence(chatJid, "composing");
```

Esto muestra el indicador "escribiendo..." en el chat especificado. El indicador se borra automáticamente cuando envías un mensaje.

## Paso 2: Mostrar "grabando audio..."

```typescript
await client.sendChatPresence(chatJid, "composing", "audio");
```

El tercer parámetro `"audio"` cambia el indicador de "escribiendo..." a "grabando audio...".

## Paso 3: Borrar el Indicador

```typescript
await client.sendChatPresence(chatJid, "paused");
```

Usa `"paused"` para borrar explícitamente el indicador sin enviar un mensaje. Esto es útil cuando el bot decide no responder después de todo.

:::info
El indicador se borra automáticamente cuando envías un mensaje. Solo necesitas `"paused"` para detener el indicador sin enviar nada.
:::

## Paso 4: Simular Escritura Realista

Los indicadores instantáneos se ven robóticos. Agrega un retraso proporcional a la longitud del mensaje:

```typescript
async function typeAndSend(
  chatJid: string,
  text: string,
): Promise<void> {
  await client.sendChatPresence(chatJid, "composing");

  // ~50ms per character, clamped between 500ms and 3s
  const delay = Math.min(3000, Math.max(500, text.length * 50));
  await new Promise((resolve) => setTimeout(resolve, delay));

  await client.sendMessage(chatJid, { conversation: text });
}
```

## Paso 5: Establecer Estado En Línea/Desconectado

Antes de que los indicadores de escritura funcionen, tu bot debe estar en línea:

```typescript
// Set online — required for typing indicators to show
await client.sendPresence("available");

// Set offline when shutting down
await client.sendPresence("unavailable");
```

## Paso 6: Suscribirse a la Escritura de Otros

También puedes observar cuando otros usuarios están escribiendo:

```typescript
// Subscribe to a user's online/offline presence
await client.subscribePresence(userJid);

// Online/offline changes
client.on("presence", ({ jid, presence, lastSeen }) => {
  console.log(`${jid}: ${presence}`);
});

// Typing/recording changes
client.on("chat_presence", ({ chat, sender, state, media }) => {
  const action =
    state === "composing"
      ? media === "audio" ? "recording audio" : "typing"
      : "stopped typing";
  console.log(`${sender} is ${action} in ${chat}`);
});
```

## Ejemplo Completo

Un bot que muestra el indicador de escritura antes de cada respuesta:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  // Mark as read
  await client.markRead([info.id], info.chat, info.sender);

  // Show typing
  await client.sendChatPresence(info.chat, "composing");

  // Simulate typing delay based on reply length
  const reply = `You said: ${text}`;
  const delay = Math.min(3000, Math.max(500, reply.length * 50));
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Send — indicator clears automatically
  await client.sendMessage(info.chat, { conversation: reply });
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! See: How to Pair WhatsApp");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  console.log("Bot is online with typing indicators!");

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

:::warning Establece la presencia en línea primero
Los indicadores de escritura podrían no aparecer si no has llamado a `sendPresence("available")` primero. Siempre establece tu estado en línea después de conectarte.
:::

:::warning Los indicadores instantáneos se ven robóticos
Mostrar "escribiendo..." y luego responder al instante (en menos de 100ms) se ve poco natural. Agrega un pequeño retraso proporcional a la longitud de la respuesta para simular escritura real.
:::

## Siguientes Pasos

- [Cómo Crear un Bot](build-a-bot) — agrega indicadores de escritura a un bot completo
- [Cómo Conectar con Claude AI](connect-to-ai) — indicadores de escritura mientras se espera la respuesta de la IA
- [Ejemplos de Presencia y Estado](/docs/examples/presence-and-status) — configuración de privacidad, mensajes temporales y más
