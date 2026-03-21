---
title: "Cómo Reemplazar whatsapp-web.js con whatsmeow-node"
sidebar_label: Migrar desde whatsapp-web.js
sidebar_position: 11
description: "Migra de whatsapp-web.js a whatsmeow-node — elimina Puppeteer, reduce la memoria de 500 MB a 20 MB y obtén una API async tipada."
keywords: [alternativa whatsapp-web.js, reemplazar whatsapp-web.js, whatsapp-web.js a whatsmeow, migración whatsapp-web.js, bot whatsapp sin puppeteer, bot whatsapp sin navegador]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/migrate-from-whatsapp-web-js.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/migrate-from-whatsapp-web-js.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Replace whatsapp-web.js with whatsmeow-node",
      "description": "Migrate from whatsapp-web.js to whatsmeow-node — drop Puppeteer, cut memory from 500 MB to 20 MB, and get a typed async API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/migrate-from-whatsapp-web-js.png",
      "step": [
        {"@type": "HowToStep", "name": "Install whatsmeow-node", "text": "Replace whatsapp-web.js and puppeteer with @whatsmeow-node/whatsmeow-node."},
        {"@type": "HowToStep", "name": "Update Client Initialization", "text": "Replace new Client() with createClient(). No LocalAuth or Puppeteer configuration needed."},
        {"@type": "HowToStep", "name": "Update Event Listeners", "text": "Replace client.on('message') callback shapes and update message property access patterns."},
        {"@type": "HowToStep", "name": "Update Message Sending", "text": "Replace client.sendMessage() with the whatsmeow-node sendMessage or sendRawMessage methods."},
        {"@type": "HowToStep", "name": "Remove Browser Dependencies", "text": "Remove Puppeteer, Chromium, and any browser-related configuration from your project."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Replace whatsapp-web.js with whatsmeow-node",
      "description": "Migrate from whatsapp-web.js to whatsmeow-node — drop Puppeteer, cut memory from 500 MB to 20 MB, and get a typed async API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/migrate-from-whatsapp-web-js.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/migrate-from-whatsapp-web-js.png"}}
    })}
  </script>
</Head>

![Cómo Reemplazar whatsapp-web.js con whatsmeow-node](/img/guides/es/migrate-from-whatsapp-web-js.png)
![Cómo Reemplazar whatsapp-web.js con whatsmeow-node](/img/guides/es/migrate-from-whatsapp-web-js-light.png)

# Cómo Reemplazar whatsapp-web.js con whatsmeow-node

[whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) ejecuta un navegador Chrome headless para automatizar WhatsApp Web. Funciona, pero es pesado — 200-500 MB de RAM solo para el navegador, arranque lento, y se rompe cuando WhatsApp actualiza su cliente web. whatsmeow-node usa el protocolo nativo multi-dispositivo directamente, sin necesidad de navegador.

## ¿Por Qué Migrar?

| | whatsapp-web.js | whatsmeow-node |
|---|---|---|
| **Memoria** | 200-500 MB (Chromium) | ~10-20 MB |
| **Arranque** | 5-15 segundos (lanzamiento del navegador) | Menos de 1 segundo |
| **Dependencias** | Puppeteer + Chromium | Un solo binario Go (incluido) |
| **Protocolo** | Automatización del cliente web | Multi-dispositivo nativo |
| **Estabilidad** | Se rompe con actualizaciones de WhatsApp Web | Upstream estable (whatsmeow) |
| **Imagen Docker** | ~1 GB+ (necesita Chrome) | ~50 MB |
| **TypeScript** | Types de la comunidad | TypeScript nativo |

## Paso 1: Instalar

```bash
# Remove whatsapp-web.js and Puppeteer
npm uninstall whatsapp-web.js puppeteer

# Install whatsmeow-node
npm install @whatsmeow-node/whatsmeow-node
```

También puedes eliminar cualquier dependencia relacionada con Chromium o capas de Docker.

## Paso 2: Actualizar la Inicialización del Cliente

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

Sin configuración de Puppeteer, sin estrategia de autenticación, sin `initialize()` — solo `init()` + `connect()`.

## Paso 3: Actualizar los Listeners de Eventos

### Mensajes

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

Diferencias clave:
- Sin atajo `msg.body` — el texto se extrae del mensaje protobuf
- Sin `msg.reply()` — usa `sendMessage()` o `sendRawMessage()` con `contextInfo` para citas
- `msg.from` → `info.chat`, `msg.fromMe` → `info.isFromMe`

