---
title: "Como Transcrever Áudios do WhatsApp com IA"
sidebar_label: Transcrever Áudios
sidebar_position: 28
description: "Transcreva automaticamente os áudios recebidos no WhatsApp com a API de speech-to-text da OpenAI e responda com a transcrição, usando whatsmeow-node e Node.js."
keywords: [transcrever áudios whatsapp, áudio do whatsapp para texto, bot transcrição de áudio whatsapp, whatsapp voz para texto nodejs, transcrição openai whatsapp, bot de áudio whatsapp typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/transcribe-voice-notes.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/transcribe-voice-notes.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Transcrever Áudios do WhatsApp com IA",
      "description": "Transcreva automaticamente os áudios recebidos no WhatsApp com a API de speech-to-text da OpenAI e responda com a transcrição, usando whatsmeow-node e Node.js.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/transcribe-voice-notes.png",
      "step": [
        {"@type": "HowToStep", "name": "Configurar os Dois Clients", "text": "Inicialize o WhatsmeowClient com createClient() e o client da OpenAI com new OpenAI()."},
        {"@type": "HowToStep", "name": "Detectar Áudios de Voz", "text": "Escute o evento message e verifique se há um audioMessage com PTT igual a true."},
        {"@type": "HowToStep", "name": "Baixar o Áudio", "text": "Chame downloadAny() para descriptografar o áudio em um arquivo temporário e renomeie-o com a extensão .ogg."},
        {"@type": "HowToStep", "name": "Transcrever com a OpenAI", "text": "Envie o arquivo para openai.audio.transcriptions.create() com o modelo gpt-transcribe."},
        {"@type": "HowToStep", "name": "Responder com a Transcrição", "text": "Envie o texto como resposta citada usando contextInfo.stanzaID e participant, e depois apague o arquivo temporário."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Transcrever Áudios do WhatsApp com IA",
      "description": "Transcreva automaticamente os áudios recebidos no WhatsApp com a API de speech-to-text da OpenAI e responda com a transcrição, usando whatsmeow-node e Node.js.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/transcribe-voice-notes.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Transcrever Áudios do WhatsApp com IA](/img/guides/pt-BR/transcribe-voice-notes.png)
![Como Transcrever Áudios do WhatsApp com IA](/img/guides/pt-BR/transcribe-voice-notes-light.png)

# Como Transcrever Áudios do WhatsApp com IA

Nem sempre dá para ouvir um áudio na hora. Este guia cria um bot que pega os áudios de voz recebidos no WhatsApp, transcreve com a API de speech-to-text da OpenAI e responde com a transcrição citando o áudio original. Em grupos, ele só transcreve quando alguém pede.

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

const TRANSCRIBE_MODEL = "gpt-transcribe";
```

`gpt-transcribe` é o modelo recomendado pela OpenAI para transcrever fala gravada. `gpt-4o-transcribe` e `gpt-4o-mini-transcribe` também funcionam. Use `whisper-1` se precisar de timestamps por palavra ou formatos de legenda (SRT/VTT). Veja o [guia de speech-to-text da OpenAI](https://developers.openai.com/api/docs/guides/speech-to-text) para a lista atual.

## Passo 2: Detectar Áudios de Voz Recebidos

Áudios de voz e arquivos de áudio comuns chegam como `audioMessage`. A diferença é o flag `PTT` ("push to talk"), que usa o casing exato do proto, tudo em maiúsculas:

```typescript
interface AudioMessage {
  PTT?: boolean;
  seconds?: number;
  mimetype?: string;
  fileLength?: string; // uint64 → string in protojson
}

function getVoiceNote(message: Record<string, unknown>): AudioMessage | null {
  const audio = message.audioMessage as AudioMessage | undefined;
  return audio?.PTT ? audio : null;
}
```

As mensagens são serializadas a partir do protobuf `waE2E.Message` com protojson, então inteiros de 64 bits como `fileLength` chegam como **strings**, enquanto `seconds` é um número. Áudios de voz normalmente têm `mimetype` igual a `audio/ogg; codecs=opus`.

## Passo 3: Baixar o Áudio

```typescript
import { rename } from "node:fs/promises";

const tempPath = await client.downloadAny({ audioMessage: message.audioMessage });
const oggPath = `${tempPath}.ogg`;
await rename(tempPath, oggPath);
```

`downloadAny()` descriptografa a mídia e salva em um arquivo temporário. O arquivo **não tem extensão**, e a OpenAI precisa de metadados de formato suficientes para identificar o áudio (ela recomenda um nome de arquivo com extensão), então renomeie para `.ogg` antes de enviar. (Veja [Como Baixar Mídia](download-media) para mais detalhes sobre `downloadAny()`.)

## Passo 4: Transcrever com a OpenAI

Junte o download e a chamada à API em uma única função. O bloco `finally` apaga o arquivo temporário tanto se a transcrição der certo quanto se falhar:

```typescript
import { createReadStream } from "node:fs";
import { rename, stat, unlink } from "node:fs/promises";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // OpenAI's per-file limit

async function transcribe(message: Record<string, unknown>): Promise<string> {
  // Downloads + decrypts to a temp file with no extension
  const tempPath = await client.downloadAny(message);
  const oggPath = `${tempPath}.ogg`;
  await rename(tempPath, oggPath);

  try {
    const { size } = await stat(oggPath);
    if (size > MAX_UPLOAD_BYTES) {
      throw new Error(`Voice note too large (${size} bytes)`);
    }

    const result = await openai.audio.transcriptions.create({
      file: createReadStream(oggPath),
      model: TRANSCRIBE_MODEL,
    });
    return result.text.trim();
  } finally {
    await unlink(oggPath).catch(() => {});
  }
}
```

A [referência da API de transcrição](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create) lista `ogg` como formato de entrada suportado (junto com `flac`, `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav` e `webm`), então você não precisa do ffmpeg para converter o áudio Opus do WhatsApp. Se algum modelo rejeitar o arquivo por formato não suportado, converta para MP3 com o ffmpeg e envie esse arquivo.

## Passo 5: Responder com a Transcrição

Cite o áudio original para deixar claro a qual áudio a transcrição pertence. Os campos de `contextInfo` usam o casing exato do proto: `stanzaID` (não `stanzaId`) e `participant`:

```typescript
await client.sendChatPresence(info.chat, "composing"); // show "typing..." while transcribing

const text = await transcribe({ audioMessage: message.audioMessage });

await client.sendMessage(info.chat, {
  extendedTextMessage: {
    text: `Transcript: ${text || "(no speech detected)"}`,
    contextInfo: {
      stanzaID: info.id,
      participant: info.sender,
      quotedMessage: { audioMessage: message.audioMessage },
    },
  },
});
```

Os indicadores de digitação podem não aparecer se você não chamou `sendPresence("available")` antes, por isso o exemplo completo define o status logo após conectar. Enviar a mensagem limpa o indicador de digitação automaticamente. Se você for responder com um áudio próprio, use `sendChatPresence(info.chat, "composing", "audio")` para mostrar "gravando áudio..." — veja [Indicadores de Digitação](typing-indicators).

## Passo 6: Tratar Grupos

Transcrever todo áudio em um grupo movimentado gera ruído e gasta créditos da API, e áudios não podem @mencionar ninguém. Um padrão mais amigável: transcrever só quando um membro responde a um áudio com `!transcribe`. O áudio citado está disponível no `contextInfo` da resposta:

```typescript
const GROUP_COMMAND = "!transcribe";

interface VoiceNote {
  /** A message object containing only the audioMessage — what downloadAny() needs. */
  message: Record<string, unknown>;
  /** ID and sender of the voice note, for the quoted reply. */
  stanzaID: string;
  participant: string;
}

function getQuotedVoiceNote(message: Record<string, unknown>): VoiceNote | null {
  const ext = message.extendedTextMessage as
    | {
        text?: string;
        contextInfo?: {
          stanzaID?: string;
          participant?: string;
          quotedMessage?: Record<string, unknown>;
        };
      }
    | undefined;
  if (ext?.text?.trim().toLowerCase() !== GROUP_COMMAND) return null;

  const ctx = ext.contextInfo;
  if (!ctx?.quotedMessage || !ctx.stanzaID || !ctx.participant) return null;
  if (!getVoiceNote(ctx.quotedMessage)) return null;

  return {
    message: { audioMessage: ctx.quotedMessage.audioMessage },
    stanzaID: ctx.stanzaID,
    participant: ctx.participant,
  };
}
```

A resposta então cita o **áudio** (usando o `stanzaID` e o `participant` da mensagem citada), não o comando `!transcribe`.

## Opcional: Responder ao Áudio com um LLM

Uma transcrição é só texto, então você pode passá-la para um chatbot e responder ao áudio em vez de (ou além de) transcrevê-lo:

```typescript
const transcript = await transcribe({ audioMessage: message.audioMessage });

const response = await openai.chat.completions.create({
  model: "gpt-6-astra",
  messages: [
    { role: "system", content: "You are a helpful WhatsApp assistant. Reply concisely." },
    { role: "user", content: transcript },
  ],
});

await client.sendMessage(info.chat, {
  conversation: response.choices[0].message.content ?? "I couldn't generate a response.",
});
```

Para histórico de conversas por usuário e tratamento de erros, veja [Como Conectar o WhatsApp ao ChatGPT](connect-to-chatgpt).

## Exemplo Completo

Transcreve todos os áudios em conversas privadas e, em grupos, os áudios citados com `!transcribe`:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import OpenAI from "openai";
import { createReadStream } from "node:fs";
import { rename, stat, unlink } from "node:fs/promises";

const client = createClient({ store: "session.db" });
const openai = new OpenAI(); // reads OPENAI_API_KEY from env

const TRANSCRIBE_MODEL = "gpt-transcribe";
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // OpenAI's per-file limit
const GROUP_COMMAND = "!transcribe";

interface AudioMessage {
  PTT?: boolean;
  seconds?: number;
  mimetype?: string;
  fileLength?: string; // uint64 → string in protojson
}

interface VoiceNote {
  /** A message object containing only the audioMessage — what downloadAny() needs. */
  message: Record<string, unknown>;
  /** ID and sender of the voice note, for the quoted reply. */
  stanzaID: string;
  participant: string;
}

function getVoiceNote(message: Record<string, unknown>): AudioMessage | null {
  const audio = message.audioMessage as AudioMessage | undefined;
  return audio?.PTT ? audio : null;
}

/** In groups: find a voice note quoted by a "!transcribe" reply. */
function getQuotedVoiceNote(message: Record<string, unknown>): VoiceNote | null {
  const ext = message.extendedTextMessage as
    | {
        text?: string;
        contextInfo?: {
          stanzaID?: string;
          participant?: string;
          quotedMessage?: Record<string, unknown>;
        };
      }
    | undefined;
  if (ext?.text?.trim().toLowerCase() !== GROUP_COMMAND) return null;

  const ctx = ext.contextInfo;
  if (!ctx?.quotedMessage || !ctx.stanzaID || !ctx.participant) return null;
  if (!getVoiceNote(ctx.quotedMessage)) return null;

  return {
    message: { audioMessage: ctx.quotedMessage.audioMessage },
    stanzaID: ctx.stanzaID,
    participant: ctx.participant,
  };
}

async function transcribe(message: Record<string, unknown>): Promise<string> {
  // Downloads + decrypts to a temp file with no extension
  const tempPath = await client.downloadAny(message);
  const oggPath = `${tempPath}.ogg`;
  await rename(tempPath, oggPath);

  try {
    const { size } = await stat(oggPath);
    if (size > MAX_UPLOAD_BYTES) {
      throw new Error(`Voice note too large (${size} bytes)`);
    }

    const result = await openai.audio.transcriptions.create({
      file: createReadStream(oggPath),
      model: TRANSCRIBE_MODEL,
    });
    return result.text.trim();
  } finally {
    await unlink(oggPath).catch(() => {});
  }
}

async function replyWithTranscript(chat: string, note: VoiceNote, text: string) {
  await client.sendMessage(chat, {
    extendedTextMessage: {
      text: `Transcript: ${text || "(no speech detected)"}`,
      contextInfo: {
        stanzaID: note.stanzaID,
        participant: note.participant,
        quotedMessage: note.message,
      },
    },
  });
}

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  let note: VoiceNote | null = null;
  if (!info.isGroup && getVoiceNote(message)) {
    // Direct chats: transcribe every voice note automatically
    note = {
      message: { audioMessage: message.audioMessage },
      stanzaID: info.id,
      participant: info.sender,
    };
  } else if (info.isGroup) {
    // Groups: only transcribe when someone replies "!transcribe" to a voice note
    note = getQuotedVoiceNote(message);
  }
  if (!note) return;

  console.log(`Voice note from ${info.pushName} in ${info.chat}`);

  // Async listeners must catch their own errors, or a failed call becomes an unhandled rejection
  try {
    await client.sendChatPresence(info.chat, "composing");
    const text = await transcribe(note.message);
    await replyWithTranscript(info.chat, note, text);
    console.log(`→ ${text.slice(0, 80)}`);
  } catch (err) {
    console.error("Transcription failed:", err);
    await client
      .sendMessage(info.chat, { conversation: "Sorry, I couldn't transcribe that voice note." })
      .catch((e) => console.error("Failed to send error reply:", e));
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
  await client.sendPresence("available"); // needed for the typing indicator to show
  console.log("Voice note transcriber is online!");

  process.on("SIGINT", async () => {
    try {
      await client.sendPresence("unavailable");
      await client.disconnect();
    } catch (err) {
      console.error("Shutdown error:", err);
    } finally {
      client.close();
      process.exit(0);
    }
  });
}

main().catch(console.error);
```

## Transcrição Local

Se você não pode enviar áudio para uma API de terceiros (privacidade, custo ou uso offline), pode rodar um modelo Whisper open source no seu próprio hardware — por exemplo [whisper.cpp](https://github.com/ggml-org/whisper.cpp) ou [faster-whisper](https://github.com/SYSTRAN/faster-whisper). A parte do WhatsApp continua igual: baixe com `downloadAny()`, passe o caminho do arquivo para o seu transcritor local (normalmente via processo filho ou um pequeno serviço HTTP) e responda com o texto. Algumas ferramentas locais só aceitam WAV, então talvez seja preciso converter o áudio Opus com o ffmpeg antes.

## Erros Comuns

:::warning Arquivos temporários não têm extensão
`downloadAny()` grava em um arquivo temporário sem extensão. A OpenAI precisa de metadados de formato suficientes para identificar o áudio e recomenda um nome de arquivo com extensão, então renomeie o arquivo para `.ogg` (ou envie com `toFile(buffer, "voice.ogg")` do pacote `openai`). Sem ela, a requisição pode ser rejeitada por formato não suportado.
:::

:::warning Limite de upload de 25 MB
A API de transcrição da OpenAI aceita arquivos de até 25 MB. Com o bitrate dos áudios do WhatsApp isso é uma gravação muito longa, mas verifique o tamanho (ou `audioMessage.seconds`) antes de enviar e ignore ou divida o que for grande demais. *Arquivos* de áudio encaminhados podem ser bem maiores que áudios de voz.
:::

:::warning Sempre limpe os arquivos temporários
Cada download cria um novo arquivo temporário. Apague-o em um bloco `finally` — caso contrário, um bot movimentado vai enchendo o disco, e você guarda mensagens de voz privadas por mais tempo que o necessário.
:::

:::warning Casing: `PTT` e `stanzaID`
Os campos das mensagens usam o casing exato do proto. É `audioMessage.PTT`, não `ptt`, e `contextInfo.stanzaID`, não `stanzaId`. Casing errado em mensagens recebidas retorna `undefined` silenciosamente; em mensagens enviadas é rejeitado com um erro `unknown field`.
:::

:::warning Grupos e privacidade
Transcrever automaticamente todo áudio de um grupo publica o áudio privado de outras pessoas como texto para todos lerem. Transcreva só quando pedirem (como no Passo 6) e garanta que os membros saibam que um bot processa os áudios deles com uma API de terceiros.
:::

<RelatedGuides slugs={["connect-to-chatgpt", "download-media", "typing-indicators", "connect-to-ollama"]} />
