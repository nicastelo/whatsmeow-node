---
title: "Cómo Usar whatsmeow en Node.js"
sidebar_label: whatsmeow en Node.js
sidebar_position: 8
description: "Usa whatsmeow desde Node.js y TypeScript — instala el paquete npm, conéctate a WhatsApp, envía mensajes y maneja eventos sin escribir Go."
keywords: [whatsmeow nodejs, whatsmeow node, whatsmeow typescript, whatsmeow npm, usar whatsmeow en javascript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/whatsmeow-in-node.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/whatsmeow-in-node.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Usar whatsmeow en Node.js",
      "description": "Usa whatsmeow desde Node.js y TypeScript — instala el paquete npm, conéctate a WhatsApp, envía mensajes y maneja eventos sin escribir Go.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/whatsmeow-in-node.png",
      "step": [
        {"@type": "HowToStep", "name": "Instalar whatsmeow-node", "text": "Ejecuta npm install @whatsmeow-node/whatsmeow-node para obtener el binario Go precompilado y el wrapper de TypeScript."},
        {"@type": "HowToStep", "name": "Crear un cliente", "text": "Usa createClient() con una ruta de almacén. El binario Go se lanza y gestiona automáticamente."},
        {"@type": "HowToStep", "name": "Conectar a WhatsApp", "text": "Llama a init() para verificar si hay una sesión existente, luego connect(). Vincula vía QR code en la primera ejecución."},
        {"@type": "HowToStep", "name": "Enviar mensajes y manejar eventos", "text": "Usa métodos async tipados como sendMessage() y escucha eventos como message, connected y group:info."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Usar whatsmeow en Node.js",
      "description": "Usa whatsmeow desde Node.js y TypeScript — instala el paquete npm, conéctate a WhatsApp, envía mensajes y maneja eventos sin escribir Go.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/whatsmeow-in-node.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/whatsmeow-in-node.png"}}
    })}
  </script>
</Head>

![Cómo Usar whatsmeow en Node.js](/img/guides/es/whatsmeow-in-node.png)
![Cómo Usar whatsmeow en Node.js](/img/guides/es/whatsmeow-in-node-light.png)

# Cómo Usar whatsmeow en Node.js

[whatsmeow](https://github.com/tulir/whatsmeow) es la biblioteca Go más probada en batalla para el protocolo multi-dispositivo de WhatsApp — es el motor del [puente Mautrix WhatsApp](https://github.com/mautrix/whatsapp) usado por miles de servidores Matrix 24/7. whatsmeow-node la trae a Node.js con métodos async tipados y una API basada en eventos, sin necesidad de configurar Go.

## Cómo Funciona

whatsmeow-node incluye un binario Go precompilado para tu plataforma (macOS, Linux, Windows). Cuando llamas a `createClient()`, lanza ese binario y se comunica por IPC JSON-line a través de stdin/stdout:

```
Node.js (TypeScript) → stdin JSON → Go binary (whatsmeow) → WhatsApp
                     ← stdout JSON ←
```

Nunca interactúas con el binario directamente. Cada método de whatsmeow está expuesto como una función async tipada en el cliente.

## Paso 1: Instalar

```bash
npm install @whatsmeow-node/whatsmeow-node
```

El binario correcto para tu SO y arquitectura se instala automáticamente como dependencia opcional.

:::info
Plataformas soportadas: macOS (arm64, x64), Linux (arm64, x64), Windows (x64). Consulta [Instalación](/docs/installation) para más detalles.
:::

## Paso 2: Crear un Cliente

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("error", (err) => {
  console.error("Error:", err);
});
```

`store` es donde whatsmeow persiste la sesión. Usa una ruta de archivo para SQLite (desarrollo) o una URI de PostgreSQL para producción.

## Paso 3: Conectar a WhatsApp

```typescript
import qrcode from "qrcode-terminal";

async function main() {
  const { jid } = await client.init();

  if (jid) {
    // Ya está vinculado — reconectar
    console.log(`Resuming session for ${jid}`);
    await client.connect();
  } else {
    // Primera ejecución — vincular vía QR code
    client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
    await client.getQRChannel();
    await client.connect();
  }
}

main().catch(console.error);
```

Después de escanear el QR code una vez, la sesión se almacena y las ejecuciones siguientes van directo a `connect()`.

## Paso 4: Enviar Mensajes y Manejar Eventos

```typescript
// Send a text message
const jid = "5512345678@s.whatsapp.net";
await client.sendMessage(jid, { conversation: "Hello from whatsmeow!" });

// Listen for incoming messages
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  if (text) {
    console.log(`${info.pushName}: ${text}`);
  }
});

// Listen for group events
client.on("group:info", (event) => {
  if (event.join) console.log(`${event.join.join(", ")} joined ${event.jid}`);
});
```

## Qué Está Disponible

whatsmeow-node envuelve más de 100 métodos de whatsmeow. Las áreas principales:

| Categoría | Métodos |
|----------|---------|
| **Mensajería** | `sendMessage`, `sendRawMessage`, `editMessage`, `revokeMessage`, `sendReaction`, `markRead` |
| **Multimedia** | `uploadMedia`, `downloadAny`, `downloadMedia` |
| **Grupos** | `createGroup`, `getJoinedGroups`, `getGroupInfo`, `updateGroupParticipants`, `setGroupAnnounce` |
| **Presencia** | `sendPresence`, `sendChatPresence`, `subscribePresence` |
| **Privacidad** | `getPrivacySettings`, `setPrivacySetting`, `getBlocklist`, `updateBlocklist` |
| **Encuestas** | `sendPollCreation`, `sendPollVote` |
| **Canales** | `createNewsletter`, `getSubscribedNewsletters`, `followNewsletter` |

Consulta la [Referencia de la API](/docs/api/overview) para la lista completa.

## Ejemplo Completo

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import qrcode from "qrcode-terminal";

const client = createClient({ store: "session.db" });

client.on("error", (err) => console.error("Error:", err));
client.on("logged_out", ({ reason }) => {
  console.error(`Logged out: ${reason}`);
  client.close();
  process.exit(1);
});

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  if (text) {
    console.log(`${info.pushName}: ${text}`);
    await client.markRead([info.id], info.chat, info.sender);
  }
});

async function main() {
  const { jid } = await client.init();

  if (jid) {
    await client.connect();
    console.log(`Connected as ${jid}`);
  } else {
    client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
    await client.getQRChannel();
    await client.connect();
  }

  await client.sendPresence("available");

  process.on("SIGINT", async () => {
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Errores Comunes

:::warning No necesitas instalar Go
No necesitas instalar Go. El binario precompilado viene incluido en el paquete npm. Si estás intentando compilar whatsmeow por tu cuenta, estás complicando las cosas — solo usa `npm install`.
:::

:::warning Formato de JID
Los JID de WhatsApp se ven como `5512345678@s.whatsapp.net` (individual) o `120363XXXXX@g.us` (grupo). No incluyas el prefijo `+`.
:::

:::warning Gestión de sesión
La base de datos de sesión contiene claves de cifrado. Si la eliminas, tendrás que vincular de nuevo. En producción, haz respaldo o usa PostgreSQL.
:::

<RelatedGuides slugs={["pair-whatsapp", "build-a-bot", "send-messages-typescript", "migrate-from-baileys"]} />
