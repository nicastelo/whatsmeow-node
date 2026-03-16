---
title: Exemplos de Pareamento
sidebar_label: Pareamento
sidebar_position: 2
description: "Pareie uma conta WhatsApp com Node.js usando escaneamento de QR code ou entrada de codigo por numero de telefone via whatsmeow-node. Inclui persistencia de sessao."
keywords: [whatsapp qr code nodejs, parear dispositivo whatsapp nodejs, whatsapp dispositivos vinculados api, whatsapp pareamento por codigo]
---

# Pareamento

:::tip Procurando um tutorial passo a passo?
Veja [Como Parear o WhatsApp com Node.js](/docs/guides/pair-whatsapp).
:::

Duas formas de vincular sua conta WhatsApp: escaneamento de QR code ou entrada de codigo por numero de telefone.

## Pareamento por QR Code

O fluxo padrao — exibe um QR code no terminal para escaneamento.

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
Apos o pareamento, o exemplo aguarda 15 segundos para que a sincronizacao inicial termine antes de desconectar. Isso garante que o banco de dados da sessao esteja totalmente populado.
:::

[Codigo fonte completo: `pair.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/pair.ts)

---

## Pareamento por Numero de Telefone

Alternativa ao QR — o usuario digita um codigo de 8 digitos no WhatsApp em vez de escanear.

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
O numero de telefone e o numero da conta WhatsApp com a qual voce quer parear (o telefone que vai digitar o codigo). Remova o prefixo `+` antes de passar o numero.
:::

:::info
Diferente do pareamento por QR, o pareamento por numero de telefone requer chamar `connect()` **antes** de `pairCode()`. O codigo de pareamento expira apos 60 segundos.
:::

[Codigo fonte completo: `pair-code.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/pair-code.ts)
