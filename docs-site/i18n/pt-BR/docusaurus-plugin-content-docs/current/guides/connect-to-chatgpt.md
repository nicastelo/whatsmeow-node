---
title: "Como Conectar o WhatsApp ao ChatGPT (OpenAI)"
sidebar_label: Conectar ao ChatGPT
sidebar_position: 13
description: "Crie um chatbot de WhatsApp com ChatGPT usando whatsmeow-node e o SDK da OpenAI. Inclui histórico de conversas, indicadores de digitação e GPT-4.1."
keywords: [conectar whatsapp chatgpt, bot whatsapp chatgpt, bot whatsapp openai nodejs, bot whatsapp gpt typescript, integração chatgpt whatsapp]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-chatgpt.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-chatgpt.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Connect WhatsApp to ChatGPT (OpenAI)",
      "description": "Build a WhatsApp chatbot powered by ChatGPT using whatsmeow-node and the OpenAI SDK. Includes conversation history, typing indicators, and GPT-4.1.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-chatgpt.png",
      "step": [
        {"@type": "HowToStep", "name": "Set Up Both Clients", "text": "Initialize WhatsmeowClient with createClient() and OpenAI client with new OpenAI()."},
        {"@type": "HowToStep", "name": "Handle Incoming Messages", "text": "Listen for the message event, skip own messages, show typing, and extract text."},
        {"@type": "HowToStep", "name": "Send to ChatGPT", "text": "Call openai.chat.completions.create() with the user message and send the response back via sendMessage."},
        {"@type": "HowToStep", "name": "Add Conversation History", "text": "Store message history per user JID in a Map and pass it to ChatGPT for multi-turn conversations."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Connect WhatsApp to ChatGPT (OpenAI)",
      "description": "Build a WhatsApp chatbot powered by ChatGPT using whatsmeow-node and the OpenAI SDK. Includes conversation history, typing indicators, and GPT-4.1.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-chatgpt.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Conectar o WhatsApp ao ChatGPT (OpenAI)](/img/guides/pt-BR/connect-to-chatgpt.png)
![Como Conectar o WhatsApp ao ChatGPT (OpenAI)](/img/guides/pt-BR/connect-to-chatgpt-light.png)

# Como Conectar o WhatsApp ao ChatGPT (OpenAI)

Combine o whatsmeow-node com o SDK da OpenAI para criar um chatbot de WhatsApp com GPT-4.1. As mensagens chegam pelo WhatsApp, são enviadas para a OpenAI para gerar uma resposta, e a resposta volta para o usuário — com indicadores de digitação enquanto o modelo pensa.

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))
- Uma chave de API da OpenAI (defina como variável de ambiente `OPENAI_API_KEY`)
- O SDK da OpenAI: `npm install openai`

## Passo 1: Configurar os Dois Clients

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import OpenAI from "openai";

const client = createClient({ store: "session.db" });
const openai = new OpenAI(); // reads OPENAI_API_KEY from env

const SYSTEM_PROMPT = "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";
```

## Passo 2: Tratar Mensagens Recebidas

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  await client.sendChatPresence(info.chat, "composing");

  const reply = await askChatGPT(info.sender, text);
  await client.sendMessage(info.chat, { conversation: reply });
});
```

## Passo 3: Enviar para o ChatGPT

```typescript
async function askChatGPT(userJid: string, userMessage: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  return response.choices[0].message.content ?? "I couldn't generate a response.";
}
```

## Passo 4: Adicionar Histórico de Conversas

Para conversas com múltiplas trocas, armazene o histórico de mensagens por usuário:

```typescript
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const conversations = new Map<string, ChatCompletionMessageParam[]>();
const MAX_HISTORY = 20;

async function askChatGPT(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const reply = response.choices[0].message.content ?? "I couldn't generate a response.";

  history.push({ role: "assistant", content: reply });
  conversations.set(userJid, history);

  return reply;
}
```

## Exemplo Completo

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const client = createClient({ store: "session.db" });
const openai = new OpenAI();

const SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";

const conversations = new Map<string, ChatCompletionMessageParam[]>();
const MAX_HISTORY = 20;

async function askChatGPT(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const reply = response.choices[0].message.content ?? "I couldn't generate a response.";

  history.push({ role: "assistant", content: reply });
  conversations.set(userJid, history);

  return reply;
}

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  console.log(`${info.pushName}: ${text}`);
  await client.sendChatPresence(info.chat, "composing");

  try {
    const reply = await askChatGPT(info.sender, text);
    await client.sendMessage(info.chat, { conversation: reply });
    console.log(`→ ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error("OpenAI API error:", err);
    await client.sendMessage(info.chat, {
      conversation: "Sorry, I'm having trouble right now. Try again in a moment.",
    });
  }
});

client.on("logged_out", ({ reason }) => {
  console.error(`Logged out: ${reason}`);
  client.close();
  process.exit(1);
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! See: How to Pair WhatsApp");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  console.log("ChatGPT bot is online!");

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
Sempre verifique `info.isFromMe` primeiro. Sem isso, o bot envia uma mensagem, vê a própria mensagem, manda para o ChatGPT e responde de novo — para sempre.
:::

:::warning Exposição da chave de API
Nunca coloque sua chave de API diretamente no código. Use variáveis de ambiente (`OPENAI_API_KEY`) ou um arquivo `.env` (adicionado ao `.gitignore`).
:::

:::warning Rate limits dos dois lados
Tanto a API da OpenAI quanto o WhatsApp têm rate limits. Para a API da OpenAI, trate erros `429` com backoff exponencial. Para o WhatsApp, evite enviar muitas mensagens muito rápido — veja [Rate Limiting](/docs/rate-limiting).
:::

<RelatedGuides slugs={["connect-to-ai", "connect-to-gemini", "connect-to-ollama", "connect-to-deepseek"]} />
