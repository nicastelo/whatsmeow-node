---
title: "Como Criar um Bot de Enquete no WhatsApp"
sidebar_label: Bot de Enquete
sidebar_position: 19
description: "Crie e gerencie enquetes no WhatsApp programaticamente com Node.js — envie enquetes, leia votos, anuncie resultados e construa bots interativos com whatsmeow-node."
keywords: [bot enquete whatsapp, criar enquete whatsapp api, enquete whatsapp nodejs, voto enquete whatsapp api, bot enquete whatsapp typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/poll-bot.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/poll-bot.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Create a WhatsApp Poll Bot",
      "description": "Create and manage WhatsApp polls programmatically with Node.js — send polls, read votes, announce results, and build interactive group bots with whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/poll-bot.png",
      "step": [
        {"@type": "HowToStep", "name": "Create a Poll", "text": "Use sendPollCreation() with a question, options array, and max selectable count."},
        {"@type": "HowToStep", "name": "Listen for Votes", "text": "Handle incoming poll vote messages and decrypt them with decryptPollVote()."},
        {"@type": "HowToStep", "name": "Track Results", "text": "Store votes in a Map and tally results per poll."},
        {"@type": "HowToStep", "name": "Announce Results", "text": "Send a summary message with the vote counts when the poll closes."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Create a WhatsApp Poll Bot",
      "description": "Create and manage WhatsApp polls programmatically with Node.js — send polls, read votes, announce results, and build interactive group bots with whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/poll-bot.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Criar um Bot de Enquete no WhatsApp](/img/guides/pt-BR/poll-bot.png)
![Como Criar um Bot de Enquete no WhatsApp](/img/guides/pt-BR/poll-bot-light.png)

# Como Criar um Bot de Enquete no WhatsApp

O whatsmeow-node permite criar enquetes, receber votos criptografados, descriptografá-los e contabilizar resultados — tudo programaticamente. Isso é ótimo para bots de grupo que fazem votações, pesquisas ou fluxos de tomada de decisão.

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))
- Um grupo para testar (enquetes funcionam melhor em chats de grupo)

## Passo 1: Criar uma Enquete

```typescript
const resp = await client.sendPollCreation(
  groupJid,
  "Where should we eat?",         // question
  ["Pizza", "Sushi", "Tacos"],    // options
  1,                               // max selectable (1 = single choice)
);

console.log(`Poll sent with ID: ${resp.id}`);
```

Defina `selectableCount` para permitir múltiplas seleções:

```typescript
// Multi-select poll — voters can pick up to 3
await client.sendPollCreation(
  groupJid,
  "Which topics should we cover?",
  ["Frontend", "Backend", "DevOps", "Mobile", "AI"],
  3,
);
```

## Passo 2: Ouvir os Votos

Os votos das enquetes chegam como eventos `message` com dados criptografados. Use `decryptPollVote()` para lê-los.

:::warning Hashes dos votos
`decryptPollVote()` retorna `selectedOptions` como **hashes SHA-256** (codificados em base64), não o texto das opções. Você precisa fazer o hash das suas opções conhecidas e comparar para identificar quais opções foram selecionadas.
:::

```typescript
import { createHash } from "node:crypto";

// Hash an option name the same way WhatsApp does
function hashOption(option: string): string {
  return createHash("sha256").update(option).digest("base64");
}

client.on("message", async ({ info, message }) => {
  const pollUpdate = message.pollUpdateMessage as Record<string, unknown> | undefined;
  if (!pollUpdate) return;

  // Get the poll message ID from the poll update
  const pollKey = pollUpdate.pollCreationMessageKey as { id?: string } | undefined;
  const pollId = pollKey?.id;
  if (!pollId) return;

  try {
    const vote = await client.decryptPollVote(
        info as unknown as Record<string, unknown>,
        message,
      );
    const hashes = (vote.selectedOptions ?? []) as string[];
    console.log(`${info.sender} voted (${hashes.length} options)`);
  } catch (err) {
    console.error("Failed to decrypt poll vote:", err);
  }
});
```

## Passo 3: Rastrear Resultados

Armazene as enquetes com um lookup hash-para-opção para resolver os hashes dos votos de volta para os nomes das opções:

```typescript
import { createHash } from "node:crypto";

function hashOption(option: string): string {
  return createHash("sha256").update(option).digest("base64");
}

type PollData = {
  question: string;
  hashToOption: Map<string, string>; // SHA-256 hash → option name
  results: Map<string, string[]>;    // option name → voter JIDs
};

const polls = new Map<string, PollData>();

// When creating a poll, store option hashes
async function createPoll(groupJid: string, question: string, options: string[]) {
  const resp = await client.sendPollCreation(groupJid, question, options, 1);

  const hashToOption = new Map<string, string>();
  const results = new Map<string, string[]>();
  for (const opt of options) {
    hashToOption.set(hashOption(opt), opt);
    results.set(opt, []);
  }

  polls.set(resp.id, { question, hashToOption, results });
  return resp;
}

// When receiving a vote, resolve hashes and tally
function recordVote(pollId: string, voter: string, selectedHashes: string[]) {
  const poll = polls.get(pollId);
  if (!poll) return;

  // Remove previous votes from this voter
  for (const [, voters] of poll.results) {
    const idx = voters.indexOf(voter);
    if (idx !== -1) voters.splice(idx, 1);
  }

  // Resolve hashes to option names and add votes
  for (const hash of selectedHashes) {
    const option = poll.hashToOption.get(hash);
    if (option) {
      poll.results.get(option)?.push(voter);
    }
  }
}
```

## Passo 4: Anunciar Resultados

Envie um resumo com o comando `!results`:

```typescript
function formatResults(pollId: string): string | null {
  const poll = polls.get(pollId);
  if (!poll) return null;

  let text = `Poll: ${poll.question}\n\n`;

  const sorted = [...poll.results.entries()].sort((a, b) => b[1].length - a[1].length);

  for (const [option, voters] of sorted) {
    const bar = "█".repeat(voters.length);
    text += `${option}: ${bar} ${voters.length}\n`;
  }

  const total = sorted.reduce((sum, [, v]) => sum + v.length, 0);
  text += `\nTotal votes: ${total}`;

  return text;
}
```

## Exemplo Completo

Um bot de grupo que trata comandos `!poll` e `!results`:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { createHash } from "node:crypto";

const client = createClient({ store: "session.db" });

function hashOption(option: string): string {
  return createHash("sha256").update(option).digest("base64");
}

type PollData = {
  question: string;
  chat: string;
  hashToOption: Map<string, string>;
  results: Map<string, string[]>;
};

const polls = new Map<string, PollData>();
let lastPollId: string | null = null;

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  // Handle poll votes
  const pollUpdate = message.pollUpdateMessage as Record<string, unknown> | undefined;
  if (pollUpdate) {
    const pollKey = pollUpdate.pollCreationMessageKey as { id?: string } | undefined;
    const pollId = pollKey?.id;
    if (!pollId) return;

    const poll = polls.get(pollId);
    if (!poll) return;

    try {
      const vote = await client.decryptPollVote(
        info as unknown as Record<string, unknown>,
        message,
      );
      const selectedHashes = (vote.selectedOptions ?? []) as string[];

      // Remove previous votes from this voter
      for (const [, voters] of poll.results) {
        const idx = voters.indexOf(info.sender);
        if (idx !== -1) voters.splice(idx, 1);
      }

      // Resolve hashes to option names and tally
      for (const hash of selectedHashes) {
        const option = poll.hashToOption.get(hash);
        if (option) {
          poll.results.get(option)?.push(info.sender);
        }
      }
    } catch {
      // Ignore decryption errors for polls we don't track
    }
    return;
  }

  // Handle text commands
  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text?.startsWith("!")) return;

  // !poll Where should we eat? | Pizza | Sushi | Tacos
  if (text.startsWith("!poll ")) {
    const parts = text.slice(6).split("|").map((s) => s.trim());
    if (parts.length < 3) {
      await client.sendMessage(info.chat, {
        conversation: "Usage: !poll Question | Option 1 | Option 2 | ...",
      });
      return;
    }

    const [question, ...options] = parts;
    const resp = await client.sendPollCreation(info.chat, question, options, 1);

    const hashToOption = new Map<string, string>();
    const results = new Map<string, string[]>();
    for (const opt of options) {
      hashToOption.set(hashOption(opt), opt);
      results.set(opt, []);
    }
    polls.set(resp.id, { question, chat: info.chat, hashToOption, results });
    lastPollId = resp.id;

    return;
  }

  // !results — show results for the last poll
  if (text === "!results") {
    if (!lastPollId || !polls.has(lastPollId)) {
      await client.sendMessage(info.chat, {
        conversation: "No active poll. Create one with !poll",
      });
      return;
    }

    const poll = polls.get(lastPollId)!;
    let summary = `Poll: ${poll.question}\n\n`;
    const sorted = [...poll.results.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [option, voters] of sorted) {
      summary += `${option}: ${"█".repeat(voters.length)} ${voters.length}\n`;
    }
    const total = sorted.reduce((sum, [, v]) => sum + v.length, 0);
    summary += `\nTotal votes: ${total}`;

    await client.sendMessage(info.chat, { conversation: summary });
    return;
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
  console.log("Poll bot is online! Commands: !poll, !results");

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

:::warning Votos das enquetes são criptografados
Você precisa chamar `decryptPollVote()` para ler os votos. A `pollUpdateMessage` bruta contém dados criptografados que são ilegíveis sem descriptografia.
:::

:::warning Resultados em memória
O exemplo armazena dados da enquete em um `Map` que é perdido ao reiniciar. Para produção, persista enquetes e votos em um banco de dados.
:::

:::warning Loops de eco
Sempre verifique `info.isFromMe`. O bot cria enquetes que disparam eventos de mensagem — sem essa verificação, ele poderia reagir às próprias enquetes.
:::

<RelatedGuides slugs={["automate-group-messages", "build-a-bot", "send-messages-typescript"]} />