### Eventos de conexión

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

## Paso 4: Actualizar el Envío de Mensajes

### Texto

**whatsapp-web.js:**
```javascript
await client.sendMessage(chatId, "Hello!");
```

**whatsmeow-node:**
```typescript
await client.sendMessage(jid, { conversation: "Hello!" });
```

### Respuesta con cita

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

### Multimedia

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

### Reacciones

**whatsapp-web.js:**
```javascript
await msg.react("👍");
```

**whatsmeow-node:**
```typescript
await client.sendReaction(chat, sender, messageId, "👍");
```

## Paso 5: Actualizar Operaciones de Grupo

| whatsapp-web.js | whatsmeow-node |
|-----------------|----------------|
| `client.createGroup(name, members)` | `client.createGroup(name, members)` |
| `chat.fetchMessages()` | — (usa el evento message) |
| `groupChat.addParticipants([id])` | `client.updateGroupParticipants(jid, [id], "add")` |
| `groupChat.removeParticipants([id])` | `client.updateGroupParticipants(jid, [id], "remove")` |
| `groupChat.promoteParticipants([id])` | `client.updateGroupParticipants(jid, [id], "promote")` |
| `groupChat.setSubject(name)` | `client.setGroupName(jid, name)` |
| `groupChat.setDescription(desc)` | `client.setGroupDescription(jid, desc)` |
| `groupChat.leave()` | `client.leaveGroup(jid)` |
| `groupChat.getInviteCode()` | `client.getGroupInviteLink(jid)` |

## Paso 6: Limpiar

Después de migrar, puedes eliminar de tu proyecto:

- Dependencia de `puppeteer` / `puppeteer-core`
- Scripts de descarga de Chromium o capas de Docker
- Directorio `.wwebjs_auth/` (datos de sesión de LocalAuth)
- Cualquier configuración de flags de Chrome como `--no-sandbox`, `--disable-gpu`
- Configuración de CI/CD específica del navegador (Xvfb, etc.)

Tus imágenes Docker se reducirán drásticamente sin Chromium.

## Diferencias en el Formato de JID

whatsapp-web.js usa `number@c.us` para contactos. whatsmeow-node usa `number@s.whatsapp.net`:

```typescript
// whatsapp-web.js
const chatId = "5512345678@c.us";

// whatsmeow-node
const jid = "5512345678@s.whatsapp.net";
```

Los JID de grupos mantienen el mismo formato: `120363XXXXX@g.us`.

## Lista de Verificación de Migración

- [ ] Instalar `@whatsmeow-node/whatsmeow-node`, eliminar `whatsapp-web.js` y `puppeteer`
- [ ] Reemplazar `new Client()` → `createClient()`
- [ ] Eliminar configuración de Puppeteer y `LocalAuth`
- [ ] Actualizar listeners de eventos (nombres y formas de eventos diferentes)
- [ ] Reemplazar `msg.body` con extracción del mensaje protobuf
- [ ] Reemplazar `msg.reply()` con `sendMessage()` / `sendRawMessage()`
- [ ] Reemplazar `client.sendMessage(id, text)` con `sendMessage(jid, { conversation: text })`
- [ ] Actualizar formato de JID: `@c.us` → `@s.whatsapp.net`
- [ ] Actualizar envío de multimedia (upload + envío separados)
- [ ] Eliminar Chromium de Docker / CI
- [ ] Vincular de nuevo vía QR code
- [ ] Probar todos los tipos de mensaje de extremo a extremo

## Errores Comunes

:::warning Se requiere nueva sesión
Las sesiones de whatsapp-web.js no se pueden migrar. Debes vincular de nuevo escaneando el QR code. Tus datos de WhatsApp no se ven afectados.
:::

:::warning Sin `msg.body`
whatsapp-web.js te da `msg.body` como conveniencia. whatsmeow-node te da el protobuf crudo, así que el texto puede estar en `message.conversation` o `message.extendedTextMessage.text`. Siempre verifica ambos.
:::

:::warning Formato de JID
whatsapp-web.js usa `@c.us` para contactos. whatsmeow-node usa `@s.whatsapp.net`. Si tienes JID almacenados, actualízalos.
:::

<RelatedGuides slugs={["whatsmeow-in-node", "build-a-bot", "migrate-from-baileys"]} />
