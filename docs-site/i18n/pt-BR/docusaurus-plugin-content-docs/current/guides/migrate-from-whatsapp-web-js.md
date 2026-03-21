---
title: "Como Substituir o whatsapp-web.js pelo whatsmeow-node"
sidebar_label: Migrar do whatsapp-web.js
sidebar_position: 11
description: "Migre do whatsapp-web.js para o whatsmeow-node — elimine o Puppeteer, reduza a memória de 500 MB para 20 MB e tenha uma API async tipada."
keywords: [alternativa ao whatsapp-web.js, substituir whatsapp-web.js, whatsapp-web.js para whatsmeow, migração whatsapp-web.js, bot whatsapp sem puppeteer, bot whatsapp sem navegador]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/migrate-from-whatsapp-web-js.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/migrate-from-whatsapp-web-js.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Substituir o whatsapp-web.js pelo whatsmeow-node",
      "description": "Migre do whatsapp-web.js para o whatsmeow-node — elimine o Puppeteer, reduza a memória de 500 MB para 20 MB e tenha uma API async tipada.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/migrate-from-whatsapp-web-js.png",
      "step": [
        {"@type": "HowToStep", "name": "Instalar o whatsmeow-node", "text": "Substitua whatsapp-web.js e puppeteer por @whatsmeow-node/whatsmeow-node."},
        {"@type": "HowToStep", "name": "Atualizar a Inicialização do Client", "text": "Substitua new Client() por createClient(). Nenhuma configuração de LocalAuth ou Puppeteer é necessária."},
        {"@type": "HowToStep", "name": "Atualizar os Listeners de Eventos", "text": "Substitua os formatos de callback do client.on('message') e atualize os padrões de acesso às propriedades da mensagem."},
        {"@type": "HowToStep", "name": "Atualizar o Envio de Mensagens", "text": "Substitua client.sendMessage() pelos métodos sendMessage ou sendRawMessage do whatsmeow-node."},
        {"@type": "HowToStep", "name": "Remover Dependências de Navegador", "text": "Remova Puppeteer, Chromium e qualquer configuração relacionada a navegador do seu projeto."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Substituir o whatsapp-web.js pelo whatsmeow-node",
      "description": "Migre do whatsapp-web.js para o whatsmeow-node — elimine o Puppeteer, reduza a memória de 500 MB para 20 MB e tenha uma API async tipada.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/migrate-from-whatsapp-web-js.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/migrate-from-whatsapp-web-js.png"}}
    })}
  </script>
</Head>

![Como Substituir o whatsapp-web.js pelo whatsmeow-node](/img/guides/pt-BR/migrate-from-whatsapp-web-js.png)
![Como Substituir o whatsapp-web.js pelo whatsmeow-node](/img/guides/pt-BR/migrate-from-whatsapp-web-js-light.png)

# Como Substituir o whatsapp-web.js pelo whatsmeow-node

O [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) roda um navegador Chrome headless para automatizar o WhatsApp Web. Funciona, mas é pesado — 200-500 MB de RAM só para o navegador, startup lento, e quebra quando o WhatsApp atualiza o client web. O whatsmeow-node usa o protocolo nativo multi-dispositivo diretamente, sem precisar de navegador.

## Por Que Migrar?

| | whatsapp-web.js | whatsmeow-node |
|---|---|---|
| **Memória** | 200-500 MB (Chromium) | ~10-20 MB |
| **Startup** | 5-15 segundos (iniciar navegador) | Menos de 1 segundo |
| **Dependências** | Puppeteer + Chromium | Binário Go único (incluído) |
| **Protocolo** | Automação do client web | Multi-dispositivo nativo |
| **Estabilidade** | Quebra com atualizações do WhatsApp Web | Upstream estável (whatsmeow) |
| **Imagem Docker** | ~1 GB+ (precisa do Chrome) | ~50 MB |
| **TypeScript** | Tipos da comunidade | TypeScript nativo |

## Passo 1: Instalar

```bash
# Remove whatsapp-web.js and Puppeteer
npm uninstall whatsapp-web.js puppeteer

# Install whatsmeow-node
npm install @whatsmeow-node/whatsmeow-node
```

Você também pode remover qualquer dependência relacionada ao Chromium ou camadas Docker.

## Passo 2: Atualizar a Inicialização do Client

### whatsapp-web.js

```javascript
const { Client, LocalAuth } = require("whatsapp-web.js");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox"],
  },
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.initialize();
```

### whatsmeow-node

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import qrcode from "qrcode-terminal";

const client = createClient({ store: "session.db" });

async function main() {
  const { jid } = await client.init();

  if (jid) {
    await client.connect();
    console.log("Client is ready!");
  } else {
    client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
    await client.getQRChannel();
    await client.connect();
  }
}

