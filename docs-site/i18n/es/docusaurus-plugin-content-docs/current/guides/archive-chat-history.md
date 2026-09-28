---
title: "Cómo Archivar el Historial de Chats de WhatsApp en una Base de Datos"
sidebar_label: Archivar Historial de Chats
sidebar_position: 25
description: "Guarda el historial de chats y los mensajes nuevos de WhatsApp en SQLite con Node.js usando whatsmeow-node: history sync, upserts, extracción de texto y backfill bajo demanda."
keywords: [archivar historial chats whatsapp, history sync whatsapp nodejs, respaldo mensajes whatsapp base de datos, exportar chats whatsapp sqlite, archivo mensajes whatsapp typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/archive-chat-history.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/archive-chat-history.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Archivar el Historial de Chats de WhatsApp en una Base de Datos",
      "description": "Guarda el historial de chats y los mensajes nuevos de WhatsApp en SQLite con Node.js usando whatsmeow-node: history sync, upserts, extracción de texto y backfill bajo demanda.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/archive-chat-history.png",
      "step": [
        {"@type": "HowToStep", "name": "Crear el esquema de la base de datos", "text": "Crea las tablas chats y messages en SQLite con una clave primaria en (chat, id) para que cada mensaje se guarde una sola vez."},
        {"@type": "HowToStep", "name": "Extraer el texto del mensaje", "text": "Lee el texto de conversation, extendedTextMessage.text o los captions de multimedia, y guarda el mensaje original como JSON."},
        {"@type": "HowToStep", "name": "Guardar los chunks de history sync", "text": "Escucha el evento history_sync y haz upsert de cada conversación y mensaje en una transacción por chunk."},
        {"@type": "HowToStep", "name": "Archivar mensajes en vivo", "text": "Escucha el evento message y haz upsert de los mensajes nuevos en la misma tabla."},
        {"@type": "HowToStep", "name": "Pedir historial antiguo bajo demanda", "text": "Llama a buildHistorySyncRequest() con el mensaje más antiguo conocido y envíalo con sendPeerMessage()."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Archivar el Historial de Chats de WhatsApp en una Base de Datos",
      "description": "Guarda el historial de chats y los mensajes nuevos de WhatsApp en SQLite con Node.js usando whatsmeow-node: history sync, upserts, extracción de texto y backfill bajo demanda.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/archive-chat-history.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Archivar el Historial de Chats de WhatsApp en una Base de Datos](/img/guides/es/archive-chat-history.png)
![Cómo Archivar el Historial de Chats de WhatsApp en una Base de Datos](/img/guides/es/archive-chat-history-light.png)

# Cómo Archivar el Historial de Chats de WhatsApp en una Base de Datos

Cuando vinculas un dispositivo nuevo, WhatsApp le envía una copia de tu historial de chats reciente. whatsmeow-node reenvía esos datos como eventos `history_sync`, y cada mensaje tiene la misma forma `{ info, message }` que un evento `message` en vivo. Así, una sola función puede archivar tanto los mensajes antiguos como los nuevos. Esta guía guarda todo en SQLite con [better-sqlite3](https://github.com/WiseLibs/better-sqlite3).

## Requisitos Previos

- Node.js 22+ y whatsmeow-node instalado ([Guía de instalación](/docs/installation)). La versión actual de better-sqlite3 (13.x) requiere Node 22; en Node 20, instala `better-sqlite3@12`.
- better-sqlite3 y qrcode-terminal: `npm install better-sqlite3 qrcode-terminal` (más `@types/better-sqlite3` y `@types/qrcode-terminal` para TypeScript)
- Un teléfono con WhatsApp que puedas vincular ([Cómo Vincular WhatsApp](pair-whatsapp)). Para recibir el historial inicial, el archivador tiene que estar corriendo **cuando vinculas**. Consulta el Paso 6.

## El Evento `history_sync`

```typescript
client.on("history_sync", ({ type, chunkOrder, progress, conversations }) => {
  // type:          "INITIAL_BOOTSTRAP", "RECENT", "FULL", "PUSH_NAME", "ON_DEMAND", ...
  // chunkOrder:    order of this chunk within the sync
  // progress:      sync progress in percent (0 when the sync type doesn't report it)
  // conversations: [{ id, name, unreadCount, messages: [{ info, message }] }]
});
```

Cada elemento de `conversations[].messages` tiene un `info` (`id`, `chat`, `sender`, `isFromMe`, `isGroup`, `timestamp`, `pushName`) y un objeto `message` con nombres de campo del proto, igual que los mensajes en vivo. El historial de una cuenta grande llega en **muchos chunks** repartidos a lo largo de varios minutos, así que debes guardar cada chunk a medida que llega.

## Paso 1: Crear el Esquema de la Base de Datos

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

La clave primaria es `(chat, id)` porque los IDs de mensaje solo son únicos dentro de un chat. El mismo mensaje puede llegar más de una vez, por ejemplo en dos chunks de historial, o en un chunk y como evento en vivo. Un upsert sobre esta clave lo guarda una sola vez, siempre que ambas copias usen el mismo JID de chat. Si WhatsApp identifica un chat por su LID en un lugar y por número de teléfono en otro, obtienes dos filas (consulta [JIDs LID](#errores-comunes) más abajo):

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

`timestamp` está en **segundos** Unix, el mismo valor que `info.timestamp`.

## Paso 2: Extraer el Texto del Mensaje

El texto puede estar en distintos campos según el tipo de mensaje:

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

- `conversation` contiene texto plano
- `extendedTextMessage.text` contiene respuestas, enlaces y menciones
- `imageMessage.caption`, `videoMessage.caption` y `documentMessage.caption` contienen los captions de multimedia

Guarda también el `message` completo como JSON en la columna `raw`. Así puedes extraer más campos después, como reacciones, encuestas o respuestas citadas (`extendedTextMessage.contextInfo.stanzaID`), sin volver a sincronizar.

## Paso 3: Guardar los Chunks de History Sync

Escribe cada chunk en una sola transacción. Con miles de mensajes por chunk, esto es mucho más rápido que confirmar cada fila por separado:

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

`upsertChat` está definido en el [ejemplo completo](#ejemplo-completo). Conserva el último nombre de chat que no esté vacío.

## Paso 4: Archivar Mensajes en Vivo

Los mensajes nuevos usan la misma tabla y la misma función `saveMessage()`:

```typescript
client.on("message", ({ info, message }) => {
  saveMessage(info, message, "live");
});
```

A diferencia de un bot, aquí **no** debes ignorar `info.isFromMe`. Los mensajes que envías desde tu teléfono también son parte de la conversación.

Las ediciones, reacciones y eliminaciones también llegan como eventos `message` en vivo, con sus propios IDs. Una edición, por ejemplo, es un `protocolMessage` con `type: "MESSAGE_EDIT"` y `key.ID` apuntando al mensaje original. Este archivador las guarda como filas separadas con `text` = NULL. Para aplicar las ediciones, busca `protocolMessage.editedMessage` y actualiza la fila de `protocolMessage.key.ID`. (El history sync ya aplica las ediciones: un mensaje editado llega con el ID original y el contenido editado.)

## Paso 5: Pedir Historial Antiguo Bajo Demanda

La sincronización inicial solo incluye el historial reciente. Para obtener mensajes más antiguos de un chat, pídele a tu teléfono los mensajes anteriores al más antiguo que ya tienes:

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

`buildHistorySyncRequest(info, count)` construye una solicitud de datos entre dispositivos, y `sendPeerMessage()` la envía a tu propio teléfono. La respuesta **no** llega como valor de retorno. Llega después como un evento `history_sync` con `type: "ON_DEMAND"`, y el handler del Paso 3 la guarda. Incluye `isFromMe` en el objeto info, porque WhatsApp lo usa para identificar el mensaje más antiguo.

## Paso 6: Vincular desde el Archivador

WhatsApp envía el historial inicial (chunks `INITIAL_BOOTSTRAP` y `RECENT`, además de otros tipos como `PUSH_NAME`) **una sola vez, justo después de vincular un dispositivo nuevo**. whatsmeow-node no pide una sincronización completa, así que espera los últimos meses de historial, no toda la cuenta. Cualquier proceso que esté conectado cuando llega la sincronización la consume: whatsmeow confirma cada chunk y lo borra de los servidores de WhatsApp, aunque no haya un listener de `history_sync`. Si vinculas con un script aparte que sigue conectado, ese historial se pierde.

Maneja el código QR en el propio archivador para que esté escuchando cuando empiece la sincronización:

```typescript
import qrcode from "qrcode-terminal";

client.on("qr", ({ code }) => {
  qrcode.generate(code, { small: true });
});

const { jid } = await client.init();
if (!jid) await client.getQRChannel();
await client.connect();
```

Si te perdiste la sincronización inicial, desvincula el dispositivo en tu teléfono (**Ajustes → Dispositivos vinculados**), borra `session.db` y vuelve a vincular.

## Ejemplo Completo

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

Ejecútalo con `npx tsx archive.ts`. Para hacer backfill de un chat, pasa su JID: `npx tsx archive.ts 5989XXXXXXXX@s.whatsapp.net`.

Después consulta el archivo con cualquier herramienta de SQLite:

```sql
SELECT datetime(timestamp, 'unixepoch') AS sent, push_name, text
FROM messages
WHERE chat = '5989XXXXXXXX@s.whatsapp.net'
ORDER BY timestamp;
```

## Errores Comunes

:::warning El historial solo se envía una vez, al vincular
La sincronización inicial del historial ocurre solo justo después de vincular. Ejecuta el archivador durante la vinculación (Paso 6). Si te la perdiste, desvincula el dispositivo, borra el almacén de sesión y vuelve a vincular. Las solicitudes bajo demanda pueden completar chats específicos más tarde, pero necesitan que tu teléfono esté en línea.
:::

:::warning JIDs LID
Los IDs de chat y de remitente pueden ser LIDs (`123456789@lid`) en lugar de JIDs con número de teléfono (`5989...@s.whatsapp.net`), sobre todo en los datos de history sync y en grupos. La misma persona puede aparecer con ambas formas. Guarda los IDs tal como los recibes y no asumas que todo JID contiene un número de teléfono. Esto también significa que el mismo chat puede quedar con dos valores de `chat` en el archivo, así que la deduplicación y `requestOlderMessages()` solo funcionan dentro de una misma forma. Consulta [JIDs, LIDs e IDs de Dispositivo](whatsapp-jids-and-lids) para más detalles.
:::

:::warning Sincronizaciones iniciales grandes
Las cuentas con años de chats pueden generar cientos de chunks. Usa una transacción por chunk, evita trabajo lento (como descargar multimedia) dentro del handler de `history_sync`, y no trates el primer chunk como el historial completo. `progress` vale 0 en los tipos de sincronización que no lo informan, así que úsalo solo para mostrar el avance.
:::

:::warning La multimedia no se descarga
El archivo guarda los metadatos del mensaje multimedia (en `raw`), no los archivos. Los enlaces de multimedia de mensajes antiguos suelen haber expirado. Para conservar los archivos de mensajes nuevos, descárgalos cuando llegan ([Cómo Descargar Multimedia](download-media)).
:::

:::warning Nombres de campos
El objeto `message` usa los nombres JSON del proto, como `stanzaID`, `mentionedJID` y `fileSHA256` (no `stanzaId`). Consulta [Solución de Problemas](/docs/troubleshooting/common-issues#proto-field-naming).
:::

:::danger Guarda los datos con responsabilidad
Un archivo de chats contiene mensajes privados de otras personas. Protege el archivo de la base de datos con cifrado de disco y permisos de archivo restringidos, no lo subas a git, archiva solo cuentas que estés autorizado a archivar, y cumple las leyes de privacidad que te apliquen (GDPR, LGPD, etc.), incluidas las solicitudes de eliminación.
:::

<RelatedGuides slugs={["download-media", "build-a-bot", "pair-whatsapp", "forward-messages", "whatsapp-jids-and-lids"]} />
