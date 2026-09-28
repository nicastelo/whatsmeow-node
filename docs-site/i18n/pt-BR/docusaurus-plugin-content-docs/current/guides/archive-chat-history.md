---
title: "Como Arquivar o Histórico de Conversas do WhatsApp em um Banco de Dados"
sidebar_label: Arquivar Histórico de Conversas
sidebar_position: 25
description: "Salve o histórico de conversas e as novas mensagens do WhatsApp no SQLite com Node.js usando whatsmeow-node: history sync, upserts, extração de texto e backfill sob demanda."
keywords: [arquivar historico conversas whatsapp, history sync whatsapp nodejs, backup mensagens whatsapp banco de dados, exportar conversas whatsapp sqlite, arquivo mensagens whatsapp typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/archive-chat-history.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/archive-chat-history.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Arquivar o Histórico de Conversas do WhatsApp em um Banco de Dados",
      "description": "Salve o histórico de conversas e as novas mensagens do WhatsApp no SQLite com Node.js usando whatsmeow-node: history sync, upserts, extração de texto e backfill sob demanda.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/archive-chat-history.png",
      "step": [
        {"@type": "HowToStep", "name": "Criar o Esquema do Banco de Dados", "text": "Crie as tabelas chats e messages no SQLite com uma chave primária em (chat, id) para que cada mensagem seja salva uma única vez."},
        {"@type": "HowToStep", "name": "Extrair o Texto da Mensagem", "text": "Leia o texto de conversation, extendedTextMessage.text ou das legendas de mídia, e guarde a mensagem original como JSON."},
        {"@type": "HowToStep", "name": "Salvar os Chunks do History Sync", "text": "Escute o evento history_sync e faça upsert de cada conversa e mensagem em uma transação por chunk."},
        {"@type": "HowToStep", "name": "Arquivar Mensagens em Tempo Real", "text": "Escute o evento message e faça upsert das novas mensagens na mesma tabela."},
        {"@type": "HowToStep", "name": "Pedir Histórico Antigo Sob Demanda", "text": "Chame buildHistorySyncRequest() com a mensagem mais antiga conhecida e envie com sendPeerMessage()."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Arquivar o Histórico de Conversas do WhatsApp em um Banco de Dados",
      "description": "Salve o histórico de conversas e as novas mensagens do WhatsApp no SQLite com Node.js usando whatsmeow-node: history sync, upserts, extração de texto e backfill sob demanda.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/archive-chat-history.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Arquivar o Histórico de Conversas do WhatsApp em um Banco de Dados](/img/guides/pt-BR/archive-chat-history.png)
![Como Arquivar o Histórico de Conversas do WhatsApp em um Banco de Dados](/img/guides/pt-BR/archive-chat-history-light.png)

# Como Arquivar o Histórico de Conversas do WhatsApp em um Banco de Dados

Quando você pareia um novo dispositivo, o WhatsApp envia para ele uma cópia do seu histórico de conversas recente. O whatsmeow-node repassa esses dados como eventos `history_sync`, e cada mensagem tem o mesmo formato `{ info, message }` de um evento `message` em tempo real. Assim, uma única função pode arquivar tanto as mensagens antigas quanto as novas. Este guia salva tudo no SQLite com [better-sqlite3](https://github.com/WiseLibs/better-sqlite3).

## Pré-requisitos

- Node.js 22+ e whatsmeow-node instalado ([Guia de instalação](/docs/installation)). A versão atual do better-sqlite3 (13.x) exige Node 22; no Node 20, instale `better-sqlite3@12`.
- better-sqlite3 e qrcode-terminal: `npm install better-sqlite3 qrcode-terminal` (mais `@types/better-sqlite3` e `@types/qrcode-terminal` para TypeScript)
- Um celular com WhatsApp que você possa parear ([Como Parear o WhatsApp](pair-whatsapp)). Para receber o histórico inicial, o arquivador precisa estar rodando **quando você parear**. Veja o Passo 6.

## O Evento `history_sync`

```typescript
client.on("history_sync", ({ type, chunkOrder, progress, conversations }) => {
  // type:          "INITIAL_BOOTSTRAP", "RECENT", "FULL", "PUSH_NAME", "ON_DEMAND", ...
  // chunkOrder:    order of this chunk within the sync
  // progress:      sync progress in percent (0 when the sync type doesn't report it)
  // conversations: [{ id, name, unreadCount, messages: [{ info, message }] }]
});
```

Cada item de `conversations[].messages` tem um `info` (`id`, `chat`, `sender`, `isFromMe`, `isGroup`, `timestamp`, `pushName`) e um objeto `message` com nomes de campo do proto, igual às mensagens em tempo real. O histórico de uma conta grande chega em **muitos chunks** ao longo de vários minutos, então salve cada chunk assim que ele chegar.

## Passo 1: Criar o Esquema do Banco de Dados

```typescript
import Database from "better-sqlite3";

const db = new Database("archive.db");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    id           TEXT PRIMARY KEY,
    name         TEXT,
    unread_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS messages (
    chat      TEXT    NOT NULL,
    id        TEXT    NOT NULL,
    sender    TEXT    NOT NULL,
    from_me   INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    push_name TEXT,
    text      TEXT,
    raw       TEXT    NOT NULL,
    source    TEXT    NOT NULL,
    PRIMARY KEY (chat, id)
  );
  CREATE INDEX IF NOT EXISTS messages_chat_ts ON messages (chat, timestamp);
`);
```

A chave primária é `(chat, id)` porque os IDs de mensagem só são únicos dentro de uma conversa. A mesma mensagem pode chegar mais de uma vez, por exemplo em dois chunks de histórico, ou em um chunk e como evento em tempo real. Um upsert nessa chave salva a mensagem uma única vez, desde que as duas cópias usem o mesmo JID de conversa. Se o WhatsApp identificar uma conversa pelo LID em um lugar e pelo número de telefone em outro, você terá duas linhas (veja [JIDs LID](#erros-comuns) abaixo):

```typescript
const upsertMessage = db.prepare(`
  INSERT INTO messages (chat, id, sender, from_me, timestamp, push_name, text, raw, source)
  VALUES (@chat, @id, @sender, @fromMe, @timestamp, @pushName, @text, @raw, @source)
  ON CONFLICT (chat, id) DO UPDATE SET
    text = COALESCE(excluded.text, messages.text),
    raw = excluded.raw,
    push_name = COALESCE(NULLIF(excluded.push_name, ''), messages.push_name)
`);
```

`timestamp` está em **segundos** Unix, o mesmo valor de `info.timestamp`.

## Passo 2: Extrair o Texto da Mensagem

O texto pode estar em campos diferentes dependendo do tipo de mensagem:

```typescript
function extractText(message: Record<string, unknown>): string | null {
  if (typeof message.conversation === "string") return message.conversation;

  const ext = message.extendedTextMessage as { text?: string } | undefined;
  if (ext?.text) return ext.text;

  for (const key of ["imageMessage", "videoMessage", "documentMessage"]) {
    const media = message[key] as { caption?: string } | undefined;
    if (media?.caption) return media.caption;
  }
  return null;
}
```

- `conversation` contém texto simples
- `extendedTextMessage.text` contém respostas, links e menções
- `imageMessage.caption`, `videoMessage.caption` e `documentMessage.caption` contêm as legendas de mídia

Salve também o `message` completo como JSON na coluna `raw`. Assim você pode extrair mais campos depois, como reações, enquetes ou respostas citadas (`extendedTextMessage.contextInfo.stanzaID`), sem sincronizar de novo.

## Passo 3: Salvar os Chunks do History Sync

Grave cada chunk em uma única transação. Com milhares de mensagens por chunk, isso é muito mais rápido do que confirmar cada linha separadamente:

```typescript
import type { HistorySyncConversation, MessageInfo } from "@whatsmeow-node/whatsmeow-node";

function saveMessage(
  info: MessageInfo,
  message: Record<string, unknown>,
  source: "history" | "live",
): void {
  upsertMessage.run({
    chat: info.chat,
    id: info.id,
    sender: info.sender,
    fromMe: info.isFromMe ? 1 : 0,
    timestamp: info.timestamp,
    pushName: info.pushName,
    text: extractText(message),
    raw: JSON.stringify(message),
    source,
  });
}

const saveChunk = db.transaction((conversations: HistorySyncConversation[]) => {
  let count = 0;
  for (const conv of conversations) {
    upsertChat.run({ id: conv.id, name: conv.name, unreadCount: conv.unreadCount });
    for (const { info, message } of conv.messages) {
      saveMessage(info, message, "history");
      count++;
    }
  }
  return count;
});

client.on("history_sync", ({ type, chunkOrder, progress, conversations }) => {
  const count = saveChunk(conversations);
  console.log(
    `[history] ${type} chunk #${chunkOrder}: ${conversations.length} chats, ` +
      `${count} messages (progress ${progress}%)`,
  );
});
```

`upsertChat` está definido no [exemplo completo](#exemplo-completo). Ele mantém o último nome de conversa que não esteja vazio.

## Passo 4: Arquivar Mensagens em Tempo Real

As novas mensagens usam a mesma tabela e a mesma função `saveMessage()`:

```typescript
client.on("message", ({ info, message }) => {
  saveMessage(info, message, "live");
});
```

Diferente de um bot, aqui você **não** deve ignorar `info.isFromMe`. As mensagens que você envia pelo celular também fazem parte da conversa.

Edições, reações e exclusões também chegam como eventos `message` em tempo real, com IDs próprios. Uma edição, por exemplo, é um `protocolMessage` com `type: "MESSAGE_EDIT"` e `key.ID` apontando para a mensagem original. Este arquivador as salva como linhas separadas com `text` = NULL. Para aplicar as edições, verifique `protocolMessage.editedMessage` e atualize a linha de `protocolMessage.key.ID`. (O history sync já aplica as edições: uma mensagem editada chega com o ID original e o conteúdo editado.)

## Passo 5: Pedir Histórico Antigo Sob Demanda

A sincronização inicial só inclui o histórico recente. Para obter mensagens mais antigas de uma conversa, peça ao seu celular as mensagens anteriores à mais antiga que você já tem:

```typescript
const oldestInChat = db.prepare(`
  SELECT id, chat, sender, from_me, timestamp
  FROM messages WHERE chat = ?
  ORDER BY timestamp ASC LIMIT 1
`);

async function requestOlderMessages(chat: string, count = 50): Promise<void> {
  const row = oldestInChat.get(chat) as
    | { id: string; chat: string; sender: string; from_me: number; timestamp: number }
    | undefined;
  if (!row) return;

  const oldest: MessageInfo = {
    id: row.id,
    chat: row.chat,
    sender: row.sender,
    isFromMe: row.from_me === 1,
    isGroup: row.chat.endsWith("@g.us"),
    timestamp: row.timestamp,
    pushName: "",
  };

  const request = await client.buildHistorySyncRequest(oldest, count);
  await client.sendPeerMessage(request);
}
```

`buildHistorySyncRequest(info, count)` monta uma solicitação de dados entre dispositivos, e `sendPeerMessage()` a envia para o seu próprio celular. A resposta **não** vem como valor de retorno. Ela chega depois como um evento `history_sync` com `type: "ON_DEMAND"`, e o handler do Passo 3 a salva. Inclua `isFromMe` no objeto info, porque o WhatsApp o usa para identificar a mensagem mais antiga.

## Passo 6: Parear a Partir do Arquivador

O WhatsApp envia o histórico inicial (chunks `INITIAL_BOOTSTRAP` e `RECENT`, além de outros tipos como `PUSH_NAME`) **uma única vez, logo depois que um novo dispositivo é pareado**. O whatsmeow-node não pede uma sincronização completa, então espere os últimos meses de histórico, não a conta inteira. Qualquer processo que esteja conectado quando a sincronização chega a consome: o whatsmeow confirma cada chunk e o apaga dos servidores do WhatsApp, mesmo sem um listener de `history_sync`. Se você parear com um script separado que continua conectado, esse histórico se perde.

Trate o QR code no próprio arquivador para que ele esteja escutando quando a sincronização começar:

```typescript
import qrcode from "qrcode-terminal";

client.on("qr", ({ code }) => {
  qrcode.generate(code, { small: true });
});

const { jid } = await client.init();
if (!jid) await client.getQRChannel();
await client.connect();
```

Se você perdeu a sincronização inicial, desconecte o dispositivo no celular (**Configurações → Dispositivos conectados**), apague o `session.db` e pareie de novo.

## Exemplo Completo

```typescript
import {
  createClient,
  type HistorySyncConversation,
  type MessageInfo,
} from "@whatsmeow-node/whatsmeow-node";
import Database from "better-sqlite3";
import qrcode from "qrcode-terminal";

const client = createClient({ store: "session.db" });
const db = new Database("archive.db");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    id           TEXT PRIMARY KEY,
    name         TEXT,
    unread_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS messages (
    chat      TEXT    NOT NULL,
    id        TEXT    NOT NULL,
    sender    TEXT    NOT NULL,
    from_me   INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    push_name TEXT,
    text      TEXT,
    raw       TEXT    NOT NULL,
    source    TEXT    NOT NULL,
    PRIMARY KEY (chat, id)
  );
  CREATE INDEX IF NOT EXISTS messages_chat_ts ON messages (chat, timestamp);
`);

const upsertChat = db.prepare(`
  INSERT INTO chats (id, name, unread_count)
  VALUES (@id, @name, @unreadCount)
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(NULLIF(excluded.name, ''), chats.name),
    unread_count = excluded.unread_count
`);

const upsertMessage = db.prepare(`
  INSERT INTO messages (chat, id, sender, from_me, timestamp, push_name, text, raw, source)
  VALUES (@chat, @id, @sender, @fromMe, @timestamp, @pushName, @text, @raw, @source)
  ON CONFLICT (chat, id) DO UPDATE SET
    text = COALESCE(excluded.text, messages.text),
    raw = excluded.raw,
    push_name = COALESCE(NULLIF(excluded.push_name, ''), messages.push_name)
`);

function extractText(message: Record<string, unknown>): string | null {
  if (typeof message.conversation === "string") return message.conversation;

  const ext = message.extendedTextMessage as { text?: string } | undefined;
  if (ext?.text) return ext.text;

  for (const key of ["imageMessage", "videoMessage", "documentMessage"]) {
    const media = message[key] as { caption?: string } | undefined;
    if (media?.caption) return media.caption;
  }
  return null;
}

function saveMessage(
  info: MessageInfo,
  message: Record<string, unknown>,
  source: "history" | "live",
): void {
  upsertMessage.run({
    chat: info.chat,
    id: info.id,
    sender: info.sender,
    fromMe: info.isFromMe ? 1 : 0,
    timestamp: info.timestamp,
    pushName: info.pushName,
    text: extractText(message),
    raw: JSON.stringify(message),
    source,
  });
}

// One transaction per chunk: much faster than one commit per message
const saveChunk = db.transaction((conversations: HistorySyncConversation[]) => {
  let count = 0;
  for (const conv of conversations) {
    upsertChat.run({ id: conv.id, name: conv.name, unreadCount: conv.unreadCount });
    for (const { info, message } of conv.messages) {
      saveMessage(info, message, "history");
      count++;
    }
  }
  return count;
});

// Past messages: pushed after pairing, and in response to on-demand requests
client.on("history_sync", ({ type, chunkOrder, progress, conversations }) => {
  const count = saveChunk(conversations);
  console.log(
    `[history] ${type} chunk #${chunkOrder}: ${conversations.length} chats, ` +
      `${count} messages (progress ${progress}%)`,
  );
});

