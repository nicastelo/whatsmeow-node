---
title: "Como Usar o whatsmeow-node com Typebot"
sidebar_label: Integração com Typebot
sidebar_position: 24
description: "Conecte o whatsmeow-node ao Typebot para fluxos de chatbot no WhatsApp — substitua a Evolution API por um backend WhatsApp mais leve e estável."
keywords: [typebot whatsapp, typebot whatsmeow, typebot alternativa evolution api, typebot bot whatsapp, typebot integração whatsapp, typebot whatsapp nodejs]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-typebot.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-typebot.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Use whatsmeow-node with Typebot",
      "description": "Connect whatsmeow-node to Typebot for WhatsApp chatbot flows — replace Evolution API with a lighter, more stable WhatsApp backend.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-typebot.png",
      "step": [
        {"@type": "HowToStep", "name": "Build a whatsmeow-node REST API", "text": "Create an Express server that bridges WhatsApp messages to Typebot via HTTP."},
        {"@type": "HowToStep", "name": "Start a Typebot Flow", "text": "POST the first message to Typebot's API to start a conversation flow."},
        {"@type": "HowToStep", "name": "Continue the Conversation", "text": "Send user replies to Typebot's continueChat endpoint and relay bot responses to WhatsApp."},
        {"@type": "HowToStep", "name": "Handle Rich Messages", "text": "Parse Typebot's response blocks (text, image, input) and send appropriate WhatsApp messages."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Use whatsmeow-node with Typebot",
      "description": "Connect whatsmeow-node to Typebot for WhatsApp chatbot flows — replace Evolution API with a lighter, more stable WhatsApp backend.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/integrate-typebot.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Usar o whatsmeow-node com Typebot](/img/guides/pt-BR/integrate-typebot.png)
![Como Usar o whatsmeow-node com Typebot](/img/guides/pt-BR/integrate-typebot-light.png)

# Como Usar o whatsmeow-node com Typebot

O [Typebot](https://typebot.io) é um construtor de chatbots open-source com editor visual de fluxos. Normalmente é conectado ao WhatsApp através da [Evolution API](https://github.com/EvolutionAPI/evolution-api) (que usa Baileys). Você pode substituir toda essa camada pelo whatsmeow-node para uma conexão mais leve e estável.

## Como Funciona

```
WhatsApp User
  ↕
whatsmeow-node Bridge (Express)
  ↕ Typebot API
Typebot Flow Engine
```

Em vez de `WhatsApp, Evolution API (Baileys), Typebot`, você usa `WhatsApp, whatsmeow-node, Typebot` diretamente. Menos peças móveis, menos memória, mais estabilidade.

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))
- Uma instância do Typebot (self-hosted ou cloud) com um fluxo publicado
- Express: `npm install express`

## Passo 1: Obter o ID do Typebot

1. Abra seu fluxo do Typebot no editor
2. Clique em **Share** e anote o ID do typebot na URL ou nas configurações de embed
3. A URL base da API do Typebot é `https://typebot.io` (cloud) ou a URL do seu self-hosted

## Passo 2: Construir a Ponte

A ponte gerencia as conversas — ela inicia uma sessão do Typebot por usuário do WhatsApp e repassa as mensagens nos dois sentidos:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

const TYPEBOT_URL = process.env.TYPEBOT_URL ?? "https://typebot.io";
const TYPEBOT_ID = process.env.TYPEBOT_ID!;

// Track active Typebot sessions per WhatsApp user
const sessions = new Map<string, string>(); // JID → sessionId

// --- Start or continue a Typebot conversation ---
async function handleMessage(jid: string, text: string): Promise<string[]> {
  const sessionId = sessions.get(jid);

  let response;

  if (!sessionId) {
    // Start a new Typebot session
    response = await fetch(`${TYPEBOT_URL}/api/v1/typebots/${TYPEBOT_ID}/startChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { type: "text", text } }),
    }).then((r) => r.json());

    if (response.sessionId) {
      sessions.set(jid, response.sessionId);
    }
  } else {
    // Continue existing session
    response = await fetch(`${TYPEBOT_URL}/api/v1/sessions/${sessionId}/continueChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { type: "text", text } }),
    }).then((r) => r.json());
  }

  // Extract text messages from Typebot response
  return extractMessages(response);
}

