---
title: "Como Conectar o WhatsApp ao Ollama (IA Local)"
sidebar_label: Conectar ao Ollama
sidebar_position: 16
description: "Crie um chatbot de WhatsApp com IA local usando whatsmeow-node e Ollama. Sem chave de API — roda inteiramente na sua máquina."
keywords: [conectar whatsapp ollama, bot whatsapp ia local, bot whatsapp ollama nodejs, bot whatsapp llama, whatsapp llm local, whatsapp ia self hosted]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-ollama.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-ollama.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Connect WhatsApp to Ollama (Local AI)",
      "description": "Build a WhatsApp chatbot powered by a local AI model using whatsmeow-node and Ollama. No API key needed — runs entirely on your machine.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-ollama.png",
      "step": [
        {"@type": "HowToStep", "name": "Install Ollama and Pull a Model", "text": "Install Ollama from ollama.com and pull a model like llama3.2 or gemma3."},
        {"@type": "HowToStep", "name": "Set Up Both Clients", "text": "Initialize WhatsmeowClient with createClient() and Ollama client with new Ollama()."},
        {"@type": "HowToStep", "name": "Handle Incoming Messages", "text": "Listen for the message event, skip own messages, show typing, and extract text."},
        {"@type": "HowToStep", "name": "Send to Ollama", "text": "Call ollama.chat() with the user message and send the response back via sendMessage."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Connect WhatsApp to Ollama (Local AI)",
      "description": "Build a WhatsApp chatbot powered by a local AI model using whatsmeow-node and Ollama. No API key needed — runs entirely on your machine.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-ollama.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Conectar o WhatsApp ao Ollama (IA Local)](/img/guides/pt-BR/connect-to-ollama.png)
![Como Conectar o WhatsApp ao Ollama (IA Local)](/img/guides/pt-BR/connect-to-ollama-light.png)

# Como Conectar o WhatsApp ao Ollama (IA Local)

Rode seu chatbot de WhatsApp inteiramente na sua própria máquina — sem chaves de API, sem custos de nuvem, sem dados saindo da sua rede. O Ollama facilita rodar modelos open-source como Llama, Gemma e Mistral localmente.

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))
- [Ollama](https://ollama.com/) instalado e rodando
- Um modelo baixado: `ollama pull llama3.2`
- O SDK do Ollama: `npm install ollama`

## Passo 1: Baixar um Modelo

```bash
# Install Ollama from https://ollama.com, then:
ollama pull llama3.2
```

Outras boas opções para chat:
- `gemma3` — modelo aberto do Google, rápido e capaz
- `mistral` — forte para o seu tamanho
- `llama3.2:1b` — menor Llama, respostas mais rápidas

## Passo 2: Configurar os Dois Clients

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { Ollama } from "ollama";

const client = createClient({ store: "session.db" });
const ollama = new Ollama({ host: "http://localhost:11434" });

const MODEL = "llama3.2";
const SYSTEM_PROMPT = "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";
```

## Passo 3: Tratar Mensagens Recebidas

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  await client.sendChatPresence(info.chat, "composing");

  const reply = await askOllama(info.sender, text);
  await client.sendMessage(info.chat, { conversation: reply });
});
```

## Passo 4: Enviar para o Ollama

```typescript
async function askOllama(userJid: string, userMessage: string): Promise<string> {
  const response = await ollama.chat({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  return response.message.content;
}
```

## Passo 5: Adicionar Histórico de Conversas

```typescript
import type { Message } from "ollama";

const conversations = new Map<string, Message[]>();
const MAX_HISTORY = 20;

async function askOllama(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const reply = response.message.content;
  history.push({ role: "assistant", content: reply });
  conversations.set(userJid, history);

  return reply;
}
```

## Exemplo Completo

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { Ollama } from "ollama";
import type { Message } from "ollama";

const client = createClient({ store: "session.db" });
const ollama = new Ollama({ host: "http://localhost:11434" });

const MODEL = "llama3.2";
const SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";

const conversations = new Map<string, Message[]>();
const MAX_HISTORY = 20;

async function askOllama(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const reply = response.message.content;
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
    const reply = await askOllama(info.sender, text);
    await client.sendMessage(info.chat, { conversation: reply });
    console.log(`→ ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error("Ollama error:", err);
    await client.sendMessage(info.chat, {
      conversation: "Sorry, I'm having trouble right now. Make sure Ollama is running.",
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
  console.log(`Ollama bot is online! (model: ${MODEL})`);

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

:::warning O Ollama precisa estar rodando
Certifique-se de que o servidor do Ollama está rodando (`ollama serve`) antes de iniciar o bot. Se não estiver rodando, todas as requisições vão falhar.
:::

:::warning Tempo de resposta depende do hardware
Modelos locais rodam na sua CPU/GPU. Modelos menores como `llama3.2:1b` respondem em 1-3 segundos em hardware moderno. Modelos maiores podem levar 10+ segundos — o indicador de digitação mantém o usuário informado enquanto espera.
:::

:::warning Loops de eco
Sempre verifique `info.isFromMe` primeiro. Sem isso, o bot responde às próprias mensagens para sempre.
:::

:::warning O modelo precisa ser baixado antes
Execute `ollama pull llama3.2` antes de iniciar o bot. Se o modelo não estiver baixado, as requisições vão falhar.
:::

<RelatedGuides slugs={["connect-to-ai", "connect-to-chatgpt", "connect-to-gemini", "connect-to-deepseek"]} />
