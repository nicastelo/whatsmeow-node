---
title: "Como Conectar o WhatsApp ao Google Gemini"
sidebar_label: Conectar ao Gemini
sidebar_position: 14
description: "Crie um chatbot de WhatsApp com Google Gemini usando whatsmeow-node e o SDK Google GenAI. Inclui histórico de conversas e indicadores de digitação."
keywords: [conectar whatsapp gemini, bot whatsapp gemini, bot whatsapp google ai nodejs, integração gemini whatsapp, whatsapp gemini typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-gemini.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-gemini.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Conectar o WhatsApp ao Google Gemini",
      "description": "Crie um chatbot de WhatsApp com Google Gemini usando whatsmeow-node e o SDK Google GenAI. Inclui histórico de conversas e indicadores de digitação.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-gemini.png",
      "step": [
        {"@type": "HowToStep", "name": "Configurar os Dois Clients", "text": "Inicialize o WhatsmeowClient com createClient() e o Google GenAI com new GoogleGenAI()."},
        {"@type": "HowToStep", "name": "Tratar Mensagens Recebidas", "text": "Escute o evento message, ignore mensagens próprias, mostre digitação e extraia o texto."},
        {"@type": "HowToStep", "name": "Enviar para o Gemini", "text": "Chame ai.models.generateContent() com a mensagem do usuário e envie a resposta de volta via sendMessage."},
        {"@type": "HowToStep", "name": "Adicionar Histórico de Conversas", "text": "Use o recurso de chat multi-turno do Gemini para manter o contexto da conversa por usuário."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Conectar o WhatsApp ao Google Gemini",
      "description": "Crie um chatbot de WhatsApp com Google Gemini usando whatsmeow-node e o SDK Google GenAI. Inclui histórico de conversas e indicadores de digitação.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/connect-to-gemini.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Conectar o WhatsApp ao Google Gemini](/img/guides/pt-BR/connect-to-gemini.png)
![Como Conectar o WhatsApp ao Google Gemini](/img/guides/pt-BR/connect-to-gemini-light.png)

# Como Conectar o WhatsApp ao Google Gemini

Combine o whatsmeow-node com o SDK Google GenAI para criar um chatbot de WhatsApp com Gemini. As mensagens chegam pelo WhatsApp, são enviadas para o Gemini para gerar uma resposta, e a resposta volta para o usuário — com indicadores de digitação enquanto o modelo pensa.

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))
- Uma chave de API do Google AI (defina como variável de ambiente `GEMINI_API_KEY`) — obtenha uma em [ai.google.dev](https://ai.google.dev/)
- O SDK Google GenAI: `npm install @google/genai`

## Passo 1: Configurar os Dois Clients

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { GoogleGenAI } from "@google/genai";

const client = createClient({ store: "session.db" });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  const reply = await askGemini(info.sender, text);
  await client.sendMessage(info.chat, { conversation: reply });
});
```

## Passo 3: Enviar para o Gemini

```typescript
async function askGemini(userJid: string, userMessage: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userMessage,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    },
  });

  return response.text ?? "I couldn't generate a response.";
}
```

## Passo 4: Adicionar Histórico de Conversas

O Gemini suporta chat multi-turno via a API `chats.create()`. Armazene uma sessão de chat por usuário:

```typescript
import type { Chat } from "@google/genai";

const chats = new Map<string, Chat>();

function getChat(userJid: string): Chat {
  let chat = chats.get(userJid);
  if (!chat) {
    chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });
    chats.set(userJid, chat);
  }
  return chat;
}

async function askGemini(userJid: string, userMessage: string): Promise<string> {
  const chat = getChat(userJid);
  const response = await chat.sendMessage({ message: userMessage });
  return response.text ?? "I couldn't generate a response.";
}
```

## Exemplo Completo

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { GoogleGenAI } from "@google/genai";
import type { Chat } from "@google/genai";

const client = createClient({ store: "session.db" });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";

const chats = new Map<string, Chat>();

function getChat(userJid: string): Chat {
  let chat = chats.get(userJid);
  if (!chat) {
    chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });
    chats.set(userJid, chat);
  }
  return chat;
}

async function askGemini(userJid: string, userMessage: string): Promise<string> {
  const chat = getChat(userJid);
  const response = await chat.sendMessage({ message: userMessage });
  return response.text ?? "I couldn't generate a response.";
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
    const reply = await askGemini(info.sender, text);
    await client.sendMessage(info.chat, { conversation: reply });
    console.log(`→ ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error("Gemini API error:", err);
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
  console.log("Gemini bot is online!");

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
Sempre verifique `info.isFromMe` primeiro. Sem isso, o bot envia uma mensagem, vê a própria mensagem, manda para o Gemini e responde de novo — para sempre.
:::

:::warning Exposição da chave de API
Nunca coloque sua chave de API diretamente no código. Use variáveis de ambiente (`GEMINI_API_KEY`) ou um arquivo `.env` (adicionado ao `.gitignore`).
:::

:::warning Histórico de chat em memória
Os objetos `Chat` são armazenados em um `Map` e perdidos ao reiniciar. Para persistência, salve o histórico de conversas em um banco de dados e recrie os chats com a opção `history`.
:::

<RelatedGuides slugs={["connect-to-ai", "connect-to-chatgpt", "connect-to-ollama", "connect-to-deepseek"]} />
