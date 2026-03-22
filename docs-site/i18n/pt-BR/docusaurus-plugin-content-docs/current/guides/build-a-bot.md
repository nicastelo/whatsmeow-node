---
title: "Como Criar um Bot de WhatsApp com Node.js"
sidebar_label: Criar um Bot
sidebar_position: 2
description: "Crie um bot de WhatsApp com Node.js e TypeScript — receba mensagens, trate comandos, responda com citações e gerencie conexões."
keywords: [bot whatsapp nodejs, criar bot whatsapp typescript, tutorial bot whatsapp, automação whatsapp nodejs, como criar bot whatsapp]
---

import Head from '@docusaurus/Head';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/build-a-bot.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/build-a-bot.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Criar um Bot de WhatsApp com Node.js",
      "description": "Crie um bot de WhatsApp com Node.js e TypeScript — receba mensagens, trate comandos, responda com citações e gerencie conexões.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/build-a-bot.png",
      "step": [
        {"@type": "HowToStep", "name": "Criar o Client", "text": "Inicialize um WhatsmeowClient com createClient() e um store de sessão."},
        {"@type": "HowToStep", "name": "Tratar Mensagens Recebidas", "text": "Escute o evento message e extraia o texto de conversation ou extendedTextMessage."},
        {"@type": "HowToStep", "name": "Responder Mensagens", "text": "Use sendMessage para texto ou sendRawMessage com contextInfo para respostas com citação."},
        {"@type": "HowToStep", "name": "Adicionar Comandos", "text": "Roteie mensagens que começam com ! para handlers de comandos como !ping e !help."},
        {"@type": "HowToStep", "name": "Tratar Erros e Reconexão", "text": "Escute os eventos logged_out e disconnected. A reconexão automática é embutida."},
        {"@type": "HowToStep", "name": "Encerramento Gracioso", "text": "Trate o SIGINT para definir a presença como indisponível e desconectar de forma limpa."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Criar um Bot de WhatsApp com Node.js",
      "description": "Crie um bot de WhatsApp com Node.js e TypeScript — receba mensagens, trate comandos, responda com citações e gerencie conexões.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/build-a-bot.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Criar um Bot de WhatsApp com Node.js](/img/guides/pt-BR/build-a-bot.png)
![Como Criar um Bot de WhatsApp com Node.js](/img/guides/pt-BR/build-a-bot-light.png)

# Como Criar um Bot de WhatsApp com Node.js

whatsmeow-node permite criar um bot de WhatsApp totalmente funcional em menos de 60 linhas de TypeScript. O bot se conecta como um dispositivo vinculado (como o WhatsApp Web), recebe mensagens em tempo real e pode responder com texto, mídia ou mensagens estruturadas.

## Pré-requisitos

- Node.js 18+ e npm
- Uma conta WhatsApp para vincular como dispositivo
- whatsmeow-node instalado ([Guia de instalação](/docs/installation))
- Uma sessão pareada — siga o guia [Como Parear o WhatsApp](pair-whatsapp) primeiro, ou o bot vai parear na primeira execução

## Passo 1: Criar o Client

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("error", (err) => {
  console.error("Error:", err);
});
```

A opção `store` indica ao whatsmeow-node onde persistir a sessão. Passe um caminho de arquivo para SQLite (bom para desenvolvimento) ou uma string de conexão PostgreSQL para produção.

## Passo 2: Tratar Mensagens Recebidas

```typescript
client.on("message", async ({ info, message }) => {
  // Skip your own messages to avoid echo loops
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  if (!text) return;

  console.log(`${info.pushName}: ${text}`);
});
```

Cada mensagem recebida dispara o evento `"message"` com dois objetos:
- `info` — metadados (JID do remetente, JID do chat, timestamp, se é um grupo, etc.)
- `message` — o conteúdo da mensagem protobuf

:::warning
Sempre verifique `info.isFromMe` e ignore suas próprias mensagens. Sem essa verificação, seu bot vai responder às próprias mensagens em um loop infinito.
:::

## Passo 3: Responder Mensagens

```typescript
// Simple text reply
await client.sendMessage(info.chat, { conversation: "Hello!" });

// Reply with a quote (shows the original message)
await client.sendRawMessage(info.chat, {
  extendedTextMessage: {
    text: "I got your message!",
    contextInfo: {
      stanzaId: info.id,
      participant: info.sender,
      quotedMessage: { conversation: text },
    },
  },
});
```

`sendMessage` é a forma mais simples de enviar texto. Para respostas que citam a mensagem original, use `sendRawMessage` com `contextInfo`.

## Passo 4: Adicionar Comandos

Um padrão comum é rotear mensagens que começam com `!` para handlers de comandos:

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  // Mark as read
  await client.markRead([info.id], info.chat, info.sender);

  // Show typing indicator
  await client.sendChatPresence(info.chat, "composing");

  const command = text.toLowerCase().trim();

  if (command === "!ping") {
    await client.sendMessage(info.chat, { conversation: "pong" });
    return;
  }

  if (command === "!help") {
    await client.sendMessage(info.chat, {
      conversation: "Commands: !ping, !help, !whoami",
    });
    return;
  }

  if (command === "!whoami") {
    await client.sendMessage(info.chat, {
      conversation: `You are ${info.pushName}\nJID: ${info.sender}`,
    });
    return;
  }

  // Echo everything else
  await client.sendMessage(info.chat, { conversation: text });
});
```

## Passo 5: Tratar Erros e Reconexão

```typescript
// Session was permanently revoked — must re-pair
client.on("logged_out", ({ reason }) => {
  console.error(`Logged out: ${reason}`);
  client.close();
  process.exit(1);
});

// Informational — whatsmeow handles reconnection automatically
client.on("disconnected", () => {
  console.log("Disconnected, waiting for auto-reconnect...");
});
```

:::info
Você não precisa de lógica manual de reconexão. A biblioteca whatsmeow subjacente reconecta automaticamente. O evento `disconnected` é apenas informativo.
:::

## Passo 6: Encerramento Gracioso

```typescript
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await client.sendPresence("unavailable");
  await client.disconnect();
  client.close();
  process.exit(0);
});
```

Definir a presença como `"unavailable"` antes de desconectar permite que seus contatos vejam que você ficou offline imediatamente, em vez de esperar pelo timeout.

## Exemplo Completo

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
  if (!text) return;

  await client.markRead([info.id], info.chat, info.sender);
  await client.sendChatPresence(info.chat, "composing");

  const command = text.toLowerCase().trim();

  if (command === "!ping") {
    await client.sendMessage(info.chat, { conversation: "pong" });
  } else if (command === "!help") {
    await client.sendMessage(info.chat, {
      conversation: "Commands: !ping, !help, !whoami",
    });
  } else if (command === "!whoami") {
    await client.sendMessage(info.chat, {
      conversation: `You are ${info.pushName}\nJID: ${info.sender}`,
    });
  } else {
    // Echo
    await client.sendRawMessage(info.chat, {
      extendedTextMessage: {
        text: text,
        contextInfo: {
          stanzaId: info.id,
          participant: info.sender,
          quotedMessage: { conversation: text },
        },
      },
    });
  }
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.log("Not paired — scan the QR code:");
    client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
    await client.getQRChannel();
  }

  await client.connect();
  await client.sendPresence("available");
  console.log("Bot is online! Commands: !ping, !help, !whoami");

  process.on("SIGINT", async () => {
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Erros Comuns

:::warning Loops de eco
Sempre verifique `info.isFromMe` antes de processar uma mensagem. Sem isso, o bot responde às próprias respostas para sempre.
:::

:::warning Mensagens de grupo
Em grupos, `info.chat` é o JID do grupo e `info.sender` é o indivíduo que enviou a mensagem. Responda para `info.chat` para enviar ao grupo, não para `info.sender`.
:::

:::warning Rate limiting
O WhatsApp limita a taxa de envio de mensagens. Se o seu bot enviar muitas mensagens muito rapidamente, você pode ser bloqueado temporariamente. Veja [Rate Limiting](/docs/rate-limiting) para detalhes.
:::

## Próximos Passos

- [Como Conectar o WhatsApp ao Claude AI](connect-to-ai) — adicione respostas com IA
- [Como Mostrar Indicadores de Digitação](typing-indicators) — faça seu bot parecer mais humano
- [Como Enviar Stickers](send-stickers) — envie e receba stickers
- [Exemplo de Echo Bot](/docs/examples/bots-and-resilience#echo-bot) — bot de referência completo
- [Referência da API](/docs/api/overview) — todos os métodos disponíveis
