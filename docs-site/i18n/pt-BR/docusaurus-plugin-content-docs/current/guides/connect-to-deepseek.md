---
title: "Como Conectar o WhatsApp ao DeepSeek"
sidebar_label: Conectar ao DeepSeek
sidebar_position: 15
description: "Crie um chatbot de WhatsApp com DeepSeek usando whatsmeow-node e o SDK da OpenAI. O DeepSeek usa uma API compatível com a OpenAI."
keywords: [conectar whatsapp deepseek, bot whatsapp deepseek, deepseek whatsapp nodejs, integração whatsapp deepseek, chatbot deepseek whatsapp]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-deepseek.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-deepseek.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Connect WhatsApp to DeepSeek",
      "description": "Build a WhatsApp chatbot powered by DeepSeek using whatsmeow-node and the OpenAI SDK. DeepSeek uses an OpenAI-compatible API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-deepseek.png",
      "step": [
        {"@type": "HowToStep", "name": "Set Up Both Clients", "text": "Initialize WhatsmeowClient with createClient() and OpenAI client pointing to DeepSeek's base URL."},
        {"@type": "HowToStep", "name": "Handle Incoming Messages", "text": "Listen for the message event, skip own messages, show typing, and extract text."},
        {"@type": "HowToStep", "name": "Send to DeepSeek", "text": "Call openai.chat.completions.create() with the deepseek-chat model and send the response back via sendMessage."},
        {"@type": "HowToStep", "name": "Add Conversation History", "text": "Store message history per user JID in a Map and pass it to DeepSeek for multi-turn conversations."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Connect WhatsApp to DeepSeek",
      "description": "Build a WhatsApp chatbot powered by DeepSeek using whatsmeow-node and the OpenAI SDK. DeepSeek uses an OpenAI-compatible API.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-deepseek.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Conectar o WhatsApp ao DeepSeek](/img/guides/pt-BR/connect-to-deepseek.png)
![Como Conectar o WhatsApp ao DeepSeek](/img/guides/pt-BR/connect-to-deepseek-light.png)

# Como Conectar o WhatsApp ao DeepSeek

O DeepSeek expõe uma API compatível com a OpenAI, então você pode usar o mesmo pacote npm `openai` — basta apontar para o endpoint do DeepSeek. Isso facilita trocar entre OpenAI, DeepSeek e outros provedores compatíveis.

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))
- Uma chave de API do DeepSeek (defina como variável de ambiente `DEEPSEEK_API_KEY`) — obtenha uma em [platform.deepseek.com](https://platform.deepseek.com/)
- O SDK da OpenAI: `npm install openai`

## Passo 1: Configurar os Dois Clients

A única diferença em relação à OpenAI é o `baseURL` e a chave de API:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import OpenAI from "openai";

const client = createClient({ store: "session.db" });
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

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

  const reply = await askDeepSeek(info.sender, text);
  await client.sendMessage(info.chat, { conversation: reply });
});
```

## Passo 3: Enviar para o DeepSeek

```typescript
async function askDeepSeek(userJid: string, userMessage: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  return response.choices[0].message.content ?? "I couldn't generate a response.";
}
```

:::info
O DeepSeek também oferece o `deepseek-reasoner` para tarefas de raciocínio complexo. Troque o nome do modelo para experimentar.
:::

## Passo 4: Adicionar Histórico de Conversas

Como o DeepSeek usa o formato compatível com a OpenAI, o padrão de histórico é idêntico:

```typescript
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const conversations = new Map<string, ChatCompletionMessageParam[]>();
const MAX_HISTORY = 20;

async function askDeepSeek(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
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
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";

const conversations = new Map<string, ChatCompletionMessageParam[]>();
const MAX_HISTORY = 20;

async function askDeepSeek(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
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
    const reply = await askDeepSeek(info.sender, text);
    await client.sendMessage(info.chat, { conversation: reply });
    console.log(`→ ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error("DeepSeek API error:", err);
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
  console.log("DeepSeek bot is online!");

  process.on("SIGINT", async () => {
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Alternando Entre Provedores

Como DeepSeek, OpenAI e vários outros provedores usam o mesmo formato de API, você pode tornar o provedor configurável:

```typescript
const openai = new OpenAI({
  baseURL: process.env.AI_BASE_URL ?? "https://api.openai.com/v1",
  apiKey: process.env.AI_API_KEY,
});

const model = process.env.AI_MODEL ?? "gpt-4o";
```

Isso funciona com qualquer provedor compatível com a OpenAI — DeepSeek, Groq, Together AI, Mistral e mais.

## Erros Comuns

:::warning Loops de eco
Sempre verifique `info.isFromMe` primeiro. Sem isso, o bot responde às próprias mensagens para sempre.
:::

:::warning Exposição da chave de API
Nunca coloque sua chave de API diretamente no código. Use variáveis de ambiente ou um arquivo `.env` (adicionado ao `.gitignore`).
:::

<RelatedGuides slugs={["connect-to-chatgpt", "connect-to-ai", "connect-to-ollama"]} />
