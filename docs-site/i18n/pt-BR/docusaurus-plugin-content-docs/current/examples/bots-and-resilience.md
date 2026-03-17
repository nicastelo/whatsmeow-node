---
title: Bots e Resiliencia
sidebar_position: 8
description: "Construa um bot de WhatsApp com Node.js — responda mensagens, trate comandos, reconecte automaticamente e gerencie o ciclo de vida completo da conexao."
keywords: [whatsapp bot nodejs, construir bot whatsapp typescript, whatsapp bot template nodejs, whatsapp reconexao automatica nodejs]
---

# Bots e Resiliencia

:::tip Procurando um tutorial passo a passo?
Veja [Como Construir um Bot de WhatsApp](/docs/guides/build-a-bot).
:::

Um template completo de bot e tratamento resiliente de conexao.

## Echo Bot

Um bot completo que ecoa mensagens, reenvia imagens, trata comandos e rejeita chamadas.

### Funcionalidades

- Ecoa mensagens de texto de volta com uma resposta citada
- Baixa e reenvia imagens recebidas
- Envia confirmacoes de leitura (ticks azuis)
- Mostra indicadores de digitacao antes de responder
- Funciona tanto em mensagens diretas quanto em grupos
- Rejeita chamadas recebidas
- Comandos: `!ping`, `!info`, `!whoami`, `!groups`

### Padrao de tratamento de mensagens

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return; // Skip own messages to avoid loops

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
        stanzaId: info.id,
        participant: info.sender,
        quotedMessage: { conversation: text },
      },
    },
  });
});
```

### Ecoar imagens de volta

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

### Rejeitar chamadas automaticamente

```typescript
client.on("call:offer", async ({ from, callId }) => {
  await client.rejectCall(from, callId);
});
```

### Encerramento gracioso

```typescript
process.on("SIGINT", async () => {
  await client.sendPresence("unavailable");
  await client.disconnect();
  client.close();
  process.exit(0);
});
```

[Codigo fonte completo: `echo-bot.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/echo-bot.ts)

---

## Conexao Resiliente

Mantem a conexao ativa com reconexao automatica, trata desconexoes, revogacoes de sessao e todos os eventos do ciclo de vida da conexao.

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

// Typed error handling
client.on("error", (err) => {
  if (err instanceof WhatsmeowError) {
    console.error(`[${err.code}] ${err.message}`);
  } else {
    console.error(err);
  }
});
```

:::info
Voce nao precisa implementar logica de reconexao manual. A biblioteca whatsmeow subjacente trata a reconexao automaticamente. O evento `disconnected` e apenas informativo.
:::

:::warning
O evento `logged_out` significa que a sessao foi permanentemente revogada (o usuario desvinculou o dispositivo do WhatsApp). A unica forma de recuperacao e excluir o `session.db` e parear novamente.
:::

[Codigo fonte completo: `reconnect.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/reconnect.ts)
