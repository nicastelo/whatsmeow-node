---
title: Ciclo de Vida da Conexao
sidebar_position: 4
description: "Como o whatsmeow-node gerencia conexoes com o WhatsApp — init, connect, pareamento por QR code, reconexao automatica, desconexoes e logouts."
keywords: [gerenciamento conexao whatsapp, pareamento qr code, reconexao automatica whatsapp, ciclo vida conexao whatsmeow]
---

# Ciclo de Vida da Conexao

## Fluxo

```
init() → connect() → "connected" event → operational → "disconnected" → auto-reconnect → "connected"
```

**Inicializacao normal:**

```typescript
const { jid } = await client.init();  // Opens store, returns JID if already paired
if (!jid) {
  await client.getQRChannel();        // Set up QR pairing (first time only)
}
await client.connect();               // Starts connection (returns immediately)
// Wait for "connected" event before sending messages
```

## Eventos Principais

| Evento | Significado | Acao |
|--------|-------------|------|
| `connected` | Conexao com o WhatsApp estabelecida | Seguro para enviar mensagens |
| `disconnected` | Conexao perdida | Reconexao automatica integrada, nenhuma acao necessaria |
| `logged_out` | Sessao revogada (usuario desvinculou o dispositivo) | Necessario re-parear — apague o store e recomece |
| `stream_error` | Erro de protocolo do WhatsApp | Geralmente seguido de reconexao automatica |
| `keep_alive_timeout` | Pings de keep-alive falhando | A conexao pode estar degradada |
| `keep_alive_restored` | Keep-alive recuperado | A conexao esta saudavel novamente |

## Padrao de Conexao Resiliente

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

A reconexao automatica esta sempre ativa — o whatsmeow gerencia a reconexao internamente. Voce so precisa tratar o evento `logged_out` (sessao revogada, necessario re-parear).
