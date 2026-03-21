---
title: "Como Enviar Stickers no WhatsApp com Node.js"
sidebar_label: Enviar Stickers
sidebar_position: 3
description: "Envie e receba stickers de WhatsApp programaticamente com Node.js — faça upload de arquivos WebP, defina dimensões e baixe stickers recebidos."
keywords: [enviar stickers bot whatsapp, api sticker whatsapp nodejs, enviar sticker webp whatsapp, baixar stickers whatsapp nodejs]
---

import Head from '@docusaurus/Head';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/send-stickers.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/send-stickers.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Enviar Stickers no WhatsApp com Node.js",
      "description": "Envie e receba stickers de WhatsApp programaticamente com Node.js — faça upload de arquivos WebP, defina dimensões e baixe stickers recebidos.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/send-stickers.png",
      "step": [
        {"@type": "HowToStep", "name": "Fazer Upload do Arquivo de Sticker", "text": "Use uploadMedia() com o caminho do arquivo WebP e o tipo de mídia 'image'."},
        {"@type": "HowToStep", "name": "Enviar a Mensagem de Sticker", "text": "Use sendRawMessage com stickerMessage incluindo width, height (512x512) e mimetype image/webp."},
        {"@type": "HowToStep", "name": "Baixar Stickers Recebidos", "text": "Escute mensagens com stickerMessage e chame downloadAny() para salvar no disco."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Enviar Stickers no WhatsApp com Node.js",
      "description": "Envie e receba stickers de WhatsApp programaticamente com Node.js — faça upload de arquivos WebP, defina dimensões e baixe stickers recebidos.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/send-stickers.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Enviar Stickers no WhatsApp com Node.js](/img/guides/pt-BR/send-stickers.png)
![Como Enviar Stickers no WhatsApp com Node.js](/img/guides/pt-BR/send-stickers-light.png)

# Como Enviar Stickers no WhatsApp com Node.js

Stickers no WhatsApp são imagens WebP enviadas com o formato proto `stickerMessage`. whatsmeow-node cuida do upload e da criptografia — você só precisa fornecer o arquivo e as dimensões.

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))
- Uma imagem de sticker no formato WebP, idealmente 512x512 pixels

## Passo 1: Fazer Upload do Arquivo de Sticker

Stickers usam o mesmo fluxo de upload que imagens. O método `uploadMedia` criptografa e envia o arquivo para os servidores do WhatsApp:

```typescript
const media = await client.uploadMedia("/path/to/sticker.webp", "image");
```

O objeto retornado contém os metadados da mídia criptografada que você vai precisar para o envio.

## Passo 2: Enviar a Mensagem de Sticker

```typescript
await client.sendRawMessage(jid, {
  stickerMessage: {
    URL: media.URL,
    directPath: media.directPath,
    mediaKey: media.mediaKey,
    fileEncSHA256: media.fileEncSHA256,
    fileSHA256: media.fileSHA256,
    fileLength: String(media.fileLength),
    mimetype: "image/webp",
    width: 512,
    height: 512,
    // isAnimated: true,  // for animated stickers
  },
});
```

:::warning
`width` e `height` são obrigatórios. Sem eles, o WhatsApp pode exibir o sticker como um anexo de arquivo genérico em vez de renderizá-lo inline. O tamanho padrão de sticker é 512x512.
:::

## Passo 3: Baixar Stickers Recebidos

Escute as mensagens e use `downloadAny()` para salvar stickers recebidos no disco:

```typescript
client.on("message", async ({ info, message }) => {
  const sticker = message.stickerMessage;
  if (!sticker) return;

  // downloadAny() detects the media type automatically
  // and saves to a temp file
  const filePath = await client.downloadAny(message);
  console.log(`Sticker from ${info.pushName} saved to: ${filePath}`);
});
```

:::info
`downloadAny()` salva em um arquivo temporário. Se você precisar manter o sticker permanentemente, copie-o para um local estável com `fs.copyFile()`. Veja [Como Baixar Mídias](download-media) para detalhes.
:::

## Exemplo Completo

Um bot que ecoa stickers de volta e salva os recebidos:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const client = createClient({ store: "session.db" });
const SAVE_DIR = "./stickers";

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const sticker = message.stickerMessage;
  if (!sticker) return;

  console.log(`Sticker from ${info.pushName}`);

  // Download the incoming sticker
  const tempPath = await client.downloadAny(message);

  // Save permanently
  await mkdir(SAVE_DIR, { recursive: true });
  const dest = path.join(SAVE_DIR, `${info.id}.webp`);
  await copyFile(tempPath, dest);
  console.log(`Saved to ${dest}`);

  // Echo it back
  const media = await client.uploadMedia(tempPath, "image");
  await client.sendRawMessage(info.chat, {
    stickerMessage: {
      URL: media.URL,
      directPath: media.directPath,
      mediaKey: media.mediaKey,
      fileEncSHA256: media.fileEncSHA256,
      fileSHA256: media.fileSHA256,
      fileLength: String(media.fileLength),
      mimetype: "image/webp",
      width: 512,
      height: 512,
    },
  });
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! See: How to Pair WhatsApp");
    process.exit(1);
  }
  await client.connect();
  console.log("Listening for stickers...");
}

main().catch(console.error);
```

## Erros Comuns

:::warning Casing dos campos proto
Os campos da resposta de upload usam o casing exato do protobuf: `URL`, `fileSHA256`, `fileEncSHA256` — **não** `url`, `fileSha256`. Usar o casing errado vai falhar silenciosamente e o sticker não será entregue.
:::

:::warning Mimetype errado
Sempre use `"image/webp"` para stickers. Enviar um PNG ou JPEG como sticker vai falhar ou ser exibido como uma imagem comum.
:::

:::warning Tipo de upload
Use `"image"` como tipo de mídia ao chamar `uploadMedia()`, mesmo sendo um sticker. A criptografia é tratada da mesma forma.
:::

## Próximos Passos

- [Como Baixar Mídias](download-media) — baixe qualquer tipo de mídia
- [Como Criar um Bot](build-a-bot) — adicione suporte a stickers em um bot completo
- [Exemplos de Mídia](/docs/examples/media) — envie imagens, vídeos, áudios e documentos