// --- Parse Typebot response blocks into text messages ---
function extractMessages(response: Record<string, unknown>): string[] {
  const messages: string[] = [];
  const msgs = (response.messages as Array<{ type: string; content?: { richText?: Array<{ children: Array<{ text?: string }> }> } }>) ?? [];

  for (const msg of msgs) {
    if (msg.type === "text" && msg.content?.richText) {
      const text = msg.content.richText
        .map((block) => block.children.map((c) => c.text ?? "").join(""))
        .join("\n");
      if (text.trim()) messages.push(text);
    }
  }

  return messages;
}

// --- Listen for WhatsApp messages ---
client.on("message", async ({ info, message }) => {
  if (info.isFromMe || info.isGroup) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  await client.sendChatPresence(info.chat, "composing");

  try {
    const replies = await handleMessage(info.sender, text);

    for (const reply of replies) {
      await client.sendMessage(info.chat, { conversation: reply });
      // Small delay between multiple messages
      if (replies.length > 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  } catch (err) {
    console.error("Typebot error:", err);
    await client.sendMessage(info.chat, {
      conversation: "Sorry, I'm having trouble right now. Try again in a moment.",
    });
  }
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired!");
    process.exit(1);
  }
  await client.connect();
  await client.sendPresence("available");
  console.log("Typebot bridge is online!");

  process.on("SIGINT", async () => {
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Tratando Tipos de Input

Fluxos do Typebot podem solicitar diferentes tipos de input. Trate-os verificando o bloco `input`:

```typescript
function extractMessages(response: Record<string, unknown>): string[] {
  const messages: string[] = [];
  const msgs = (response.messages as Array<Record<string, unknown>>) ?? [];

  for (const msg of msgs) {
    if (msg.type === "text" && (msg.content as Record<string, unknown>)?.richText) {
      const richText = (msg.content as Record<string, unknown>).richText as Array<{ children: Array<{ text?: string }> }>;
      const text = richText
        .map((block) => block.children.map((c) => c.text ?? "").join(""))
        .join("\n");
      if (text.trim()) messages.push(text);
    }
  }

  // If the flow expects input, prompt the user
  const input = response.input as Record<string, unknown> | undefined;
  if (input) {
    const inputType = input.type as string;
    if (inputType === "choice input") {
      const items = (input.items as Array<{ content: string }>) ?? [];
      const options = items.map((item, i) => `${i + 1}. ${item.content}`).join("\n");
      messages.push(options);
    }
  }

  return messages;
}
```

## Resetando Conversas

Adicione um comando `!reset` para reiniciar o fluxo do Typebot:

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe || info.isGroup) return;

  const text = /* ... extract text ... */;
  if (!text) return;

  if (text.toLowerCase() === "!reset") {
    sessions.delete(info.sender);
    await client.sendMessage(info.chat, {
      conversation: "Conversation reset! Send a message to start over.",
    });
    return;
  }

  // ... handle message as before
});
```

## Evolution API vs whatsmeow-node

Se você está usando a Evolution API com Typebot atualmente, veja o que muda:

| | Evolution API | ponte whatsmeow-node |
|---|---|---|
| **Backend WhatsApp** | Baileys | whatsmeow (Go) |
| **Memória** | ~50-100 MB | ~10-20 MB |
| **Arquitetura** | Serviço separado | Embutido na ponte |
| **Setup** | Docker + config | `npm install` + 50 linhas |
| **Estabilidade** | Atualizações de fork do Baileys | Upstream estável |

## Erros Comuns

:::warning Expiração de sessão
Sessões do Typebot podem expirar. Se o `continueChat` retornar um erro, delete a sessão do map e inicie uma nova.
:::

:::warning Rate limiting
Fluxos do Typebot podem enviar múltiplas mensagens em sequência. Adicione um pequeno delay (1 segundo) entre as mensagens para evitar rate limiting do WhatsApp.
:::

:::warning Conteúdo rico
O Typebot suporta imagens, vídeos e botões nos fluxos. A ponte básica acima só trata texto. Expanda `extractMessages()` para tratar blocos de mídia e enviá-los via `uploadMedia()` + `sendRawMessage()`.
:::

<RelatedGuides slugs={["integrate-whaticket", "integrate-n8n", "connect-to-chatgpt", "build-a-bot"]} />