main().catch(console.error);
```

Sem config de Puppeteer, sem auth strategy, sem `initialize()` — apenas `init()` + `connect()`.

## Passo 3: Atualizar os Listeners de Eventos

### Mensagens

**whatsapp-web.js:**
```javascript
client.on("message", async (msg) => {
  if (msg.fromMe) return;
  console.log(`${msg.from}: ${msg.body}`);

  if (msg.body === "!ping") {
    await msg.reply("pong");
  }
});
```

**whatsmeow-node:**
```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  console.log(`${info.chat}: ${text}`);

  if (text === "!ping") {
    await client.sendMessage(info.chat, { conversation: "pong" });
  }
});
```

Diferenças principais:
- Sem atalho `msg.body` — o texto é extraído da mensagem protobuf
- Sem `msg.reply()` — use `sendMessage()` ou `sendRawMessage()` com `contextInfo` para citações
- `msg.from` vira `info.chat`, `msg.fromMe` vira `info.isFromMe`

### Eventos de conexão

**whatsapp-web.js:**
```javascript
client.on("ready", () => console.log("Ready"));
client.on("disconnected", (reason) => console.log("Disconnected:", reason));
```

**whatsmeow-node:**
```typescript
client.on("connected", ({ jid }) => console.log(`Connected as ${jid}`));
client.on("disconnected", () => console.log("Disconnected"));
client.on("logged_out", ({ reason }) => console.error(`Logged out: ${reason}`));
```

## Passo 4: Atualizar o Envio de Mensagens

### Texto

**whatsapp-web.js:**
```javascript
await client.sendMessage(chatId, "Hello!");
```

**whatsmeow-node:**
```typescript
await client.sendMessage(jid, { conversation: "Hello!" });
```

### Resposta com citação

**whatsapp-web.js:**
```javascript
await msg.reply("Got it!");
```

**whatsmeow-node:**
```typescript
await client.sendRawMessage(info.chat, {
  extendedTextMessage: {
    text: "Got it!",
    contextInfo: {
      stanzaId: info.id,
      participant: info.sender,
      quotedMessage: { conversation: originalText },
    },
  },
});
```

### Mídia

**whatsapp-web.js:**
```javascript
const media = MessageMedia.fromFilePath("/path/to/photo.jpg");
await client.sendMessage(chatId, media, { caption: "Check this out" });
```

**whatsmeow-node:**
```typescript
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
```

### Reações

**whatsapp-web.js:**
```javascript
await msg.react("👍");
```

**whatsmeow-node:**
```typescript
await client.sendReaction(chat, sender, messageId, "👍");
```

## Passo 5: Atualizar Operações de Grupo

| whatsapp-web.js | whatsmeow-node |
|-----------------|----------------|
| `client.createGroup(name, members)` | `client.createGroup(name, members)` |
| `chat.fetchMessages()` | — (use o evento message) |
| `groupChat.addParticipants([id])` | `client.updateGroupParticipants(jid, [id], "add")` |
| `groupChat.removeParticipants([id])` | `client.updateGroupParticipants(jid, [id], "remove")` |
| `groupChat.promoteParticipants([id])` | `client.updateGroupParticipants(jid, [id], "promote")` |
| `groupChat.setSubject(name)` | `client.setGroupName(jid, name)` |
| `groupChat.setDescription(desc)` | `client.setGroupDescription(jid, desc)` |
| `groupChat.leave()` | `client.leaveGroup(jid)` |
| `groupChat.getInviteCode()` | `client.getGroupInviteLink(jid)` |

## Passo 6: Limpeza

Depois de migrar, você pode remover do seu projeto:

- Dependência `puppeteer` / `puppeteer-core`
- Scripts de download do Chromium ou camadas Docker
- Diretório `.wwebjs_auth/` (dados de sessão do LocalAuth)
- Qualquer configuração de flags do Chrome como `--no-sandbox`, `--disable-gpu`
- Setup de CI/CD específico para navegador (Xvfb, etc.)

Suas imagens Docker vão diminuir drasticamente sem o Chromium.

## Diferenças no Formato de JID

O whatsapp-web.js usa `number@c.us` para contatos. O whatsmeow-node usa `number@s.whatsapp.net`:

```typescript
// whatsapp-web.js
const chatId = "5512345678@c.us";

// whatsmeow-node
const jid = "5512345678@s.whatsapp.net";
```

Os JIDs de grupo continuam no mesmo formato: `120363XXXXX@g.us`.

## Checklist de Migração

- [ ] Instalar `@whatsmeow-node/whatsmeow-node`, remover `whatsapp-web.js` e `puppeteer`
- [ ] Substituir `new Client()` por `createClient()`
- [ ] Remover config do Puppeteer e `LocalAuth`
- [ ] Atualizar listeners de eventos (nomes e formatos diferentes)
- [ ] Substituir `msg.body` pela extração de mensagem protobuf
- [ ] Substituir `msg.reply()` por `sendMessage()` / `sendRawMessage()`
- [ ] Substituir `client.sendMessage(id, text)` por `sendMessage(jid, { conversation: text })`
- [ ] Atualizar formato de JID: `@c.us` para `@s.whatsapp.net`
- [ ] Atualizar envio de mídia (upload + envio separados)
- [ ] Remover Chromium do Docker / CI
- [ ] Parear novamente via QR code
- [ ] Testar todos os tipos de mensagem de ponta a ponta

## Erros Comuns

:::warning Nova sessão necessária
As sessões do whatsapp-web.js não podem ser migradas. Você precisa parear do zero escaneando o QR code. Seus dados do WhatsApp não são afetados.
:::

:::warning Sem `msg.body`
O whatsapp-web.js oferece `msg.body` como conveniência. O whatsmeow-node entrega o protobuf bruto, então o texto pode estar em `message.conversation` ou `message.extendedTextMessage.text`. Sempre verifique ambos.
:::

:::warning Formato de JID
O whatsapp-web.js usa `@c.us` para contatos. O whatsmeow-node usa `@s.whatsapp.net`. Se você tem JIDs armazenados, atualize-os.
:::

<RelatedGuides slugs={["whatsmeow-in-node", "build-a-bot", "migrate-from-baileys"]} />
