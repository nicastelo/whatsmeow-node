---
title: "Como Fazer a Triagem de Mensagens do WhatsApp com Jev"
sidebar_label: Triagem com Jev
sidebar_position: 29
description: "Encaminhe, priorize e modere as mensagens recebidas no WhatsApp com o Jev, o modelo de decisão da TypeSafe, e o whatsmeow-node — e só chame um LLM quando uma resposta escrita for realmente necessária."
keywords: [triagem mensagens whatsapp, jev typesafe, typesafe ai system one, roteamento mensagens whatsapp nodejs, bot moderação spam whatsapp, roteador llm whatsapp, classificar mensagens whatsapp typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/triage-messages-with-jev.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/triage-messages-with-jev.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Fazer a Triagem de Mensagens do WhatsApp com Jev",
      "description": "Encaminhe, priorize e modere as mensagens recebidas no WhatsApp com o Jev, o modelo de decisão da TypeSafe, e o whatsmeow-node — e só chame um LLM quando uma resposta escrita for realmente necessária.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/triage-messages-with-jev.png",
      "step": [
        {"@type": "HowToStep", "name": "Configurar os Dois Clients", "text": "Inicialize o WhatsmeowClient com createClient() e o client do Jev com new TypeSafeClient(), fixando uma versão do modelo."},
        {"@type": "HowToStep", "name": "Passar a Conversa Recente como State", "text": "Guarde as últimas N mensagens de cada chat e envie-as ao Jev como state, junto com a última mensagem e a mensagem que ela responde."},
        {"@type": "HowToStep", "name": "Encaminhar com uma Pergunta Choice", "text": "Faça uma pergunta Choice (billing, support, sales, human) e passe para uma pessoa quando a confiança ficar abaixo de um limite."},
        {"@type": "HowToStep", "name": "Pontuar a Urgência", "text": "Faça uma pergunta Score com uma rubrica de urgência e escale as mensagens acima do nível escolhido."},
        {"@type": "HowToStep", "name": "Moderar Grupos com uma Pergunta Noul", "text": "Faça uma pergunta Noul de sim/não para detectar spam ou abuso em grupos e chame revokeMessage() quando a probabilidade passar de um limite alto."},
        {"@type": "HowToStep", "name": "Filtrar as Chamadas ao LLM", "text": "Só chame o ChatGPT ou o Claude quando o Jev indicar que a mensagem precisa de uma resposta escrita, e responda citando a mensagem."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Fazer a Triagem de Mensagens do WhatsApp com Jev",
      "description": "Encaminhe, priorize e modere as mensagens recebidas no WhatsApp com o Jev, o modelo de decisão da TypeSafe, e o whatsmeow-node — e só chame um LLM quando uma resposta escrita for realmente necessária.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/triage-messages-with-jev.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Fazer a Triagem de Mensagens do WhatsApp com Jev](/img/guides/pt-BR/triage-messages-with-jev.png)
![Como Fazer a Triagem de Mensagens do WhatsApp com Jev](/img/guides/pt-BR/triage-messages-with-jev-light.png)

# Como Fazer a Triagem de Mensagens do WhatsApp com Jev

:::note Versão do SDK
Este guia foi escrito com o `@typesafe-ai/sdk` 0.6.0 da [TypeSafe AI](https://typesafe.ai). O SDK ainda está antes da 1.0, então consulte a [documentação da TypeSafe](https://docs.typesafe.ai/) se algo não bater mais.
:::

O [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev) é um modelo "System One": ele não gera texto. Você envia um `state` (texto, um objeto JSON ou um array) e um conjunto de perguntas tipadas e nomeadas, e ele devolve respostas estruturadas:

- **Choice** — escolhe uma opção de um conjunto (até 255), com probabilidades por opção e um valor de confiança
- **Score** — posiciona o state em uma rubrica ordenada de 2 a 10 níveis
- **Noul** — uma pergunta de sim/não respondida como uma probabilidade entre 0 e 1

Isso o torna ideal para as decisões que um bot de WhatsApp toma a cada mensagem — qual equipe deve ver, qual a urgência, se é spam, se precisa de resposta — e pouco adequado para escrever a resposta em si. Este guia usa o Jev para as decisões e um LLM apenas para as respostas que precisam de um.

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))
- Uma chave de API da TypeSafe (defina como variável de ambiente `TYPESAFE_API_KEY`)
- O SDK da TypeSafe (Node.js 20+): `npm install @typesafe-ai/sdk`
- Para o passo do LLM: uma chave de API da OpenAI e `npm install openai` (veja [Conectar ao ChatGPT](connect-to-chatgpt)) — ou use o Claude no lugar ([Conectar ao Claude AI](connect-to-ai))

## Passo 1: Configurar os Dois Clients

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { TypeSafeClient } from "@typesafe-ai/sdk";

const client = createClient({ store: "session.db" });

// Reads TYPESAFE_API_KEY from env. The default model is "jev-latest",
// which can change under you — pin a version for stable behavior.
const jev = new TypeSafeClient({ defaultModel: "jev-1.13.0", timeout: 3_000 });
```

O `timeout` é por tentativa, em milissegundos. Por padrão, o SDK tenta de novo duas vezes, com backoff, em caso de timeouts, erros de conexão e respostas `408`, `429` e `5xx`.

## Passo 2: Passar a Conversa Recente como State

Uma mensagem isolada costuma ser ambígua ("sim, por favor", "continua sem funcionar"). Guarde as últimas mensagens de cada chat e envie-as como state, com a última mensagem separada para que suas perguntas possam se referir a ela:

```typescript
import type { MessageInfo } from "@whatsmeow-node/whatsmeow-node";

const HISTORY_SIZE = 10;

type ChatLine = { id: string; from: string; fromMe: boolean; text: string };
const history = new Map<string, ChatLine[]>();

function remember(chat: string, line: ChatLine) {
  const lines = history.get(chat) ?? [];
  lines.push(line);
  if (lines.length > HISTORY_SIZE) lines.splice(0, lines.length - HISTORY_SIZE);
  history.set(chat, lines);
}

function extractText(message: Record<string, unknown>) {
  const ext = message.extendedTextMessage as
    | { text?: string; contextInfo?: { stanzaID?: string } }
    | undefined;
  return {
    text: (message.conversation as string | undefined) ?? ext?.text,
    quotedId: ext?.contextInfo?.stanzaID,
  };
}

function buildState(info: MessageInfo, text: string, quotedId?: string) {
  const lines = history.get(info.chat) ?? [];
  const quoted = quotedId ? lines.find((l) => l.id === quotedId) : undefined;
  return {
    recentMessages: lines.map((l) => ({ from: l.fromMe ? "business" : l.from, text: l.text })),
    latestMessage: { from: info.pushName, text, repliesTo: quoted?.text ?? null },
  };
}
```

Texto simples chega como `message.conversation`; respostas, links e menções chegam como `message.extendedTextMessage.text`. Quando o usuário responde a uma mensagem anterior, `extendedTextMessage.contextInfo.stanzaID` contém o ID dessa mensagem — repare no `ID` em maiúsculas, igual ao nome JSON do protobuf do WhatsApp. Buscar esse ID no histórico permite que o Jev veja a que o "sim, por favor" está respondendo.

A TypeSafe recomenda um objeto JSON com chaves descritivas em vez de uma string solta, e enviar só o que as perguntas precisam: contexto demais pode reduzir a precisão.

O idioma principal de treinamento do Jev é o inglês. A [documentação de modelos](https://docs.typesafe.ai/models) da TypeSafe diz que outros idiomas funcionam, mas não tão bem, então se os seus chats não estão em inglês, teste com mensagens reais antes de confiar em qualquer limite, principalmente no de revogação.

## Passo 3: Encaminhar com uma Pergunta Choice

Uma pergunta Choice escolhe um rótulo. Descreva cada rótulo para que o Jev saiba onde ficam os limites, e inclua uma opção `human` explícita:

```typescript
import { choice } from "@typesafe-ai/sdk";

const ROUTE_MIN_CONFIDENCE = 0.5; // below this, a person decides

const route = choice("Which team should handle the latest message?", {
  billing: "Payments, invoices, refunds, double charges, or subscriptions",
  support: "Bugs, errors, how-to questions, or problems using the product",
  sales: "Pricing, plans, demos, or wanting to buy",
  human: "Complaints, legal threats, cancellations, or sensitive personal matters",
});

const { answers } = await jev.systemOne({
  state: buildState(info, text, quotedId),
  questions: { route },
});

answers.route.choice; // "billing" | "support" | "sales" | "human"
answers.route.confidence; // 0–1
answers.route.probabilities; // { billing: 0.91, support: 0.05, ... }

if (answers.route.choice === "human" || answers.route.confidence < ROUTE_MIN_CONFIDENCE) {
  // hand off to a person (see the complete example)
}
```

O SDK infere os tipos das respostas a partir da pergunta, então `answers.route.choice` tem como tipo a união dos seus rótulos — um erro de digitação ao comparar um rótulo vira erro de compilação.

`confidence` resume o quanto as probabilidades estão concentradas. A [documentação da TypeSafe](https://docs.typesafe.ai/confidence) descreve três faixas (agir automaticamente com confiança alta, seguir com cautela com confiança média e passar para uma pessoa com confiança baixa) e deixa os limites por sua conta, porque eles dependem do que está em jogo. Os números deste guia são pontos de partida próprios: 0.5 como mínimo para rotear, porque encaminhar uma mensagem para o chat de uma equipe custa pouco se der errado, e 0.9 para revogar uma mensagem de grupo, que não dá para desfazer. Ajuste-os com os seus próprios dados.

## Passo 4: Pontuar a Urgência

Uma pergunta Score posiciona o state em uma rubrica escrita por você, a partir do nível 0 (de 2 a 10 níveis):

```typescript
import { score } from "@typesafe-ai/sdk";

const URGENT_SCORE = 2; // on the 0–3 rubric below

const urgency = score("How urgent is the latest message?", [
  "Not urgent; can wait a few days",
  "Normal; should be answered today",
  "Urgent; the customer is blocked or losing money",
  "Critical; outage, security incident, or safety concern",
]);

const { answers } = await jev.systemOne({ state, questions: { urgency } });

// answers.urgency.score is a probability-weighted average — e.g. 1.43
if (answers.urgency.score >= URGENT_SCORE) {
  // escalate to a person
}
```

O `score` pode cair entre dois níveis, então dá para ordenar uma fila por ele ou compará-lo com um limite. Arredonde se o seu código precisar de um único nível.

## Passo 5: Moderar Grupos com uma Pergunta Noul

Uma pergunta Noul devolve uma única probabilidade, `noul`, entre 0 e 1 (não há um valor de confiança separado). Em grupos, use-a para detectar spam e abuso, e revogue a mensagem só quando a probabilidade for alta:

```typescript
import { noul } from "@typesafe-ai/sdk";

const ABUSE_REVOKE_THRESHOLD = 0.9; // revoking is destructive — keep the bar high

const abusive = noul("The latest message is spam, a scam, phishing, harassment, or abuse");

if (info.isGroup) {
  const { answers } = await jev.systemOne({ state, questions: { abusive } });
  if (answers.abusive.noul >= ABUSE_REVOKE_THRESHOLD) {
    await client.revokeMessage(info.chat, info.sender, info.id);
  }
}
```

`revokeMessage(chat, sender, id)` apaga a mensagem para todos. Passar o JID de outro membro como `sender` envia uma revogação de administrador, que só funciona se a sua conta for administradora do grupo.

## Passo 6: Usar o Jev como Filtro Barato Antes de um LLM

Muitas mensagens recebidas não precisam de uma resposta gerada: "obrigado", "beleza", "até amanhã", ou algo que uma pessoa vai ter que tratar de qualquer forma. Chamar um LLM para cada uma custa dinheiro e adiciona segundos de latência. Pergunte ao Jev primeiro, e só chame o LLM quando ele indicar que uma resposta escrita é necessária:

```typescript
const NEEDS_REPLY_THRESHOLD = 0.7;

const needsReply = noul("The latest message asks a question that needs a written answer", {
  true: "A question or request the business should answer in words",
  false: "Greetings, thanks, acknowledgements, or messages that only need routing",
});

const { answers, usage } = await jev.systemOne({
  state,
  questions: { route, urgency, needsReply },
});

if (answers.needsReply.noul >= NEEDS_REPLY_THRESHOLD) {
  await client.sendChatPresence(info.chat, "composing");
  await replyTo(info, message, await draftReply(info.chat, answers.route.choice));
}

console.log(`Jev used ${usage.input_tokens} input tokens`);
```

O Jev responde todas as perguntas da requisição sobre o mesmo state, e a TypeSafe afirma que perguntas extras quase não aumentam a latência. Perguntar `route`, `urgency` e `needsReply` em uma única chamada leva mais ou menos o mesmo tempo que perguntar uma.

Por que isso economiza dinheiro e tempo, com base nos números publicados pela TypeSafe (afirmações da empresa, não benchmarks independentes):

- **Custo:** a TypeSafe informa um preço de $0.042 por milhão de tokens de entrada para o Jev, com tokens de saída gratuitos. Um state com dez mensagens curtas do WhatsApp mais três perguntas dá aproximadamente 1.000 tokens de entrada, o que resulta em cerca de $0.00004 por mensagem — por volta de $42 por milhão de mensagens. Registre `usage.input_tokens` para medir os seus números reais.
- **Latência:** a TypeSafe informa de 70 a 500 ms de ponta a ponta. Uma resposta gerada por um LLM costuma levar segundos, então pular o LLM nas mensagens que não precisam de resposta também faz essas mensagens serem resolvidas mais rápido.

Cada chamada ao LLM evitada vale muito mais do que a chamada ao Jev, então o filtro se paga desde que uma parte significativa do seu tráfego não precise de uma resposta gerada. Registre as probabilidades de `needsReply` por alguns dias antes de escolher o limite.

`draftReply` é uma chat completion comum sobre o mesmo histórico (veja [Conectar ao ChatGPT](connect-to-chatgpt) ou [Conectar ao Claude AI](connect-to-ai)), e `replyTo` envia uma resposta citada definindo `contextInfo.stanzaID` como o ID da mensagem recebida. As duas estão no exemplo completo abaixo.

## Exemplo Completo

Grupos recebem apenas moderação. Mensagens diretas são encaminhadas, pontuadas e respondidas pelo LLM só quando o Jev indica que uma resposta escrita é necessária. Se o Jev falhar, a mensagem vai para uma pessoa.

```typescript
import { createClient, type MessageInfo } from "@whatsmeow-node/whatsmeow-node";
import { TypeSafeClient, TypeSafeError, choice, noul, score } from "@typesafe-ai/sdk";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const client = createClient({ store: "session.db" });
const jev = new TypeSafeClient({ defaultModel: "jev-1.13.0", timeout: 3_000 });
const openai = new OpenAI();

// Where routed conversations go (a group or an agent's chat)
const TEAM_CHATS = {
  billing: "120363000000000001@g.us",
  support: "120363000000000002@g.us",
  sales: "120363000000000003@g.us",
} as const;
const HUMAN_CHAT = "5989XXXXXXXX@s.whatsapp.net";

const ROUTE_MIN_CONFIDENCE = 0.5; // below this, a person decides
const URGENT_SCORE = 2; // on the 0–3 urgency rubric
const NEEDS_REPLY_THRESHOLD = 0.7; // wake the LLM only above this
const ABUSE_REVOKE_THRESHOLD = 0.9; // revoking is destructive — keep the bar high
const HISTORY_SIZE = 10;

// ── Conversation history (last N messages per chat) ──

type ChatLine = { id: string; from: string; fromMe: boolean; text: string };
const history = new Map<string, ChatLine[]>();

function remember(chat: string, line: ChatLine) {
  const lines = history.get(chat) ?? [];
  lines.push(line);
  if (lines.length > HISTORY_SIZE) lines.splice(0, lines.length - HISTORY_SIZE);
  history.set(chat, lines);
}

function extractText(message: Record<string, unknown>) {
  const ext = message.extendedTextMessage as
    | { text?: string; contextInfo?: { stanzaID?: string } }
    | undefined;
  return {
    text: (message.conversation as string | undefined) ?? ext?.text,
    quotedId: ext?.contextInfo?.stanzaID,
  };
}

function buildState(info: MessageInfo, text: string, quotedId?: string) {
  const lines = history.get(info.chat) ?? [];
  const quoted = quotedId ? lines.find((l) => l.id === quotedId) : undefined;
  return {
    recentMessages: lines.map((l) => ({ from: l.fromMe ? "business" : l.from, text: l.text })),
    latestMessage: { from: info.pushName, text, repliesTo: quoted?.text ?? null },
  };
}

// ── Jev questions ──

const triageQuestions = {
  route: choice("Which team should handle the latest message?", {
    billing: "Payments, invoices, refunds, double charges, or subscriptions",
    support: "Bugs, errors, how-to questions, or problems using the product",
    sales: "Pricing, plans, demos, or wanting to buy",
    human: "Complaints, legal threats, cancellations, or sensitive personal matters",
  }),
  urgency: score("How urgent is the latest message?", [
    "Not urgent; can wait a few days",
    "Normal; should be answered today",
    "Urgent; the customer is blocked or losing money",
    "Critical; outage, security incident, or safety concern",
  ]),
  needsReply: noul("The latest message asks a question that needs a written answer", {
    true: "A question or request the business should answer in words",
    false: "Greetings, thanks, acknowledgements, or messages that only need routing",
  }),
};

const moderationQuestions = {
  abusive: noul("The latest message is spam, a scam, phishing, harassment, or abuse"),
};

// ── WhatsApp helpers ──

async function replyTo(info: MessageInfo, message: Record<string, unknown>, text: string) {
  const sent = await client.sendMessage(info.chat, {
    extendedTextMessage: {
      text,
      contextInfo: { stanzaID: info.id, participant: info.sender, quotedMessage: message },
    },
  });
  remember(info.chat, { id: sent.id, from: "business", fromMe: true, text });
}

async function handOff(
  info: MessageInfo,
  message: Record<string, unknown>,
  text: string,
  reason: string,
) {
  await client.sendMessage(HUMAN_CHAT, {
    conversation: `[handoff: ${reason}] ${info.pushName} (${info.sender}):\n${text}`,
  });
  await replyTo(info, message, "Thanks! A member of our team will reply here shortly.");
}

async function draftReply(chat: string, team: string): Promise<string> {
  const messages: ChatCompletionMessageParam[] = (history.get(chat) ?? []).map((l) => ({
    role: l.fromMe ? "assistant" : "user",
    content: l.text,
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-6-astra",
    messages: [
      {
        role: "system",
        content: `You are the ${team} assistant for our business on WhatsApp. Answer in under 500 characters.`,
      },
      ...messages,
    ],
  });
  return response.choices[0].message.content ?? "Let me get someone to help you with that.";
}

// ── Message handler ──

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const { text, quotedId } = extractText(message);
  if (!text) return;

  const state = buildState(info, text, quotedId);
  remember(info.chat, { id: info.id, from: info.pushName, fromMe: false, text });

  try {
    // Groups: moderation only
    if (info.isGroup) {
      const { answers } = await jev.systemOne({ state, questions: moderationQuestions });
      if (answers.abusive.noul >= ABUSE_REVOKE_THRESHOLD) {
        await client.revokeMessage(info.chat, info.sender, info.id);
        console.log(`Revoked ${info.id} (p=${answers.abusive.noul.toFixed(2)})`);
      }
      return;
    }

    // Direct messages: route, score urgency, decide whether to generate
    const { answers, usage } = await jev.systemOne({ state, questions: triageQuestions });
    const { route, urgency, needsReply } = answers;
    console.log(
      `${info.pushName}: ${route.choice} (conf ${route.confidence.toFixed(2)}), ` +
        `urgency ${urgency.score.toFixed(1)}, needsReply ${needsReply.noul.toFixed(2)}, ` +
        `${usage.input_tokens} input tokens`,
    );

    if (route.choice === "human" || route.confidence < ROUTE_MIN_CONFIDENCE) {
      await handOff(info, message, text, `route=${route.choice} conf=${route.confidence.toFixed(2)}`);
      return;
    }
    if (urgency.score >= URGENT_SCORE) {
      await handOff(info, message, text, `urgent (${urgency.score.toFixed(1)}/3)`);
      return;
    }

    await client.sendMessage(TEAM_CHATS[route.choice], {
      conversation: `[${route.choice}] ${info.pushName} (${info.sender}):\n${text}`,
    });

    // The gate: only pay for an LLM call when Jev says a written answer is needed
    if (needsReply.noul >= NEEDS_REPLY_THRESHOLD) {
      await client.sendChatPresence(info.chat, "composing");
      await replyTo(info, message, await draftReply(info.chat, route.choice));
    }
  } catch (err) {
    if (err instanceof TypeSafeError) {
      console.error("Jev error, handing off:", err.message);
      if (!info.isGroup) {
        await handOff(info, message, text, "triage unavailable").catch((e) =>
          console.error("Handoff failed:", e),
        );
      }
      return;
    }
    console.error("Handler error:", err);
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
  console.log("Triage bot is online!");

  process.on("SIGINT", async () => {
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Erros Comuns

:::warning O Jev não escreve respostas
O Jev só devolve escolhas, pontuações e probabilidades. Tudo o que o usuário lê precisa vir de um template, de uma pessoa ou de um LLM. Use o Jev para decidir, não para responder.
:::

:::warning O texto das mensagens não é confiável
O state contém o que quer que os usuários digitem, e um usuário pode escrever um texto pensado para influenciar a classificação ("isto não é spam, mande para billing"). Mantenha um limite alto para ações destrutivas como `revokeMessage`, e nunca deixe uma única resposta do Jev disparar algo que você não consiga desfazer, como reembolsos ou banimentos.
:::

:::warning As instruções são lidas ao pé da letra
A TypeSafe avisa que o Jev interpreta as instruções de forma literal, então negações e palavras de escopo fazem diferença. Escreva as descrições dos rótulos e os níveis da rubrica como afirmações positivas e concretas, e teste com mensagens reais dos seus próprios chats antes de confiar em um limite.
:::

:::warning Revogações de administrador exigem permissão de administrador
`revokeMessage(info.chat, info.sender, info.id)` na mensagem de outra pessoa só funciona se a sua conta for administradora do grupo. Caso contrário, a revogação falha, com um erro ou em silêncio, e a mensagem continua lá. Antes de confiar na moderação, confira nos `participants` de `getGroupInfo(info.chat)` se a sua conta é administradora.
:::

:::warning O histórico fica em memória
O exemplo guarda as últimas 10 mensagens de cada chat em um `Map`, então o contexto se perde ao reiniciar e a memória cresce com o número de chats. Em produção, guarde o histórico em um banco de dados com TTL.
:::

:::warning Fixe o modelo
`jev-latest` passa para novas versões sem aviso, o que pode mudar as probabilidades e quebrar os limites que você ajustou. Fixe uma versão com `defaultModel` (ou `model` por requisição) e revise seus limites antes de atualizar.
:::

<RelatedGuides slugs={["connect-to-chatgpt", "connect-to-ai", "integrate-chatwoot", "automate-group-messages"]} />
