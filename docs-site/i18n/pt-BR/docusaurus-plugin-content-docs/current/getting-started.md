---
title: Primeiros Passos
sidebar_position: 3
description: "Guia de inicio rapido do whatsmeow-node — conecte ao WhatsApp, envie mensagens, manipule midia e gerencie eventos em TypeScript."
---

# Primeiros Passos

## Inicio Rapido

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("qr", ({ code }) => console.log("Scan this QR:", code));
client.on("connected", ({ jid }) => console.log("Connected as", jid));
client.on("message", ({ info, message }) => {
  console.log(`${info.pushName}: ${message.conversation ?? JSON.stringify(message)}`);
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    await client.getQRChannel();
  }
  await client.connect();
}
main();
```

## Opcoes do Client

| Opcao            | Tipo     | Padrao    | Descricao                                |
|------------------|----------|-----------|------------------------------------------|
| `store`          | `string` | obrigatorio | Caminho SQLite (`session.db`) ou URL Postgres (`postgresql://host/db`) |
| `binaryPath`     | `string` | auto      | Caminho para o binario Go (resolvido automaticamente a partir do pacote da plataforma) |
| `commandTimeout` | `number` | `30000`   | Timeout de comando IPC em milissegundos  |

## Enviando Mensagens

**Mensagem de texto:**

```typescript
await client.sendMessage("5512345678@s.whatsapp.net", {
  conversation: "Hello!",
});
```

**Responder a uma mensagem:**

```typescript
await client.sendMessage(jid, {
  extendedTextMessage: {
    text: "This is a reply",
    contextInfo: {
      stanzaId: originalMessageId,
      participant: originalSenderJid,
      quotedMessage: { conversation: "the original text" },
    },
  },
});
```

**Imagem, localizacao, cartao de contato** — use `sendRawMessage` para qualquer formato proto:

```typescript
// Upload then send an image
const media = await client.uploadMedia("/path/to/photo.jpg", "image");
await client.sendRawMessage(jid, {
  imageMessage: {
    URL: media.URL,
    directPath: media.directPath,
    mediaKey: media.mediaKey,
    fileEncSHA256: media.fileEncSHA256,
    fileSHA256: media.fileSHA256,
    fileLength: String(media.fileLength),
    mimetype: "image/jpeg",
    caption: "Check this out",
  },
});

// Send a location
await client.sendRawMessage(jid, {
  locationMessage: {
    degreesLatitude: -34.9011,
    degreesLongitude: -56.1645,
    name: "Montevideo",
  },
});

// Send a contact card
await client.sendRawMessage(jid, {
  contactMessage: {
    displayName: "John Doe",
    vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+1234567890\nEND:VCARD",
  },
});
```

`sendRawMessage` aceita qualquer `Record<string, unknown>` que corresponda ao [schema proto `waE2E.Message` do whatsmeow](https://pkg.go.dev/go.mau.fi/whatsmeow/proto/waE2E#Message).

## Baixando Midia

Quando voce recebe uma mensagem com midia, baixe para um arquivo temporario:

```typescript
client.on("message", async ({ info, message }) => {
  // downloadAny auto-detects the media type
  if (message.imageMessage || message.videoMessage || message.audioMessage || message.documentMessage) {
    const filePath = await client.downloadAny(message);
    console.log("Media saved to:", filePath);
  }
});
```

Para mais controle, use `downloadMediaWithPath` com chaves explicitas:

```typescript
const filePath = await client.downloadMediaWithPath({
  directPath: msg.imageMessage.directPath,
  mediaKey: msg.imageMessage.mediaKey,
  fileHash: msg.imageMessage.fileSHA256,
  encFileHash: msg.imageMessage.fileEncSHA256,
  fileLength: msg.imageMessage.fileLength,
  mediaType: "image",
});
```

:::info Nomenclatura dos campos
Ao **receber** mensagens, os nomes dos campos seguem o casing do proto (`fileSHA256`, `fileEncSHA256`).
Ao passar argumentos **para metodos de download**, use os nomes de parametro do proprio metodo (`fileHash`, `encFileHash`).
Veja [Solucao de Problemas](/docs/troubleshooting/common-issues#proto-field-naming) para detalhes.
:::

## Encerrar de Forma Limpa

```typescript
await client.disconnect();
client.close();
```
