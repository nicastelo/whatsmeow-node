---
title: "Como Substituir o Baileys pelo whatsmeow-node"
sidebar_label: Migrar do Baileys
sidebar_position: 10
description: "Migre seu bot de WhatsApp do Baileys para o whatsmeow-node — comparação lado a lado, mapeamento de API e guia passo a passo de migração."
keywords: [alternativa ao baileys, substituir baileys, baileys para whatsmeow, migração baileys, migração bot whatsapp nodejs, baileys vs whatsmeow]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/migrate-from-baileys.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/migrate-from-baileys.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Substituir o Baileys pelo whatsmeow-node",
      "description": "Migre seu bot de WhatsApp do Baileys para o whatsmeow-node — comparação lado a lado, mapeamento de API e guia passo a passo de migração.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/migrate-from-baileys.png",
      "step": [
        {"@type": "HowToStep", "name": "Instalar o whatsmeow-node", "text": "Substitua @whiskeysockets/baileys por @whatsmeow-node/whatsmeow-node nas suas dependências."},
        {"@type": "HowToStep", "name": "Atualizar a Inicialização do Client", "text": "Substitua makeWASocket por createClient. Troque useMultiFileAuthState por um caminho de store."},
        {"@type": "HowToStep", "name": "Atualizar os Listeners de Eventos", "text": "Substitua ev.on('messages.upsert') por client.on('message'). Atualize os formatos de evento para o padrão do whatsmeow-node."},
        {"@type": "HowToStep", "name": "Atualizar o Envio de Mensagens", "text": "Substitua sendMessage pelo equivalente do whatsmeow-node. O formato do conteúdo é similar, mas os nomes dos campos diferem."},
        {"@type": "HowToStep", "name": "Atualizar Operações de Grupo", "text": "Substitua groupCreate, groupMetadata, etc. pelos equivalentes do whatsmeow-node."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Substituir o Baileys pelo whatsmeow-node",
      "description": "Migre seu bot de WhatsApp do Baileys para o whatsmeow-node — comparação lado a lado, mapeamento de API e guia passo a passo de migração.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/migrate-from-baileys.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/migrate-from-baileys.png"}}
    })}
  </script>
</Head>

![Como Substituir o Baileys pelo whatsmeow-node](/img/guides/pt-BR/migrate-from-baileys.png)
![Como Substituir o Baileys pelo whatsmeow-node](/img/guides/pt-BR/migrate-from-baileys-light.png)

# Como Substituir o Baileys pelo whatsmeow-node

Se você usa o [Baileys](https://github.com/WhiskeySockets/Baileys) e está enfrentando problemas de manutenção, instabilidade de forks ou quer um upstream mais confiável, o whatsmeow-node é uma alternativa direta com uma superfície de API similar. Este guia mapeia os conceitos-chave e mostra como migrar.

## Por Que Migrar?

- **Upstream estável** — o whatsmeow é mantido pelo time Mautrix e usado em produção por milhares de bridges Matrix 24/7. Quando o WhatsApp muda o protocolo, as correções chegam rápido.
- **Sem roleta de forks** — o Baileys já passou por múltiplos forks (adiwajshing, WhiskeySockets, outros). O whatsmeow-node encapsula uma única biblioteca Go estável.
- **Menos memória** — ~10-20 MB vs ~50 MB típicos do Baileys.
- **API tipada** — mais de 100 métodos async tipados com design TypeScript-first.

Veja a [Comparação com Alternativas](/docs/comparison) para mais detalhes.

## Passo 1: Instalar

```bash
# Remove Baileys
npm uninstall @whiskeysockets/baileys

# Install whatsmeow-node
npm install @whatsmeow-node/whatsmeow-node
```

## Passo 2: Atualizar a Inicialização do Client

### Baileys

```typescript
import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";

const { state, saveCreds } = await useMultiFileAuthState("auth_info");
const sock = makeWASocket({ auth: state });
sock.ev.on("creds.update", saveCreds);
```

### whatsmeow-node

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });
const { jid } = await client.init();
await client.connect();
```

A persistência da sessão é automática — não precisa de callback `saveCreds`. A opção `store` aceita um caminho de arquivo (SQLite) ou uma string de conexão PostgreSQL.

:::info
Você precisará parear novamente (escanear QR code) após a troca. O estado de autenticação do Baileys não é compatível com sessões do whatsmeow.
:::

## Passo 3: Atualizar os Listeners de Eventos

### Mensagens

**Baileys:**
```typescript
sock.ev.on("messages.upsert", ({ messages }) => {
  for (const msg of messages) {
    if (msg.key.fromMe) continue;
    const text = msg.message?.conversation
      ?? msg.message?.extendedTextMessage?.text;
    console.log(`${msg.pushName}: ${text}`);
  }
});
```

**whatsmeow-node:**
```typescript
client.on("message", ({ info, message }) => {
  if (info.isFromMe) return;
  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  console.log(`${info.pushName}: ${text}`);
});
```

Diferenças principais:
- Uma mensagem por evento (sem batch)
- Metadados da mensagem ficam em `info`, conteúdo protobuf fica em `message`
- `info.isFromMe` substitui `msg.key.fromMe`
- `info.chat` substitui `msg.key.remoteJid`
- `info.sender` substitui `msg.key.participant` (em grupos)

### Conexão

**Baileys:**
```typescript
sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
  if (connection === "open") console.log("Connected!");
  if (connection === "close") { /* handle reconnection */ }
});
```

**whatsmeow-node:**
```typescript
client.on("connected", ({ jid }) => console.log(`Connected as ${jid}`));
client.on("disconnected", () => console.log("Disconnected"));
client.on("logged_out", ({ reason }) => console.error(`Logged out: ${reason}`));
```

Você não precisa de lógica manual de reconexão — o whatsmeow faz isso automaticamente.

## Passo 4: Atualizar o Envio de Mensagens

### Mensagem de texto

**Baileys:**
```typescript
await sock.sendMessage(jid, { text: "Hello!" });
```

**whatsmeow-node:**
```typescript
await client.sendMessage(jid, { conversation: "Hello!" });
```

### Resposta com citação

**Baileys:**
```typescript
await sock.sendMessage(jid, { text: "Reply!" }, { quoted: msg });
```

**whatsmeow-node:**
```typescript
await client.sendRawMessage(jid, {
  extendedTextMessage: {
    text: "Reply!",
    contextInfo: {
      stanzaId: info.id,
      participant: info.sender,
      quotedMessage: { conversation: originalText },
    },
  },
});
```

### Mídia

**Baileys:**
```typescript
await sock.sendMessage(jid, {
  image: { url: "/path/to/photo.jpg" },
  caption: "Check this out",
});
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

