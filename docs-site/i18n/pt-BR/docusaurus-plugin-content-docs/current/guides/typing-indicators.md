---
title: "Como Mostrar Indicadores de Digitação no WhatsApp"
sidebar_label: Digitação
sidebar_position: 5
description: "Mostre indicadores de digitação e gravação no WhatsApp com Node.js — controle o estado de composição, presença online e inscreva-se na digitação de outros."
keywords: [indicador digitação bot whatsapp, mostrar digitando whatsapp api, status composição whatsapp nodejs, api presença whatsapp typescript]
---

import Head from '@docusaurus/Head';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/typing-indicators.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/typing-indicators.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Mostrar Indicadores de Digitação no WhatsApp",
      "description": "Mostre indicadores de digitação e gravação no WhatsApp com Node.js — controle o estado de composição, presença online e inscreva-se na digitação de outros.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/typing-indicators.png",
      "step": [
        {"@type": "HowToStep", "name": "Mostrar digitando...", "text": "Chame sendChatPresence(chatJid, 'composing') para mostrar o indicador de digitação."},
        {"@type": "HowToStep", "name": "Mostrar gravando áudio...", "text": "Chame sendChatPresence(chatJid, 'composing', 'audio') para o indicador de gravação."},
        {"@type": "HowToStep", "name": "Limpar o Indicador", "text": "Chame sendChatPresence(chatJid, 'paused') para parar o indicador sem enviar uma mensagem."},
        {"@type": "HowToStep", "name": "Definir Status Online/Offline", "text": "Chame sendPresence('available') antes de usar indicadores de digitação, e 'unavailable' ao encerrar."},
        {"@type": "HowToStep", "name": "Inscrever-se na Digitação de Outros", "text": "Chame subscribePresence(jid) e escute os eventos presence e chat_presence."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Mostrar Indicadores de Digitação no WhatsApp",
      "description": "Mostre indicadores de digitação e gravação no WhatsApp com Node.js — controle o estado de composição, presença online e inscreva-se na digitação de outros.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/typing-indicators.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Mostrar Indicadores de Digitação no WhatsApp](/img/guides/pt-BR/typing-indicators.png)
![Como Mostrar Indicadores de Digitação no WhatsApp](/img/guides/pt-BR/typing-indicators-light.png)

# Como Mostrar Indicadores de Digitação no WhatsApp

Os indicadores de digitação do WhatsApp ("digitando..." e "gravando áudio...") fazem os bots parecerem mais naturais. whatsmeow-node dá controle total sobre esses indicadores com `sendChatPresence()`.

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))

## Passo 1: Mostrar "digitando..."

```typescript
await client.sendChatPresence(chatJid, "composing");
```

Isso mostra o indicador "digitando..." no chat especificado. O indicador é limpo automaticamente quando você envia uma mensagem.

## Passo 2: Mostrar "gravando áudio..."

```typescript
await client.sendChatPresence(chatJid, "composing", "audio");
```

O terceiro parâmetro `"audio"` muda o indicador de "digitando..." para "gravando áudio...".

## Passo 3: Limpar o Indicador

```typescript
await client.sendChatPresence(chatJid, "paused");
```

Use `"paused"` para limpar explicitamente o indicador sem enviar uma mensagem. Isso é útil quando o bot decide não responder.

:::info
O indicador é limpo automaticamente quando você envia uma mensagem. Você só precisa do `"paused"` para parar o indicador sem enviar nada.
:::

## Passo 4: Simular Digitação Realista

Indicadores instantâneos parecem robóticos. Adicione um delay proporcional ao tamanho da mensagem:

```typescript
async function typeAndSend(
  chatJid: string,
  text: string,
): Promise<void> {
  await client.sendChatPresence(chatJid, "composing");

  // ~50ms per character, clamped between 500ms and 3s
  const delay = Math.min(3000, Math.max(500, text.length * 50));
  await new Promise((resolve) => setTimeout(resolve, delay));

  await client.sendMessage(chatJid, { conversation: text });
}
```

## Passo 5: Definir Status Online/Offline

Antes que os indicadores de digitação funcionem, seu bot precisa estar online:

```typescript
// Set online — required for typing indicators to show
await client.sendPresence("available");

// Set offline when shutting down
await client.sendPresence("unavailable");
```

## Passo 6: Inscrever-se na Digitação de Outros

Você também pode observar quando outros usuários estão digitando:

```typescript
// Subscribe to a user's online/offline presence
await client.subscribePresence(userJid);

// Online/offline changes
client.on("presence", ({ jid, presence, lastSeen }) => {
  console.log(`${jid}: ${presence}`);
});

// Typing/recording changes
client.on("chat_presence", ({ chat, sender, state, media }) => {
  const action =
    state === "composing"
      ? media === "audio" ? "recording audio" : "typing"
      : "stopped typing";
  console.log(`${sender} is ${action} in ${chat}`);
});
```

## Exemplo Completo

Um bot que mostra digitação antes de cada resposta:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  // Mark as read
  await client.markRead([info.id], info.chat, info.sender);

  // Show typing
  await client.sendChatPresence(info.chat, "composing");

  // Simulate typing delay based on reply length
  const reply = `You said: ${text}`;
  const delay = Math.min(3000, Math.max(500, reply.length * 50));
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Send — indicator clears automatically
  await client.sendMessage(info.chat, { conversation: reply });
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! See: How to Pair WhatsApp");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  console.log("Bot is online with typing indicators!");

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

:::warning Defina a presença online primeiro
Os indicadores de digitação podem não aparecer se você não chamou `sendPresence("available")` antes. Sempre defina seu status online após conectar.
:::

:::warning Indicadores instantâneos parecem robóticos
Mostrar "digitando..." e responder instantaneamente (em menos de 100ms) parece artificial. Adicione um delay curto proporcional ao tamanho da resposta para simular digitação real.
:::

## Próximos Passos

- [Como Criar um Bot](build-a-bot) — adicione digitação a um bot completo
- [Como Conectar ao Claude AI](connect-to-ai) — indicadores de digitação enquanto aguarda respostas da IA
- [Exemplos de Presença e Status](/docs/examples/presence-and-status) — configurações de privacidade, mensagens temporárias e mais
