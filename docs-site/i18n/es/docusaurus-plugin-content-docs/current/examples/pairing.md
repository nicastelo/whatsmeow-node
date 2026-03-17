---
title: Ejemplos de Emparejamiento
sidebar_label: Emparejamiento
sidebar_position: 2
description: "Empareja una cuenta de WhatsApp con Node.js usando escaneo de código QR o ingreso de código por número de teléfono vía whatsmeow-node. Incluye persistencia de sesión."
keywords: [whatsapp codigo qr nodejs, emparejar dispositivo whatsapp nodejs, whatsapp dispositivos vinculados api, whatsapp emparejamiento codigo telefono]
---

# Emparejamiento

:::tip Buscas un tutorial paso a paso?
Consulta [Cómo Emparejar WhatsApp con Node.js](/docs/guides/pair-whatsapp).
:::

Dos formas de vincular tu cuenta de WhatsApp: escaneo de código QR o ingreso de código por número de teléfono.

## Emparejamiento por Código QR

El flujo estándar — muestra un código QR en la terminal para escanear.

```typescript
const client = createClient({
  store: `file:${storePath}`,
  binaryPath,
});

// Listen for QR codes to display
client.on("qr", ({ code }) => {
  qrcode.generate(code, { small: true });
});

// Called when pairing succeeds
client.on("connected", ({ jid }) => {
  console.log(`Paired successfully! JID: ${jid}`);
});

async function main() {
  const result = await client.init();

  if (result.jid) {
    // Already paired — just connect
    await client.connect();
    return;
  }

  // Not paired — set up QR channel, then connect
  await client.getQRChannel();
  await client.connect();
}
```

:::info
Después del emparejamiento, el ejemplo espera 15 segundos para que la sincronización inicial termine antes de desconectarse. Esto asegura que la base de datos de sesión esté completamente poblada.
:::

[Código fuente completo: `pair.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/pair.ts)

---

## Emparejamiento por Número de Teléfono

Alternativa al QR — el usuario ingresa un código de 8 dígitos en WhatsApp en lugar de escanear.

```typescript
// Step 1: Connect first — pairCode() requires an active connection
await client.connect();

// Step 2: Request a pairing code
const code = await client.pairCode(cleanPhone);
console.log(`Pairing code: ${code}`);
// User enters this code in: WhatsApp -> Linked Devices -> Link with phone number

// Step 3: Wait for pairing to complete
client.once("connected", ({ jid }) => {
  console.log(`Paired and connected as ${jid}!`);
});
```

:::warning
El número de teléfono es el número de la cuenta de WhatsApp **con la cual** se va a emparejar (el teléfono que ingresará el código). Elimina el prefijo `+` antes de pasarlo.
:::

:::info
A diferencia del emparejamiento por QR, el emparejamiento por número de teléfono requiere llamar a `connect()` **antes** de `pairCode()`. El código de emparejamiento expira después de 60 segundos.
:::

[Código fuente completo: `pair-code.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/pair-code.ts)
