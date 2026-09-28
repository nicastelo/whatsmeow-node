---
title: Bots y Resiliencia
sidebar_position: 8
description: "Construye un bot de WhatsApp con Node.js — eco de mensajes, manejo de comandos, reconexión automática y gestión del ciclo de vida de conexión completo."
keywords: [whatsapp bot nodejs, construir whatsapp bot typescript, whatsapp bot plantilla nodejs, whatsapp reconexion automatica nodejs]
---

# Bots y Resiliencia

:::tip Buscas un tutorial paso a paso?
Consulta [Cómo Construir un Bot de WhatsApp](/docs/guides/build-a-bot).
:::

Una plantilla completa de bot y manejo resiliente de conexión.

## Bot de Eco {#echo-bot}

Un bot completo que hace eco de mensajes, reenvía imágenes, maneja comandos y rechaza llamadas.

### Características

- Hace eco de mensajes de texto con una respuesta citada
- Descarga y reenvía imágenes recibidas
- Envía confirmaciones de lectura (palomitas azules)
- Muestra indicadores de escritura antes de responder
- Maneja tanto mensajes directos como de grupo
- Rechaza llamadas entrantes
- Comandos: `!ping`, `!info`, `!whoami`, `!groups`

### Patrón de manejo de mensajes

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return; // Skip own messages to avoid loops

  const text =
    (message.conversation as string | undefined) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  // Mark as read (blue ticks)
  await client.markRead([info.id], info.chat, info.sender);

  // Show typing indicator
  await client.sendChatPresence(info.chat, "composing");
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Handle commands
  if (text?.toLowerCase() === "!ping") {
    await client.sendMessage(info.chat, { conversation: "pong" });
    return;
  }

  // Echo text back with a quote
  await client.sendRawMessage(info.chat, {
    extendedTextMessage: {
      text: text,
      contextInfo: {
        stanzaID: info.id,
        participant: info.sender,
        quotedMessage: { conversation: text },
      },
    },
  });
});
```

### Eco de imágenes

```typescript
if (message.imageMessage) {
  const filePath = await client.downloadAny(message);
  const media = await client.uploadMedia(filePath, "image");
  await client.sendRawMessage(info.chat, {
    imageMessage: {
      URL: media.URL,
      directPath: media.directPath,
      mediaKey: media.mediaKey,
      fileEncSHA256: media.fileEncSHA256,
      fileSHA256: media.fileSHA256,
      fileLength: String(media.fileLength),
      mimetype: "image/png",
      caption: `Echo from ${info.pushName}!`,
    },
  });
}
```

### Rechazo automático de llamadas

```typescript
client.on("call:offer", async ({ from, callId }) => {
  await client.rejectCall(from, callId);
});
```

### Cierre controlado

```typescript
process.on("SIGINT", async () => {
  await client.sendPresence("unavailable");
  await client.disconnect();
  client.close();
  process.exit(0);
});
```

[Código fuente completo: `echo-bot.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/echo-bot.ts)

---

## Conexión Resiliente

Se mantiene conectado con reconexión automática, maneja desconexiones, revocaciones de sesión y todos los eventos del ciclo de vida de conexión.

```typescript
import { createClient, WhatsmeowError } from "@whatsmeow-node/whatsmeow-node";

// Auto-reconnect is built-in — whatsmeow handles this internally
client.on("disconnected", () => {
  console.log("Waiting for auto-reconnect...");
});

// Session was revoked — user unlinked the device
client.on("logged_out", ({ reason }) => {
  console.error(`Logged out: ${reason} — must re-pair`);
  client.close();
  process.exit(1);
});

// Connection health monitoring
client.on("stream_error", ({ code }) => {
  console.warn(`Stream error: code=${code}`);
});

client.on("keep_alive_timeout", ({ errorCount }) => {
  console.warn(`Keep-alive timeout: errors=${errorCount}`);
});

client.on("keep_alive_restored", () => {
  console.log("Keep-alive restored");
});

// Account temporarily banned by WhatsApp
client.on("temporary_ban", ({ code, expire }) => {
  console.error(`Temporary ban: ${code} (expires in ${expire})`);
});

// The Go subprocess failed to spawn or crashed
client.on("error", (err) => console.error("Process error:", err));
client.on("exit", ({ code }) => console.error(`Go process exited (code ${code})`));

// Failed commands reject with a typed WhatsmeowError
try {
  await client.sendMessage(jid, { conversation: "Hello" });
} catch (err) {
  if (err instanceof WhatsmeowError) {
    console.error(`[${err.code}] ${err.message}`); // e.g. ERR_SEND, ERR_TIMEOUT
  } else {
    throw err;
  }
}
```

:::info
No necesitas implementar lógica de reconexión manual. La librería subyacente whatsmeow maneja la reconexión automáticamente. El evento `disconnected` es solo informativo.
:::

:::warning
El evento `logged_out` significa que la sesión fue revocada permanentemente (el usuario desvinculó el dispositivo de WhatsApp). La única recuperación es eliminar `session.db` y volver a emparejar.
:::

[Código fuente completo: `reconnect.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/reconnect.ts)
