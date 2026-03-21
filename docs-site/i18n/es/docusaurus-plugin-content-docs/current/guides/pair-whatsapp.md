---
title: "Cómo Vincular WhatsApp con Node.js"
sidebar_label: Vincular WhatsApp
sidebar_position: 6
description: "Vincula una cuenta de WhatsApp a tu aplicación Node.js usando escaneo de QR code o ingreso de código por número telefónico. Incluye persistencia de sesión y reconexión."
keywords: [vincular whatsapp nodejs, api qr code whatsapp, vincular dispositivo whatsapp programáticamente, dispositivos vinculados whatsapp nodejs]
---

import Head from '@docusaurus/Head';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/pair-whatsapp.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/pair-whatsapp.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Vincular WhatsApp con Node.js",
      "description": "Vincula una cuenta de WhatsApp a tu aplicación Node.js usando escaneo de QR code o ingreso de código por número telefónico. Incluye persistencia de sesión y reconexión.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/pair-whatsapp.png",
      "step": [
        {"@type": "HowToStep", "name": "Vinculación por QR Code", "text": "Llama a getQRChannel() y luego connect(). Escucha el evento qr y muestra el código con qrcode-terminal."},
        {"@type": "HowToStep", "name": "Vinculación por número telefónico", "text": "Llama primero a connect(), luego a pairCode(phoneNumber). El usuario ingresa el código de 8 dígitos en WhatsApp."},
        {"@type": "HowToStep", "name": "Persistencia de sesión", "text": "La sesión se almacena en la base de datos. En la siguiente ejecución, init() devuelve el JID almacenado y omites la vinculación."},
        {"@type": "HowToStep", "name": "Elegir un almacén", "text": "Usa SQLite (session.db) para desarrollo o PostgreSQL para producción."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Vincular WhatsApp con Node.js",
      "description": "Vincula una cuenta de WhatsApp a tu aplicación Node.js usando escaneo de QR code o ingreso de código por número telefónico. Incluye persistencia de sesión y reconexión.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/pair-whatsapp.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Vincular WhatsApp con Node.js](/img/guides/es/pair-whatsapp.png)
![Cómo Vincular WhatsApp con Node.js](/img/guides/es/pair-whatsapp-light.png)

# Cómo Vincular WhatsApp con Node.js

whatsmeow-node se conecta a WhatsApp como un dispositivo vinculado — igual que WhatsApp Web o Desktop. Puedes vincular usando un QR code o un código de número telefónico. Una vez vinculado, la sesión se persiste y tu aplicación se reconecta automáticamente.

## Requisitos Previos

- whatsmeow-node instalado ([Guía de instalación](/docs/installation))
- Una cuenta de WhatsApp en tu teléfono

## Método 1: Vinculación por QR Code

El flujo estándar — tu terminal muestra un QR code que escaneas con WhatsApp.

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import qrcode from "qrcode-terminal";

const client = createClient({ store: "session.db" });

// Display QR codes in the terminal
client.on("qr", ({ code }) => {
  qrcode.generate(code, { small: true });
});

client.on("connected", ({ jid }) => {
  console.log(`Paired and connected as ${jid}!`);
});

async function main() {
  const { jid } = await client.init();

  if (jid) {
    // Already paired — just connect
    console.log(`Session found for ${jid}`);
    await client.connect();
    return;
  }

  // Not paired — set up QR channel first
  await client.getQRChannel();
  await client.connect();
}

main().catch(console.error);
```

Instala `qrcode-terminal` con `npm install qrcode-terminal`. No se necesita paquete `@types` — se proporcionan tipos ambientales.

:::info
Los QR codes expiran y se actualizan automáticamente. Si el usuario no escanea a tiempo, se emite un nuevo QR code a través del evento `"qr"`.
:::

## Método 2: Vinculación por Número Telefónico

En lugar de escanear un QR, el usuario ingresa un código de 8 dígitos en WhatsApp. Útil para servidores sin pantalla o cuando la visualización de QR en terminal no es práctica.

```typescript
const client = createClient({ store: "session.db" });

async function main() {
  const { jid } = await client.init();

  if (jid) {
    await client.connect();
    return;
  }

  // Step 1: Connect first — pairCode() requires an active connection
  await client.connect();

  // Step 2: Request a pairing code
  const phoneNumber = "5512345678"; // without the + prefix
  const code = await client.pairCode(phoneNumber);
  console.log(`Pairing code: ${code}`);
  console.log("Enter this in: WhatsApp → Linked Devices → Link with phone number");

  // Step 3: Wait for the user to enter the code
  client.once("connected", ({ jid }) => {
    console.log(`Paired as ${jid}!`);
  });
}

main().catch(console.error);
```

:::warning
`pairCode()` debe llamarse **después** de `connect()` — requiere una conexión activa a los servidores de WhatsApp. El código expira después de 60 segundos.
:::

## Persistencia de Sesión

Una vez vinculado, la sesión se almacena en la base de datos que especificaste. En la siguiente ejecución, `init()` devuelve el JID almacenado y puedes omitir el flujo de vinculación:

```typescript
const { jid } = await client.init();
if (jid) {
  // Already paired — connect directly
  await client.connect();
} else {
  // First run — pair first
  await client.getQRChannel();
  await client.connect();
}
```

## Elegir un Almacén

| Almacén | URI | Ideal para |
|---------|-----|------------|
| SQLite | `"session.db"` o `"file:./data/session.db"` | Desarrollo, instancia única |
| PostgreSQL | `"postgresql://user:pass@host/db"` | Producción, múltiples instancias |

Las rutas de archivo simples se normalizan automáticamente con el prefijo `file:`.

## Ejemplo Completo

Maneja tanto la vinculación inicial como la reconexión:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import qrcode from "qrcode-terminal";

const client = createClient({ store: "session.db" });

client.on("qr", ({ code }) => {
  qrcode.generate(code, { small: true });
});

client.on("connected", ({ jid }) => {
  console.log(`Connected as ${jid}`);
});

client.on("logged_out", ({ reason }) => {
  console.error(`Session revoked: ${reason} — delete session.db and re-pair`);
  client.close();
  process.exit(1);
});

async function main() {
  const { jid } = await client.init();

  if (jid) {
    console.log(`Resuming session for ${jid}`);
    await client.connect();
  } else {
    console.log("No session found — pairing...");
    await client.getQRChannel();
    await client.connect();
  }

  process.on("SIGINT", async () => {
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Errores Comunes

:::warning `pairCode()` antes de `connect()`
Llamar a `pairCode()` antes de `connect()` fallará. El flujo de vinculación por número telefónico requiere una conexión WebSocket activa a los servidores de WhatsApp.
:::

:::warning Elimina el `+` de los números telefónicos
Los números telefónicos no deben incluir el prefijo `+`. Pasa `"5512345678"`, no `"+5512345678"`.
:::

:::warning Revocación de sesión
Si el usuario desvincula el dispositivo desde WhatsApp (Configuración → Dispositivos vinculados → eliminar), se dispara el evento `"logged_out"`. La única recuperación es eliminar la base de datos de sesión y vincular nuevamente.
:::

## Siguientes Pasos

- [Cómo Crear un Bot](build-a-bot) — vincula y luego construye un bot
- [Primeros Pasos](/docs/getting-started) — resumen rápido de la API completa
- [Ciclo de Vida de Conexión](/docs/connection-lifecycle) — profundización en los estados de conexión
- [Ejemplos de Vinculación](/docs/examples/pairing) — más ejemplos de código de vinculación
