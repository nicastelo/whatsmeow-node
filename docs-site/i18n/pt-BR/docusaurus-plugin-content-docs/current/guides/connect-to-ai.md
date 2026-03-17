---
title: "Como Conectar o WhatsApp ao Claude AI"
sidebar_label: Conectar à IA
sidebar_position: 7
description: "Crie um chatbot de WhatsApp com IA conectando whatsmeow-node ao Claude via Anthropic SDK. Inclui histórico de conversa e indicadores de digitação."
keywords: [conectar whatsapp claude, bot ia whatsapp, integração claude whatsapp, chatbot ia whatsapp nodejs, como criar bot ia whatsapp]
---

# Como Conectar o WhatsApp ao Claude AI

Combine whatsmeow-node com o Anthropic SDK para criar um chatbot de WhatsApp alimentado pelo Claude. As mensagens chegam via WhatsApp, são enviadas ao Claude para obter uma resposta, e a resposta volta para o usuário — com indicadores de digitação enquanto o Claude pensa.

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))
- Uma chave de API da Anthropic (definida como variável de ambiente `ANTHROPIC_API_KEY`)
- O Anthropic SDK: `npm install @anthropic-ai/sdk`

## Passo 1: Configurar Ambos os Clients

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import Anthropic from "@anthropic-ai/sdk";

const client = createClient({ store: "session.db" });
const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const SYSTEM_PROMPT = "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";
```

## Passo 2: Tratar Mensagens Recebidas

```typescript
client.on("message", async ({ info, message }) => {
  // Skip own messages to avoid loops
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  // Show typing while Claude thinks
  await client.sendChatPresence(info.chat, "composing");

  // Get response from Claude
  const reply = await askClaude(info.sender, text);

  // Send the reply
  await client.sendMessage(info.chat, { conversation: reply });
});
```

## Passo 3: Enviar para o Claude

```typescript
async function askClaude(userJid: string, userMessage: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "I couldn't generate a response.";
}
```

## Passo 4: Adicionar Histórico de Conversa

Para conversas com múltiplas trocas, armazene o histórico de mensagens por usuário:

```typescript
type Message = { role: "user" | "assistant"; content: string };
const conversations = new Map<string, Message[]>();
const MAX_HISTORY = 20;

async function askClaude(userJid: string, userMessage: string): Promise<string> {
  // Get or create conversation history
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  // Trim to last N messages to control token usage
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  const block = response.content[0];
  const reply = block.type === "text" ? block.text : "I couldn't generate a response.";

  // Store the assistant's reply
  history.push({ role: "assistant", content: reply });
  conversations.set(userJid, history);

  return reply;
}
```

## Exemplo Completo

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import Anthropic from "@anthropic-ai/sdk";

const client = createClient({ store: "session.db" });
const anthropic = new Anthropic();

const SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep responses concise — under 500 characters when possible, since this is a chat interface.";

type Message = { role: "user" | "assistant"; content: string };
const conversations = new Map<string, Message[]>();
const MAX_HISTORY = 20;

async function askClaude(userJid: string, userMessage: string): Promise<string> {
  const history = conversations.get(userJid) ?? [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  const block = response.content[0];
  const reply = block.type === "text" ? block.text : "I couldn't generate a response.";

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

  // Show typing while Claude thinks
  await client.sendChatPresence(info.chat, "composing");

  try {
    const reply = await askClaude(info.sender, text);
    await client.sendMessage(info.chat, { conversation: reply });
    console.log(`→ ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error("Claude API error:", err);
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
  console.log("AI bot is online!");

  process.on("SIGINT", async () => {
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Melhorias

Aqui estão algumas ideias para estender ainda mais:

- **Compreensão de imagens** — baixe imagens recebidas com `downloadAny()`, leia o arquivo e envie ao Claude como um bloco de imagem base64
- **Rate limiting** — rastreie contagens de mensagens por usuário para prevenir abuso da API
- **Comando de reset** — adicione um comando `!reset` para limpar o histórico de conversa
- **Histórico persistente** — armazene conversas em um banco de dados em vez de na memória para persistência entre reinicializações

## Erros Comuns

:::warning Loops de eco
Sempre verifique `info.isFromMe` primeiro. Sem isso, o bot envia uma mensagem, vê sua própria mensagem, envia ao Claude e responde novamente — para sempre.
:::

:::warning Exposição da chave de API
Nunca coloque sua chave de API diretamente no código-fonte. Use variáveis de ambiente (`ANTHROPIC_API_KEY`) ou um arquivo `.env` (adicionado ao `.gitignore`).
:::

:::warning Rate limits em ambos os lados
Tanto a API da Anthropic quanto o WhatsApp têm rate limits. Para a API da Anthropic, trate erros `429` com backoff exponencial. Para o WhatsApp, evite enviar muitas mensagens muito rapidamente — veja [Rate Limiting](/docs/rate-limiting).
:::

## Próximos Passos

- [Como Criar um Bot](build-a-bot) — fundamentos de tratamento de mensagens e comandos
- [Como Mostrar Indicadores de Digitação](typing-indicators) — faça a IA parecer mais natural
- [Exemplo de Echo Bot](/docs/examples/bots-and-resilience#echo-bot) — bot de referência completo
- [Rate Limiting](/docs/rate-limiting) — entenda os limites de envio do WhatsApp
