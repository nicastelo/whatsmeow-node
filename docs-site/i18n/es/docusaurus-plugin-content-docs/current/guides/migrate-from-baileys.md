---
title: "Cómo Reemplazar Baileys con whatsmeow-node"
sidebar_label: Migrar desde Baileys
sidebar_position: 10
description: "Migra tu bot de WhatsApp de Baileys a whatsmeow-node — comparación de código lado a lado, mapeo de API y guía de migración paso a paso."
keywords: [alternativa a baileys, reemplazar baileys, baileys a whatsmeow, migración baileys, migración bot whatsapp nodejs, baileys vs whatsmeow]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/migrate-from-baileys.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/migrate-from-baileys.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Replace Baileys with whatsmeow-node",
      "description": "Migrate your WhatsApp bot from Baileys to whatsmeow-node — side-by-side code comparison, API mapping, and step-by-step migration guide.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/migrate-from-baileys.png",
      "step": [
        {"@type": "HowToStep", "name": "Install whatsmeow-node", "text": "Replace @whiskeysockets/baileys with @whatsmeow-node/whatsmeow-node in your dependencies."},
        {"@type": "HowToStep", "name": "Update Client Initialization", "text": "Replace makeWASocket with createClient. Switch from useMultiFileAuthState to a store path."},
        {"@type": "HowToStep", "name": "Update Event Listeners", "text": "Replace ev.on('messages.upsert') with client.on('message'). Update event shapes to match whatsmeow-node."},
        {"@type": "HowToStep", "name": "Update Message Sending", "text": "Replace sendMessage with the whatsmeow-node equivalent. Content shape is similar but key names differ."},
        {"@type": "HowToStep", "name": "Update Group Operations", "text": "Replace groupCreate, groupMetadata, etc. with the whatsmeow-node equivalents."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Replace Baileys with whatsmeow-node",
      "description": "Migrate your WhatsApp bot from Baileys to whatsmeow-node — side-by-side code comparison, API mapping, and step-by-step migration guide.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/migrate-from-baileys.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/migrate-from-baileys.png"}}
    })}
  </script>
</Head>

![Cómo Reemplazar Baileys con whatsmeow-node](/img/guides/es/migrate-from-baileys.png)
![Cómo Reemplazar Baileys con whatsmeow-node](/img/guides/es/migrate-from-baileys-light.png)

# Cómo Reemplazar Baileys con whatsmeow-node

Si estás usando [Baileys](https://github.com/WhiskeySockets/Baileys) y te topas con problemas de mantenimiento, inestabilidad de forks, o quieres un upstream más confiable, whatsmeow-node es una alternativa directa con una superficie de API similar. Esta guía mapea los conceptos clave y te muestra cómo migrar.

## ¿Por Qué Migrar?

- **Upstream estable** — whatsmeow es mantenido por el equipo de Mautrix y usado en producción por miles de puentes Matrix 24/7. Cuando WhatsApp cambia su protocolo, los arreglos llegan rápido.
- **Sin ruleta de forks** — Baileys ha pasado por múltiples forks (adiwajshing → WhiskeySockets → otros). whatsmeow-node envuelve una sola biblioteca Go estable.
- **Menor consumo de memoria** — ~10-20 MB vs ~50 MB típico de Baileys.
- **API tipada** — Más de 100 métodos async tipados con diseño TypeScript-first.

Consulta la [Comparación con Alternativas](/docs/comparison) para más detalles.

## Paso 1: Instalar

```bash
# Remove Baileys
npm uninstall @whiskeysockets/baileys

# Install whatsmeow-node
npm install @whatsmeow-node/whatsmeow-node
```

## Paso 2: Actualizar la Inicialización del Cliente

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

La persistencia de sesión es automática — no se necesita callback `saveCreds`. La opción `store` acepta una ruta de archivo (SQLite) o una cadena de conexión de PostgreSQL.

:::info
Necesitarás vincular de nuevo (escanear QR code) después del cambio. El estado de autenticación de Baileys no es compatible con las sesiones de whatsmeow.
:::

## Paso 3: Actualizar los Listeners de Eventos

### Mensajes

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

Diferencias clave:
- Un solo mensaje por evento (no en lote)
- Los metadatos del mensaje están en `info`, el contenido protobuf en `message`
- `info.isFromMe` reemplaza a `msg.key.fromMe`
- `info.chat` reemplaza a `msg.key.remoteJid`
- `info.sender` reemplaza a `msg.key.participant` (en grupos)

### Conexión

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

No necesitas lógica de reconexión manual — whatsmeow la maneja automáticamente.

## Paso 4: Actualizar el Envío de Mensajes

### Mensaje de texto

**Baileys:**
```typescript
await sock.sendMessage(jid, { text: "Hello!" });
```

**whatsmeow-node:**
```typescript
await client.sendMessage(jid, { conversation: "Hello!" });
```

### Respuesta con cita

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

### Multimedia

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

La subida y el envío de multimedia son pasos separados en whatsmeow-node. Esto te da más control (por ejemplo, subir una vez y enviar a múltiples chats).

### Reacciones

**Baileys:**
```typescript
await sock.sendMessage(jid, { react: { text: "👍", key: msg.key } });
```

**whatsmeow-node:**
```typescript
await client.sendReaction(jid, senderJid, messageId, "👍");
```

## Paso 5: Actualizar Operaciones de Grupo

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

## Referencia Rápida de la API

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

## Lista de Verificación de Migración

- [ ] Instalar `@whatsmeow-node/whatsmeow-node`, eliminar `@whiskeysockets/baileys`
- [ ] Reemplazar `makeWASocket` → `createClient`
- [ ] Eliminar `useMultiFileAuthState` — la sesión se maneja automáticamente
- [ ] Actualizar listeners de eventos (`ev.on` → `client.on`, nombres de eventos diferentes)
- [ ] Actualizar llamadas a `sendMessage` (`text` → `conversation`)
- [ ] Actualizar envío de multimedia (pasos separados de upload + envío)
- [ ] Actualizar operaciones de grupo (los nombres de métodos difieren ligeramente)
- [ ] Eliminar lógica de reconexión manual — whatsmeow se reconecta automáticamente
- [ ] Vincular de nuevo vía QR code (se requiere nueva sesión)
- [ ] Probar todos los tipos de mensaje de extremo a extremo

## Errores Comunes

:::warning Se requiere nueva sesión
El estado de autenticación de Baileys no se puede migrar. Debes vincular una nueva sesión escaneando el QR code. Tu historial de chat y contactos de WhatsApp no se ven afectados — solo el enlace del dispositivo es nuevo.
:::

:::warning `text` vs `conversation`
Baileys usa `{ text: "..." }` para mensajes. whatsmeow-node usa `{ conversation: "..." }` — coincidiendo con el nombre del campo protobuf de WhatsApp.
:::

:::warning Casing de campos proto
Los campos de respuesta de upload usan el casing exacto de protobuf: `URL`, `fileSHA256`, `fileEncSHA256` — **no** camelCase. Usar el casing incorrecto falla silenciosamente.
:::

<RelatedGuides slugs={["whatsmeow-in-node", "build-a-bot", "migrate-from-whatsapp-web-js"]} />
