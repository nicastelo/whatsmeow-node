---
title: "Cómo Crear un Bot de WhatsApp con Node.js"
sidebar_label: Crear un Bot
sidebar_position: 2
description: "Crea un bot de WhatsApp con Node.js y TypeScript — recibe mensajes, maneja comandos, responde con citas y gestiona conexiones."
keywords: [bot whatsapp nodejs, crear bot whatsapp typescript, tutorial bot whatsapp, automatización whatsapp nodejs]
---

import Head from '@docusaurus/Head';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/build-a-bot.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/build-a-bot.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Crear un Bot de WhatsApp con Node.js",
      "description": "Crea un bot de WhatsApp con Node.js y TypeScript — recibe mensajes, maneja comandos, responde con citas y gestiona conexiones.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/build-a-bot.png",
      "step": [
        {"@type": "HowToStep", "name": "Crear el cliente", "text": "Inicializa un WhatsmeowClient con createClient() y un almacén de sesión."},
        {"@type": "HowToStep", "name": "Manejar mensajes entrantes", "text": "Escucha el evento message y extrae el texto de conversation o extendedTextMessage."},
        {"@type": "HowToStep", "name": "Responder mensajes", "text": "Usa sendMessage para texto o sendRawMessage con contextInfo para respuestas citadas."},
        {"@type": "HowToStep", "name": "Agregar comandos", "text": "Enruta los mensajes que comienzan con ! a manejadores de comandos como !ping y !help."},
        {"@type": "HowToStep", "name": "Manejar errores y reconexión", "text": "Escucha los eventos logged_out y disconnected. La reconexión automática está incluida."},
        {"@type": "HowToStep", "name": "Cierre elegante", "text": "Maneja SIGINT para establecer la presencia como no disponible y desconectar limpiamente."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Crear un Bot de WhatsApp con Node.js",
      "description": "Crea un bot de WhatsApp con Node.js y TypeScript — recibe mensajes, maneja comandos, responde con citas y gestiona conexiones.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/build-a-bot.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Crear un Bot de WhatsApp con Node.js](/img/guides/es/build-a-bot.png)
![Cómo Crear un Bot de WhatsApp con Node.js](/img/guides/es/build-a-bot-light.png)

# Cómo Crear un Bot de WhatsApp con Node.js

whatsmeow-node te permite construir un bot de WhatsApp completamente funcional en menos de 60 líneas de TypeScript. El bot se conecta como un dispositivo vinculado (como WhatsApp Web), recibe mensajes en tiempo real y puede responder con texto, multimedia o mensajes estructurados.

## Requisitos Previos

- Node.js 18+ y npm
- Una cuenta de WhatsApp para vincular como dispositivo
- whatsmeow-node instalado ([Guía de instalación](/docs/installation))
- Una sesión vinculada — primero sigue [Cómo Vincular WhatsApp](pair-whatsapp), o el bot se vinculará en la primera ejecución

## Paso 1: Crear el Cliente

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("error", (err) => {
  console.error("Error:", err);
});
```

La opción `store` le indica a whatsmeow-node dónde persistir la sesión. Pasa una ruta de archivo para SQLite (ideal para desarrollo) o una cadena de conexión de PostgreSQL para producción.

## Paso 2: Manejar Mensajes Entrantes

```typescript
client.on("message", async ({ info, message }) => {
  // Skip your own messages to avoid echo loops
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  if (!text) return;

  console.log(`${info.pushName}: ${text}`);
});
```

Cada mensaje entrante dispara el evento `"message"` con dos objetos:
- `info` — metadatos (JID del remitente, JID del chat, timestamp, si es un grupo, etc.)
- `message` — el contenido del mensaje en protobuf

:::warning
Siempre verifica `info.isFromMe` y omite tus propios mensajes. Sin esta verificación, tu bot responderá a sus propios mensajes en un bucle infinito.
:::

## Paso 3: Responder Mensajes

```typescript
// Simple text reply
await client.sendMessage(info.chat, { conversation: "Hello!" });

// Reply with a quote (shows the original message)
await client.sendRawMessage(info.chat, {
  extendedTextMessage: {
    text: "I got your message!",
    contextInfo: {
      stanzaId: info.id,
      participant: info.sender,
      quotedMessage: { conversation: text },
    },
  },
});
```

`sendMessage` es la forma más simple de enviar texto. Para respuestas que citan el mensaje original, usa `sendRawMessage` con `contextInfo`.

## Paso 4: Agregar Comandos

Un patrón común es enrutar los mensajes que comienzan con `!` a manejadores de comandos:

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  // Mark as read
  await client.markRead([info.id], info.chat, info.sender);

  // Show typing indicator
  await client.sendChatPresence(info.chat, "composing");

  const command = text.toLowerCase().trim();

  if (command === "!ping") {
    await client.sendMessage(info.chat, { conversation: "pong" });
    return;
  }

  if (command === "!help") {
    await client.sendMessage(info.chat, {
      conversation: "Commands: !ping, !help, !whoami",
    });
    return;
  }

  if (command === "!whoami") {
    await client.sendMessage(info.chat, {
      conversation: `You are ${info.pushName}\nJID: ${info.sender}`,
    });
    return;
  }

  // Echo everything else
  await client.sendMessage(info.chat, { conversation: text });
});
```

## Paso 5: Manejar Errores y Reconexión

```typescript
// Session was permanently revoked — must re-pair
client.on("logged_out", ({ reason }) => {
  console.error(`Logged out: ${reason}`);
  client.close();
  process.exit(1);
});

// Informational — whatsmeow handles reconnection automatically
client.on("disconnected", () => {
  console.log("Disconnected, waiting for auto-reconnect...");
});
```

:::info
No necesitas lógica de reconexión manual. La biblioteca subyacente whatsmeow se reconecta automáticamente. El evento `disconnected` es solo informativo.
:::

## Paso 6: Cierre Elegante

```typescript
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await client.sendPresence("unavailable");
  await client.disconnect();
  client.close();
  process.exit(0);
});
```

Establecer la presencia como `"unavailable"` antes de desconectarte permite que tus contactos te vean desconectado inmediatamente en lugar de esperar el timeout.

## Ejemplo Completo

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import qrcode from "qrcode-terminal";

const client = createClient({ store: "session.db" });

client.on("error", (err) => console.error("Error:", err));
client.on("logged_out", ({ reason }) => {
  console.error(`Logged out: ${reason}`);
  client.close();
  process.exit(1);
});

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  await client.markRead([info.id], info.chat, info.sender);
  await client.sendChatPresence(info.chat, "composing");

  const command = text.toLowerCase().trim();

  if (command === "!ping") {
    await client.sendMessage(info.chat, { conversation: "pong" });
  } else if (command === "!help") {
    await client.sendMessage(info.chat, {
      conversation: "Commands: !ping, !help, !whoami",
    });
  } else if (command === "!whoami") {
    await client.sendMessage(info.chat, {
      conversation: `You are ${info.pushName}\nJID: ${info.sender}`,
    });
  } else {
    // Echo
    await client.sendRawMessage(info.chat, {
      extendedTextMessage: {
        text: text,
        contextInfo: {
          stanzaId: info.id,
          participant: info.sender,
          quotedMessage: { conversation: text },
        },
      },
    });
  }
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.log("Not paired — scan the QR code:");
    client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
    await client.getQRChannel();
  }

  await client.connect();
  await client.sendPresence("available");
  console.log("Bot is online! Commands: !ping, !help, !whoami");

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
Siempre verifica `info.isFromMe` antes de procesar un mensaje. Sin esto, el bot responde a sus propias respuestas indefinidamente.
:::

:::warning Mensajes de grupo
En grupos, `info.chat` es el JID del grupo e `info.sender` es la persona que envió el mensaje. Responde a `info.chat` para enviar al grupo, no a `info.sender`.
:::

:::warning Límites de tasa
WhatsApp limita la tasa de envío de mensajes. Si tu bot envía demasiados mensajes demasiado rápido, podrías ser bloqueado temporalmente. Consulta [Límites de Tasa](/docs/rate-limiting) para más detalles.
:::

## Siguientes Pasos

- [Cómo Conectar WhatsApp con Claude AI](connect-to-ai) — agrega respuestas potenciadas por IA
- [Cómo Mostrar Indicadores de Escritura](typing-indicators) — haz que tu bot se sienta más humano
- [Cómo Enviar Stickers](send-stickers) — envía y recibe stickers
- [Ejemplo de Echo Bot](/docs/examples/bots-and-resilience#echo-bot) — bot de referencia completo
- [Referencia de la API](/docs/api/overview) — todos los métodos disponibles