// New messages: archive them into the same table
client.on("message", ({ info, message }) => {
  saveMessage(info, message, "live");
});

// Ask the primary phone for older messages in one chat
const oldestInChat = db.prepare(`
  SELECT id, chat, sender, from_me, timestamp
  FROM messages WHERE chat = ?
  ORDER BY timestamp ASC LIMIT 1
`);

async function requestOlderMessages(chat: string, count = 50): Promise<void> {
  const row = oldestInChat.get(chat) as
    | { id: string; chat: string; sender: string; from_me: number; timestamp: number }
    | undefined;
  if (!row) {
    console.log(`No archived messages for ${chat} yet`);
    return;
  }

  const oldest: MessageInfo = {
    id: row.id,
    chat: row.chat,
    sender: row.sender,
    isFromMe: row.from_me === 1,
    isGroup: row.chat.endsWith("@g.us"),
    timestamp: row.timestamp,
    pushName: "",
  };

  const request = await client.buildHistorySyncRequest(oldest, count);
  await client.sendPeerMessage(request);
  // The answer arrives later as a history_sync event with type "ON_DEMAND"
}

// Pair from THIS process: the initial history is only pushed right after pairing
client.on("qr", ({ code }) => {
  qrcode.generate(code, { small: true });
});

async function main() {
  const { jid } = await client.init();
  if (jid) {
    console.log(`Resuming session for ${jid}`);
  } else {
    console.log("No session found — scan the QR code to pair");
    await client.getQRChannel();
  }
  await client.connect();
  console.log("Archiving messages to archive.db...");

  process.on("SIGINT", async () => {
    await client.disconnect();
    client.close();
    db.close();
    process.exit(0);
  });

  // Example: backfill a chat passed on the command line (needs a logged-in session)
  const backfillChat = process.argv[2];
  if (backfillChat && (await client.waitForConnection())) {
    await requestOlderMessages(backfillChat);
  }
}

