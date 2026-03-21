---
title: "Cómo Crear un Bot de Encuestas de WhatsApp"
sidebar_label: Bot de Encuestas
sidebar_position: 19
description: "Crea y administra encuestas de WhatsApp programáticamente con Node.js — envía encuestas, lee votos, anuncia resultados y construye bots interactivos de grupo con whatsmeow-node."
keywords: [bot encuestas whatsapp, crear encuesta whatsapp api, encuesta whatsapp nodejs, votar encuesta whatsapp api, bot encuestas whatsapp typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/poll-bot.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/poll-bot.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Crear un Bot de Encuestas de WhatsApp",
      "description": "Crea y administra encuestas de WhatsApp programáticamente con Node.js — envía encuestas, lee votos, anuncia resultados y construye bots interactivos de grupo con whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/poll-bot.png",
      "step": [
        {"@type": "HowToStep", "name": "Crear una encuesta", "text": "Usa sendPollCreation() con una pregunta, un arreglo de opciones y el conteo máximo seleccionable."},
        {"@type": "HowToStep", "name": "Escuchar los votos", "text": "Maneja los mensajes entrantes de votos de encuesta y descifra con decryptPollVote()."},
        {"@type": "HowToStep", "name": "Rastrear resultados", "text": "Almacena los votos en un Map y contabiliza los resultados por encuesta."},
        {"@type": "HowToStep", "name": "Anunciar resultados", "text": "Envía un mensaje resumen con el conteo de votos cuando la encuesta se cierre."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Crear un Bot de Encuestas de WhatsApp",
      "description": "Crea y administra encuestas de WhatsApp programáticamente con Node.js — envía encuestas, lee votos, anuncia resultados y construye bots interactivos de grupo con whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/poll-bot.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Crear un Bot de Encuestas de WhatsApp](/img/guides/es/poll-bot.png)
![Cómo Crear un Bot de Encuestas de WhatsApp](/img/guides/es/poll-bot-light.png)

# Cómo Crear un Bot de Encuestas de WhatsApp

whatsmeow-node te permite crear encuestas, recibir votos cifrados, descifrarlos y contabilizar resultados — todo programáticamente. Esto es ideal para bots de grupo que manejan votaciones, encuestas o flujos de toma de decisiones.

## Requisitos Previos

- Una sesión vinculada de whatsmeow-node ([Cómo Vincular](pair-whatsapp))
- Un grupo para probar (las encuestas funcionan mejor en chats de grupo)

## Paso 1: Crear una Encuesta

```typescript
const resp = await client.sendPollCreation(
  groupJid,
  "Where should we eat?",         // question
  ["Pizza", "Sushi", "Tacos"],    // options
  1,                               // max selectable (1 = single choice)
);

console.log(`Poll sent with ID: ${resp.id}`);
```

Configura `selectableCount` para permitir selecciones múltiples:

```typescript
// Multi-select poll — voters can pick up to 3
await client.sendPollCreation(
  groupJid,
  "Which topics should we cover?",
  ["Frontend", "Backend", "DevOps", "Mobile", "AI"],
  3,
);
```

## Paso 2: Escuchar los Votos

Los votos de encuesta llegan como eventos `message` con datos de voto cifrados. Usa `decryptPollVote()` para leerlos.

:::warning Hashes de votos
`decryptPollVote()` devuelve `selectedOptions` como **hashes SHA-256** (codificados en base64), no texto de opción. Debes hashear tus opciones conocidas y comparar para identificar qué opciones fueron seleccionadas.
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

## Paso 3: Rastrear Resultados

Almacena las encuestas con un mapa hash→opción para poder resolver los hashes de votos a nombres de opciones:

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

## Paso 4: Anunciar Resultados

Envía un resumen con el comando `!results`:

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

## Ejemplo Completo

Un bot de grupo que maneja los comandos `!poll` y `!results`:

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

## Errores Comunes

:::warning Los votos de encuesta están cifrados
Debes llamar a `decryptPollVote()` para leer los votos. El `pollUpdateMessage` crudo contiene datos cifrados que no se pueden leer sin descifrado.
:::

:::warning Resultados en memoria
El ejemplo almacena datos de encuestas en un `Map` que se pierde al reiniciar. Para producción, persiste las encuestas y votos en una base de datos.
:::

:::warning Bucles de eco
Siempre verifica `info.isFromMe`. El bot crea encuestas que disparan eventos de mensaje — sin esta verificación, podría reaccionar a sus propias encuestas.
:::

<RelatedGuides slugs={["automate-group-messages", "build-a-bot", "send-messages-typescript"]} />
