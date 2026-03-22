---
title: "Como Baixar Mídias do WhatsApp com Node.js"
sidebar_label: Baixar Mídias
sidebar_position: 4
description: "Baixe e salve imagens, vídeos, áudios, documentos e stickers do WhatsApp no disco com Node.js usando whatsmeow-node."
keywords: [baixar midia whatsapp nodejs, salvar imagens whatsapp api, baixar videos whatsapp programaticamente, download midia whatsapp typescript]
---

import Head from '@docusaurus/Head';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/download-media.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/download-media.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Baixar Mídias do WhatsApp com Node.js",
      "description": "Baixe e salve imagens, vídeos, áudios, documentos e stickers do WhatsApp no disco com Node.js usando whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/download-media.png",
      "step": [
        {"@type": "HowToStep", "name": "Escutar Mensagens Recebidas", "text": "Inscreva-se no evento message e filtre por mensagens de mídia."},
        {"@type": "HowToStep", "name": "Detectar o Tipo de Mídia", "text": "Verifique os campos imageMessage, videoMessage, audioMessage, documentMessage ou stickerMessage."},
        {"@type": "HowToStep", "name": "Baixar com downloadAny()", "text": "Chame downloadAny(message) para descriptografar e salvar a mídia em um arquivo temporário."},
        {"@type": "HowToStep", "name": "Salvar em um Local Permanente", "text": "Copie o arquivo temporário para um diretório permanente usando fs.copyFile()."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Baixar Mídias do WhatsApp com Node.js",
      "description": "Baixe e salve imagens, vídeos, áudios, documentos e stickers do WhatsApp no disco com Node.js usando whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/download-media.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Baixar Mídias do WhatsApp com Node.js](/img/guides/pt-BR/download-media.png)
![Como Baixar Mídias do WhatsApp com Node.js](/img/guides/pt-BR/download-media-light.png)

# Como Baixar Mídias do WhatsApp com Node.js

whatsmeow-node pode baixar qualquer tipo de mídia — imagens, vídeos, áudios, documentos e stickers — com uma única chamada a `downloadAny()`. O arquivo é descriptografado e salvo em um caminho temporário no disco.

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))

## Passo 1: Escutar Mensagens Recebidas

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;
  // Process the message...
});
```

## Passo 2: Detectar o Tipo de Mídia

Verifique qual campo de mídia está presente na mensagem:

```typescript
function getMediaType(message: Record<string, unknown>): string | null {
  if (message.imageMessage) return "image";
  if (message.videoMessage) return "video";
  if (message.audioMessage) return "audio";
  if (message.documentMessage) return "document";
  if (message.stickerMessage) return "sticker";
  return null;
}
```

## Passo 3: Baixar com `downloadAny()`

```typescript
const mediaType = getMediaType(message);
if (!mediaType) return;

const filePath = await client.downloadAny(message);
console.log(`Downloaded ${mediaType} to: ${filePath}`);
```

`downloadAny()` detecta automaticamente o tipo de mídia a partir da mensagem e baixa o arquivo. A descriptografia é tratada internamente e o método retorna o caminho para um arquivo temporário.

## Passo 4: Salvar em um Local Permanente

O arquivo temporário pode ser limpo pelo sistema operacional. Copie-o para algum lugar permanente:

```typescript
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const MEDIA_DIR = "./downloads";

async function saveMedia(
  tempPath: string,
  mediaType: string,
  messageId: string,
): Promise<string> {
  const dir = path.join(MEDIA_DIR, mediaType);
  await mkdir(dir, { recursive: true });

  // Get the file extension from the temp path
  const ext = path.extname(tempPath) || getDefaultExtension(mediaType);
  const dest = path.join(dir, `${messageId}${ext}`);

  await copyFile(tempPath, dest);
  return dest;
}

function getDefaultExtension(mediaType: string): string {
  switch (mediaType) {
    case "image": return ".jpg";
    case "video": return ".mp4";
    case "audio": return ".ogg";
    case "sticker": return ".webp";
    default: return ".bin";
  }
}
```

## Exemplo Completo

Um bot que salva mídias organizando os downloads por tipo:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const client = createClient({ store: "session.db" });
const MEDIA_DIR = "./downloads";

function getMediaType(message: Record<string, unknown>): string | null {
  if (message.imageMessage) return "image";
  if (message.videoMessage) return "video";
  if (message.audioMessage) return "audio";
  if (message.documentMessage) return "document";
  if (message.stickerMessage) return "sticker";
  return null;
}

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const mediaType = getMediaType(message);
  if (!mediaType) return;

  console.log(`${mediaType} from ${info.pushName}`);

  const tempPath = await client.downloadAny(message);

  // Save permanently, organized by type
  const dir = path.join(MEDIA_DIR, mediaType);
  await mkdir(dir, { recursive: true });
  const ext = path.extname(tempPath) || ".bin";
  const dest = path.join(dir, `${info.id}${ext}`);
  await copyFile(tempPath, dest);

  console.log(`Saved to ${dest}`);

  // Acknowledge receipt
  await client.markRead([info.id], info.chat, info.sender);
  await client.sendMessage(info.chat, {
    conversation: `Saved your ${mediaType}!`,
  });
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! See: How to Pair WhatsApp");
    process.exit(1);
  }
  await client.connect();
  console.log("Listening for media...");

  process.on("SIGINT", async () => {
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Erros Comuns

:::warning Arquivos temporários não são permanentes
`downloadAny()` salva em um diretório temporário. O sistema operacional pode deletar esses arquivos a qualquer momento. Sempre copie a mídia para um local permanente se precisar mantê-la.
:::

:::warning Diferenças na nomenclatura dos campos
Ao **receber** mensagens, os campos usam casing proto: `fileSHA256`, `fileEncSHA256`. Ao passar argumentos **para** `downloadMediaWithPath()`, use os nomes de parâmetro do método: `fileHash`, `encFileHash`. Veja [Solução de Problemas](/docs/troubleshooting/common-issues#proto-field-naming).
:::

:::warning Links de mídia expiram
As URLs de mídia do WhatsApp expiram após algum tempo. Baixe a mídia imediatamente quando recebê-la — não será possível baixar depois que o link expirar.
:::

## Próximos Passos

- [Como Enviar Stickers](send-stickers) — faça upload e envie stickers
- [Como Criar um Bot](build-a-bot) — adicione tratamento de mídias a um bot completo
- [Exemplos de Mídia](/docs/examples/media) — faça upload e envie imagens, vídeos, áudios e documentos
