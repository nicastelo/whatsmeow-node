---
title: Ciclo de Vida de la Conexión
sidebar_label: Conexión
sidebar_position: 4
description: "Cómo whatsmeow-node gestiona las conexiones de WhatsApp — init, connect, emparejamiento QR, reconexión automática, desconexiones y logouts."
---

# Ciclo de Vida de la Conexión

## Flujo

```
init() → connect() → evento "connected" → operativo → "disconnected" → reconexión automática → "connected"
```

**Inicio normal:**

```typescript
const { jid } = await client.init();  // Opens store, returns JID if already paired
if (!jid) {
  await client.getQRChannel();        // Set up QR pairing (first time only)
}
await client.connect();               // Starts connection (returns immediately)
// Wait for "connected" event before sending messages
```

## Eventos clave

| Evento | Significado | Acción |
|--------|-------------|--------|
| `connected` | Conexión a WhatsApp establecida | Es seguro enviar mensajes |
| `disconnected` | Conexión perdida | La reconexión automática está integrada, no se requiere acción |
| `logged_out` | Sesión revocada (el usuario desvinculó el dispositivo) | Debes re-emparejar — elimina el store y comienza de nuevo |
| `stream_error` | Error de protocolo de WhatsApp | Generalmente seguido por reconexión automática |
| `keep_alive_timeout` | Los pings de keep-alive están fallando | La conexión puede estar degradada |
| `keep_alive_restored` | Keep-alive recuperado | La conexión está saludable de nuevo |

## Patrón de conexión resiliente

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("connected", ({ jid }) => {
  console.log(`Connected as ${jid}`);
});

client.on("disconnected", () => {
  console.log("Disconnected — waiting for auto-reconnect...");
});

client.on("logged_out", ({ reason }) => {
  console.error(`Logged out: ${reason}. Must re-pair.`);
  process.exit(1);
});

const { jid } = await client.init();
if (!jid) {
  await client.getQRChannel();
  client.on("qr", ({ code }) => {
    // Render QR code for pairing
  });
}
await client.connect();
```

La reconexión automática siempre está habilitada — whatsmeow maneja la reconexión internamente. Solo necesitas manejar `logged_out` (sesión revocada, debes re-emparejar).