O upload e o envio de mídia são etapas separadas no whatsmeow-node. Isso dá mais controle (ex.: fazer upload uma vez, enviar para vários chats).

### Reações

**Baileys:**
```typescript
await sock.sendMessage(jid, { react: { text: "👍", key: msg.key } });
```

**whatsmeow-node:**
```typescript
await client.sendReaction(jid, senderJid, messageId, "👍");
```

## Passo 5: Atualizar Operações de Grupo

| Baileys | whatsmeow-node |
|---------|----------------|
| `sock.groupCreate(name, members)` | `client.createGroup(name, members)` |
| `sock.groupMetadata(jid)` | `client.getGroupInfo(jid)` |
| `sock.groupFetchAllParticipating()` | `client.getJoinedGroups()` |
| `sock.groupUpdateSubject(jid, name)` | `client.setGroupName(jid, name)` |
| `sock.groupUpdateDescription(jid, desc)` | `client.setGroupDescription(jid, desc)` |
| `sock.groupSettingUpdate(jid, "announcement")` | `client.setGroupAnnounce(jid, true)` |
| `sock.groupParticipantsUpdate(jid, [jid], "add")` | `client.updateGroupParticipants(jid, [jid], "add")` |
| `sock.groupInviteCode(jid)` | `client.getGroupInviteLink(jid)` |
| `sock.groupLeave(jid)` | `client.leaveGroup(jid)` |

## Referência Rápida de API

| Baileys | whatsmeow-node |
|---------|----------------|
| `makeWASocket()` | `createClient()` |
| `sock.sendMessage(jid, content)` | `client.sendMessage(jid, content)` |
| `sock.readMessages([key])` | `client.markRead([id], chat, sender)` |
| `sock.sendPresenceUpdate("available")` | `client.sendPresence("available")` |
| `sock.presenceSubscribe(jid)` | `client.subscribePresence(jid)` |
| `sock.profilePictureUrl(jid)` | `client.getProfilePicture(jid)` |
| `sock.updateBlockStatus(jid, "block")` | `client.updateBlocklist(jid, "block")` |
| `sock.logout()` | `client.logout()` |

## Checklist de Migração

- [ ] Instalar `@whatsmeow-node/whatsmeow-node`, remover `@whiskeysockets/baileys`
- [ ] Substituir `makeWASocket` por `createClient`
- [ ] Remover `useMultiFileAuthState` — a sessão é tratada automaticamente
- [ ] Atualizar listeners de eventos (`ev.on` por `client.on`, nomes de eventos diferentes)
- [ ] Atualizar chamadas de `sendMessage` (`text` por `conversation`)
- [ ] Atualizar envio de mídia (etapas separadas de upload + envio)
- [ ] Atualizar operações de grupo (nomes dos métodos diferem levemente)
- [ ] Remover lógica manual de reconexão — o whatsmeow reconecta automaticamente
- [ ] Parear novamente via QR code (nova sessão necessária)
- [ ] Testar todos os tipos de mensagem de ponta a ponta

## Erros Comuns

:::warning Nova sessão necessária
O estado de autenticação do Baileys não pode ser migrado. Você precisa parear uma nova sessão escaneando o QR code. Seu histórico de conversas e contatos do WhatsApp não são afetados — apenas o vínculo do dispositivo é novo.
:::

:::warning `text` vs `conversation`
O Baileys usa `{ text: "..." }` para mensagens. O whatsmeow-node usa `{ conversation: "..." }` — seguindo o nome do campo protobuf do WhatsApp.
:::

:::warning Casing dos campos proto
Os campos da resposta do upload usam o casing exato do protobuf: `URL`, `fileSHA256`, `fileEncSHA256` — **não** camelCase. Usar o casing errado falha silenciosamente.
:::

<RelatedGuides slugs={["whatsmeow-in-node", "build-a-bot", "migrate-from-whatsapp-web-js"]} />
