---
title: "Cómo Clasificar Mensajes de WhatsApp con Jev"
sidebar_label: Clasificar con Jev
sidebar_position: 29
description: "Enruta, prioriza y modera los mensajes entrantes de WhatsApp con Jev, el modelo de decisión de TypeSafe, y whatsmeow-node — y llama a un LLM solo cuando realmente hace falta una respuesta escrita."
keywords: [clasificar mensajes whatsapp, jev typesafe, typesafe ai system one, enrutar mensajes whatsapp nodejs, bot moderación spam whatsapp, router llm whatsapp, clasificar mensajes whatsapp typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/triage-messages-with-jev.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/triage-messages-with-jev.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Clasificar Mensajes de WhatsApp con Jev",
      "description": "Enruta, prioriza y modera los mensajes entrantes de WhatsApp con Jev, el modelo de decisión de TypeSafe, y whatsmeow-node — y llama a un LLM solo cuando realmente hace falta una respuesta escrita.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/triage-messages-with-jev.png",
      "step": [
        {"@type": "HowToStep", "name": "Configurar ambos clientes", "text": "Inicializa WhatsmeowClient con createClient() y el cliente de Jev con new TypeSafeClient(), fijando una versión del modelo."},
        {"@type": "HowToStep", "name": "Pasar la conversación reciente como state", "text": "Guarda los últimos N mensajes por chat y envíalos a Jev como state, junto con el último mensaje y el mensaje al que responde."},
        {"@type": "HowToStep", "name": "Enrutar con una pregunta Choice", "text": "Haz una pregunta Choice (billing, support, sales, human) y deriva a una persona cuando la confianza esté por debajo de un umbral."},
        {"@type": "HowToStep", "name": "Puntuar la urgencia", "text": "Haz una pregunta Score con una rúbrica de urgencia y escala los mensajes que superen el nivel elegido."},
        {"@type": "HowToStep", "name": "Moderar grupos con una pregunta Noul", "text": "Haz una pregunta Noul de sí/no para detectar spam o abuso en grupos y llama a revokeMessage() cuando la probabilidad supere un umbral alto."},
        {"@type": "HowToStep", "name": "Filtrar las llamadas al LLM", "text": "Llama a ChatGPT o Claude solo cuando Jev indique que el mensaje necesita una respuesta escrita, y responde citando el mensaje."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Clasificar Mensajes de WhatsApp con Jev",
      "description": "Enruta, prioriza y modera los mensajes entrantes de WhatsApp con Jev, el modelo de decisión de TypeSafe, y whatsmeow-node — y llama a un LLM solo cuando realmente hace falta una respuesta escrita.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/triage-messages-with-jev.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Clasificar Mensajes de WhatsApp con Jev](/img/guides/es/triage-messages-with-jev.png)
![Cómo Clasificar Mensajes de WhatsApp con Jev](/img/guides/es/triage-messages-with-jev-light.png)

# Cómo Clasificar Mensajes de WhatsApp con Jev

:::note Versión del SDK
Esta guía se escribió con `@typesafe-ai/sdk` 0.6.0 de [TypeSafe AI](https://typesafe.ai). El SDK todavía está antes de la 1.0, así que consulta la [documentación de TypeSafe](https://docs.typesafe.ai/) si algo ya no coincide.
:::

[Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev) es un modelo "System One": no genera texto. Le envías un `state` (texto, un objeto JSON o un array) y un conjunto de preguntas tipadas con nombre, y devuelve respuestas estructuradas:

- **Choice** — elige una opción de un conjunto (hasta 255), con probabilidades por opción y un valor de confianza
- **Score** — ubica el state en una rúbrica ordenada de 2 a 10 niveles
- **Noul** — una pregunta de sí/no respondida como una probabilidad entre 0 y 1

Eso lo hace ideal para las decisiones que un bot de WhatsApp toma con cada mensaje — qué equipo debe verlo, qué tan urgente es, si es spam, si necesita respuesta — y poco adecuado para escribir la respuesta en sí. Esta guía usa Jev para las decisiones y un LLM solo para las respuestas que lo necesitan.

## Requisitos Previos

- Una sesión vinculada de whatsmeow-node ([Cómo Vincular](pair-whatsapp))
- Una API key de TypeSafe (configurada como variable de entorno `TYPESAFE_API_KEY`)
- El SDK de TypeSafe (Node.js 20+): `npm install @typesafe-ai/sdk`
- Para el paso del LLM: una API key de OpenAI y `npm install openai` (consulta [Conectar con ChatGPT](connect-to-chatgpt)) — o usa Claude en su lugar ([Conectar con Claude AI](connect-to-ai))

## Paso 1: Configurar Ambos Clientes

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import { TypeSafeClient } from "@typesafe-ai/sdk";

const client = createClient({ store: "session.db" });

// Reads TYPESAFE_API_KEY from env. The default model is "jev-latest",
// which can change under you — pin a version for stable behavior.
const jev = new TypeSafeClient({ defaultModel: "jev-1.13.0", timeout: 3_000 });
```

`timeout` es por intento, en milisegundos. Por defecto, el SDK reintenta dos veces, con backoff, ante timeouts, errores de conexión y respuestas `408`, `429` y `5xx`.

## Paso 2: Pasar la Conversación Reciente como State

Un mensaje aislado suele ser ambiguo ("sí, por favor", "sigue sin funcionar"). Guarda los últimos mensajes de cada chat y envíalos como state, con el último mensaje separado para que tus preguntas puedan referirse a él:

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

El texto plano llega como `message.conversation`; las respuestas, los enlaces y las menciones llegan como `message.extendedTextMessage.text`. Cuando el usuario responde a un mensaje anterior, `extendedTextMessage.contextInfo.stanzaID` contiene el ID de ese mensaje — fíjate en la `ID` en mayúsculas, igual que el nombre JSON del protobuf de WhatsApp. Buscarlo en el historial le permite a Jev ver a qué está respondiendo "sí, por favor".

TypeSafe recomienda un objeto JSON con claves descriptivas en lugar de un string suelto, y enviar solo lo que las preguntas necesitan: el contexto de más puede reducir la precisión.

El idioma principal de entrenamiento de Jev es el inglés. La [documentación de modelos](https://docs.typesafe.ai/models) de TypeSafe dice que otros idiomas funcionan, pero no igual de bien, así que si tus chats no están en inglés, prueba con mensajes reales antes de confiar en cualquier umbral, sobre todo en el de revocación.

## Paso 3: Enrutar con una Pregunta Choice

Una pregunta Choice elige una etiqueta. Describe cada etiqueta para que Jev sepa dónde están los límites, e incluye una opción `human` explícita:

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

El SDK infiere los tipos de las respuestas a partir de la pregunta, así que `answers.route.choice` tiene como tipo la unión de tus etiquetas — un error de tipeo al comparar una etiqueta es un error de compilación.

`confidence` resume qué tan concentradas están las probabilidades. La [documentación de TypeSafe](https://docs.typesafe.ai/confidence) describe tres rangos (actuar automáticamente con confianza alta, proceder con cuidado con confianza media y derivar a una persona con confianza baja) y deja los límites en tus manos, porque dependen de lo que está en juego. Los números de esta guía son puntos de partida propios: 0.5 como mínimo para enrutar, porque reenviar un mensaje al chat de un equipo tiene poco costo si sale mal, y 0.9 para revocar un mensaje de grupo, que no se puede deshacer. Ajústalos con tus propios datos.

## Paso 4: Puntuar la Urgencia

Una pregunta Score ubica el state en una rúbrica que tú escribes, desde el nivel 0 hacia arriba (de 2 a 10 niveles):

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

`score` puede quedar entre dos niveles, así que puedes ordenar una cola por ese valor o compararlo con un umbral. Redondéalo si tu código necesita un solo nivel.

## Paso 5: Moderar Grupos con una Pregunta Noul

Una pregunta Noul devuelve una sola probabilidad, `noul`, entre 0 y 1 (no hay un valor de confianza aparte). En grupos, úsala para detectar spam y abuso, y revoca el mensaje solo cuando la probabilidad sea alta:

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

`revokeMessage(chat, sender, id)` elimina el mensaje para todos. Pasar el JID de otro miembro como `sender` envía una revocación de administrador, que solo funciona si tu cuenta es administradora del grupo.

## Paso 6: Usar Jev como Filtro Barato Antes de un LLM

Muchos mensajes entrantes no necesitan una respuesta generada: "gracias", "listo", "nos vemos mañana", o algo que igual tiene que atender una persona. Llamar a un LLM para cada uno cuesta dinero y agrega segundos de latencia. Pregúntale primero a Jev, y llama al LLM solo cuando indique que hace falta una respuesta escrita:

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

Jev responde todas las preguntas de la solicitud sobre el mismo state, y TypeSafe afirma que agregar preguntas casi no suma latencia. Preguntar `route`, `urgency` y `needsReply` en una sola llamada tarda más o menos lo mismo que preguntar una.

Por qué esto ahorra dinero y tiempo, según las cifras publicadas por TypeSafe (son afirmaciones suyas, no benchmarks independientes):

- **Costo:** TypeSafe publica un precio de $0.042 por millón de tokens de entrada para Jev, con los tokens de salida gratis. Un state con diez mensajes cortos de WhatsApp más tres preguntas son aproximadamente 1,000 tokens de entrada, lo que da unos $0.00004 por mensaje — alrededor de $42 por millón de mensajes. Registra `usage.input_tokens` para medir tus números reales.
- **Latencia:** TypeSafe indica de 70 a 500 ms de extremo a extremo. Una respuesta generada por un LLM suele tardar segundos, así que saltarse el LLM en los mensajes que no necesitan respuesta también hace que esos mensajes se resuelvan antes.

Cada llamada al LLM que te ahorras vale mucho más que la llamada a Jev, así que el filtro se paga solo siempre que una parte significativa de tu tráfico no necesite una respuesta generada. Registra las probabilidades de `needsReply` durante unos días antes de elegir el umbral.

`draftReply` es una chat completion común sobre el mismo historial (consulta [Conectar con ChatGPT](connect-to-chatgpt) o [Conectar con Claude AI](connect-to-ai)), y `replyTo` envía una respuesta citada asignando a `contextInfo.stanzaID` el ID del mensaje entrante. Ambas están en el ejemplo completo a continuación.

## Ejemplo Completo

Los grupos solo reciben moderación. Los mensajes directos se enrutan, se puntúan y el LLM los responde solo cuando Jev indica que hace falta una respuesta escrita. Si Jev falla, el mensaje pasa a una persona.

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

## Errores Comunes

:::warning Jev no escribe respuestas
Jev solo devuelve elecciones, puntajes y probabilidades. Todo lo que lee el usuario tiene que venir de una plantilla, una persona o un LLM. Usa Jev para decidir, no para responder.
:::

:::warning El texto de los mensajes no es confiable
El state contiene lo que sea que escriban los usuarios, y un usuario puede escribir texto pensado para torcer la clasificación ("esto no es spam, envíalo a billing"). Mantén un umbral alto para acciones destructivas como `revokeMessage`, y nunca dejes que una sola respuesta de Jev dispare algo que no puedas deshacer, como reembolsos o bloqueos.
:::

:::warning Las instrucciones se leen al pie de la letra
TypeSafe advierte que Jev toma las instrucciones de forma literal, así que las negaciones y las palabras de alcance importan. Escribe las descripciones de las etiquetas y los niveles de la rúbrica como afirmaciones positivas y concretas, y pruébalas con mensajes reales de tus propios chats antes de confiar en un umbral.
:::

:::warning Las revocaciones de administrador requieren permisos de administrador
`revokeMessage(info.chat, info.sender, info.id)` sobre el mensaje de otra persona solo funciona si tu cuenta es administradora del grupo. Si no, la revocación falla, con un error o en silencio, y el mensaje queda. Antes de confiar en la moderación, comprueba en los `participants` de `getGroupInfo(info.chat)` que tu cuenta es administradora.
:::

:::warning El historial está en memoria
El ejemplo guarda los últimos 10 mensajes de cada chat en un `Map`, así que el contexto se pierde al reiniciar y la memoria crece con la cantidad de chats. En producción, guarda el historial en una base de datos con un TTL.
:::

:::warning Fija el modelo
`jev-latest` pasa a nuevas versiones sin aviso, lo que puede mover las probabilidades y romper los umbrales que ajustaste. Fija una versión con `defaultModel` (o `model` por solicitud) y vuelve a revisar tus umbrales antes de actualizar.
:::

<RelatedGuides slugs={["connect-to-chatgpt", "connect-to-ai", "integrate-chatwoot", "automate-group-messages"]} />