main().catch(console.error);
```

Execute com `npx tsx archive.ts`. Para fazer backfill de uma conversa, passe o JID dela: `npx tsx archive.ts 5989XXXXXXXX@s.whatsapp.net`.

Depois consulte o arquivo com qualquer ferramenta de SQLite:

```sql
SELECT datetime(timestamp, 'unixepoch') AS sent, push_name, text
FROM messages
WHERE chat = '5989XXXXXXXX@s.whatsapp.net'
ORDER BY timestamp;
```

## Erros Comuns

:::warning O histórico só é enviado uma vez, no pareamento
A sincronização inicial do histórico só acontece logo depois do pareamento. Rode o arquivador durante o pareamento (Passo 6). Se você a perdeu, desconecte o dispositivo, apague o armazenamento da sessão e pareie de novo. As solicitações sob demanda podem completar conversas específicas depois, mas exigem que o celular esteja online.
:::

:::warning JIDs LID
Os IDs de conversa e de remetente podem ser LIDs (`123456789@lid`) em vez de JIDs com número de telefone (`5989...@s.whatsapp.net`), principalmente nos dados de history sync e em grupos. A mesma pessoa pode aparecer nas duas formas. Salve os IDs como você os recebe e não assuma que todo JID contém um número de telefone. Isso também significa que a mesma conversa pode ficar com dois valores de `chat` no arquivo, então a deduplicação e o `requestOlderMessages()` só funcionam dentro de uma mesma forma. Veja [JIDs, LIDs e IDs de Dispositivo](whatsapp-jids-and-lids) para mais detalhes.
:::

:::warning Sincronizações iniciais grandes
Contas com anos de conversas podem gerar centenas de chunks. Use uma transação por chunk, evite trabalho lento (como baixar mídias) dentro do handler de `history_sync`, e não trate o primeiro chunk como o histórico completo. `progress` vale 0 nos tipos de sincronização que não o informam, então use-o só para exibir o andamento.
:::

:::warning Mídias não são baixadas
O arquivo guarda os metadados da mensagem de mídia (em `raw`), não os arquivos. Os links de mídia de mensagens antigas geralmente já expiraram. Para manter os arquivos das novas mensagens, baixe-os quando chegarem ([Como Baixar Mídias](download-media)).
:::

:::warning Nomes de campos
O objeto `message` usa os nomes JSON do proto, como `stanzaID`, `mentionedJID` e `fileSHA256` (não `stanzaId`). Veja [Solução de Problemas](/docs/troubleshooting/common-issues#proto-field-naming).
:::

:::danger Guarde os dados com responsabilidade
Um arquivo de conversas contém mensagens privadas de outras pessoas. Proteja o arquivo do banco de dados com criptografia de disco e permissões de arquivo restritas, não o envie para o git, arquive apenas contas que você tem autorização para arquivar, e siga as leis de privacidade que se aplicam a você (LGPD, GDPR etc.), incluindo pedidos de exclusão.
:::

<RelatedGuides slugs={["download-media", "build-a-bot", "pair-whatsapp", "forward-messages", "whatsapp-jids-and-lids"]} />
