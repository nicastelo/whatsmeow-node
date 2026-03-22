---
title: "Como Parear o WhatsApp com Node.js"
sidebar_label: Parear WhatsApp
sidebar_position: 6
description: "Vincule uma conta WhatsApp ao seu app Node.js usando QR code ou código por número de telefone. Inclui persistência de sessão e reconexão."
keywords: [parear whatsapp nodejs, api qr code whatsapp, vincular dispositivo whatsapp programaticamente, dispositivos vinculados whatsapp nodejs]
---

import Head from '@docusaurus/Head';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/pair-whatsapp.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/pair-whatsapp.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Parear o WhatsApp com Node.js",
      "description": "Vincule uma conta WhatsApp ao seu app Node.js usando QR code ou código por número de telefone. Inclui persistência de sessão e reconexão.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/pair-whatsapp.png",
      "step": [
        {"@type": "HowToStep", "name": "Pareamento por QR Code", "text": "Chame getQRChannel() e depois connect(). Escute o evento qr e renderize o código com qrcode-terminal."},
        {"@type": "HowToStep", "name": "Pareamento por Número de Telefone", "text": "Chame connect() primeiro, depois pairCode(phoneNumber). O usuário digita o código de 8 dígitos no WhatsApp."},
        {"@type": "HowToStep", "name": "Persistência de Sessão", "text": "A sessão é armazenada no banco de dados. Na próxima execução, init() retorna o JID armazenado e você pula o pareamento."},
        {"@type": "HowToStep", "name": "Escolher um Store", "text": "Use SQLite (session.db) para desenvolvimento ou PostgreSQL para produção."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Parear o WhatsApp com Node.js",
      "description": "Vincule uma conta WhatsApp ao seu app Node.js usando QR code ou código por número de telefone. Inclui persistência de sessão e reconexão.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/pair-whatsapp.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Parear o WhatsApp com Node.js](/img/guides/pt-BR/pair-whatsapp.png)
![Como Parear o WhatsApp com Node.js](/img/guides/pt-BR/pair-whatsapp-light.png)

# Como Parear o WhatsApp com Node.js

whatsmeow-node se conecta ao WhatsApp como um dispositivo vinculado — assim como o WhatsApp Web ou Desktop. Você pode parear usando QR code ou código por número de telefone. Uma vez pareado, a sessão é persistida e seu app reconecta automaticamente.

## Pré-requisitos

- whatsmeow-node instalado ([Guia de instalação](/docs/installation))
- Uma conta WhatsApp no seu celular

## Método 1: Pareamento por QR Code

O fluxo padrão — seu terminal exibe um QR code que você escaneia com o WhatsApp.

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

Instale o `qrcode-terminal` com `npm install qrcode-terminal`. Nenhum pacote `@types` é necessário — tipos ambientes são fornecidos.

:::info
Os QR codes expiram e são atualizados automaticamente. Se o usuário não escanear a tempo, um novo QR code é emitido pelo evento `"qr"`.
:::

## Método 2: Pareamento por Número de Telefone

Em vez de escanear um QR, o usuário digita um código de 8 dígitos no WhatsApp. Útil para servidores headless ou quando a renderização de QR no terminal não é prática.

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
`pairCode()` deve ser chamado **depois** de `connect()` — ele requer uma conexão ativa com os servidores do WhatsApp. O código expira após 60 segundos.
:::

## Persistência de Sessão

Uma vez pareado, a sessão é armazenada no banco de dados que você especificou. Na próxima execução, `init()` retorna o JID armazenado e você pode pular o fluxo de pareamento:

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

## Escolhendo um Store

| Store | URI | Melhor para |
|-------|-----|-------------|
| SQLite | `"session.db"` ou `"file:./data/session.db"` | Desenvolvimento, instância única |
| PostgreSQL | `"postgresql://user:pass@host/db"` | Produção, múltiplas instâncias |

Caminhos de arquivo simples são automaticamente normalizados para o prefixo `file:`.

## Exemplo Completo

Trata tanto o pareamento inicial quanto a reconexão:

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

## Erros Comuns

:::warning `pairCode()` antes de `connect()`
Chamar `pairCode()` antes de `connect()` vai falhar. O fluxo de pareamento por número de telefone requer uma conexão WebSocket ativa com os servidores do WhatsApp.
:::

:::warning Remova o `+` dos números de telefone
Números de telefone não devem incluir o prefixo `+`. Passe `"5512345678"`, não `"+5512345678"`.
:::

:::warning Revogação de sessão
Se o usuário desvincular o dispositivo pelo WhatsApp (Configurações → Dispositivos Vinculados → remover), o evento `"logged_out"` é disparado. A única forma de recuperação é deletar o banco de dados da sessão e parear novamente.
:::

## Próximos Passos

- [Como Criar um Bot](build-a-bot) — pareie e depois construa um bot
- [Primeiros Passos](/docs/getting-started) — visão geral rápida da API completa
- [Ciclo de Vida da Conexão](/docs/connection-lifecycle) — mergulho profundo nos estados de conexão
- [Exemplos de Pareamento](/docs/examples/pairing) — mais exemplos de código de pareamento
