---
title: "How to Transcribe WhatsApp Voice Notes with AI"
sidebar_label: Transcribe Voice Notes
sidebar_position: 28
description: "Automatically transcribe incoming WhatsApp voice notes with OpenAI speech-to-text and reply with the transcript, using whatsmeow-node and Node.js."
keywords: [transcribe whatsapp voice notes, whatsapp voice message to text, whatsapp audio transcription bot, whatsapp speech to text nodejs, openai transcription whatsapp, whatsapp voice note bot typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/transcribe-voice-notes.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/transcribe-voice-notes.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Transcribe WhatsApp Voice Notes with AI",
      "description": "Automatically transcribe incoming WhatsApp voice notes with OpenAI speech-to-text and reply with the transcript, using whatsmeow-node and Node.js.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/transcribe-voice-notes.png",
      "step": [
        {"@type": "HowToStep", "name": "Set Up Both Clients", "text": "Initialize WhatsmeowClient with createClient() and the OpenAI client with new OpenAI()."},
        {"@type": "HowToStep", "name": "Detect Voice Notes", "text": "Listen for the message event and check for an audioMessage with PTT set to true."},
        {"@type": "HowToStep", "name": "Download the Audio", "text": "Call downloadAny() to decrypt the voice note to a temp file, then rename it with an .ogg extension."},
        {"@type": "HowToStep", "name": "Transcribe with OpenAI", "text": "Send the file to openai.audio.transcriptions.create() with the gpt-transcribe model."},
        {"@type": "HowToStep", "name": "Reply with the Transcript", "text": "Send the text back as a quoted reply using contextInfo.stanzaID and participant, then delete the temp file."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Transcribe WhatsApp Voice Notes with AI",
      "description": "Automatically transcribe incoming WhatsApp voice notes with OpenAI speech-to-text and reply with the transcript, using whatsmeow-node and Node.js.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/transcribe-voice-notes.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Transcribe WhatsApp Voice Notes with AI](/img/guides/transcribe-voice-notes.png)
![How to Transcribe WhatsApp Voice Notes with AI](/img/guides/transcribe-voice-notes-light.png)

# How to Transcribe WhatsApp Voice Notes with AI

Not everyone can listen to a voice note right away. This guide builds a bot that picks up incoming WhatsApp voice notes, transcribes them with OpenAI's speech-to-text API, and replies with the transcript quoted under the original audio. In groups, it only transcribes on request.

## Prerequisites

- A paired whatsmeow-node session ([How to Pair](pair-whatsapp))
- An OpenAI API key (set as `OPENAI_API_KEY` environment variable)
- The OpenAI SDK: `npm install openai`

## Step 1: Set Up Both Clients

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import OpenAI from "openai";

const client = createClient({ store: "session.db" });
const openai = new OpenAI(); // reads OPENAI_API_KEY from env

const TRANSCRIBE_MODEL = "gpt-transcribe";
```

`gpt-transcribe` is OpenAI's recommended model for transcribing recorded speech. `gpt-4o-transcribe` and `gpt-4o-mini-transcribe` also work here. Use `whisper-1` if you need word timestamps or subtitle formats (SRT/VTT). See [OpenAI's speech-to-text guide](https://developers.openai.com/api/docs/guides/speech-to-text) for the current list.

## Step 2: Detect Incoming Voice Notes

Voice notes and regular audio files both arrive as `audioMessage`. The difference is the `PTT` ("push to talk") flag, which uses the exact proto casing, all uppercase:

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

Messages are serialized from the `waE2E.Message` protobuf with protojson, so 64-bit integers like `fileLength` come through as **strings**, while `seconds` is a number. Voice notes usually have a `mimetype` of `audio/ogg; codecs=opus`.

## Step 3: Download the Voice Note

```typescript
import { rename } from "node:fs/promises";

const tempPath = await client.downloadAny({ audioMessage: message.audioMessage });
const oggPath = `${tempPath}.ogg`;
await rename(tempPath, oggPath);
```

`downloadAny()` decrypts the media and saves it to a temp file. The file has **no extension**, and OpenAI needs enough format metadata to identify the audio (it recommends an extension-bearing filename), so rename it to `.ogg` before uploading. (See [How to Download Media](download-media) for more on `downloadAny()`.)

## Step 4: Transcribe with OpenAI

Combine the download and the API call into one function. The `finally` block deletes the temp file whether transcription succeeds or not:

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

The [transcription API reference](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create) lists `ogg` as a supported input (along with `flac`, `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, and `webm`), so you don't need ffmpeg to convert WhatsApp's Opus audio. If a model ever rejects the file as an unsupported format, convert it to MP3 with ffmpeg and upload that instead.

## Step 5: Reply with the Transcript

Quote the original voice note so it's clear which audio the transcript belongs to. `contextInfo` fields use exact proto casing: `stanzaID` (not `stanzaId`) and `participant`:

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

Typing indicators may not appear until you've called `sendPresence("available")`, so the complete example sets it right after connecting. Sending the message clears the typing indicator automatically. If you plan to answer with a voice note of your own instead, use `sendChatPresence(info.chat, "composing", "audio")` to show "recording audio..." — see [Typing Indicators](typing-indicators).

## Step 6: Handle Groups

Transcribing every voice note in a busy group is noisy and burns API credits, and voice notes can't @mention anyone. A friendlier pattern: transcribe only when a member replies to a voice note with `!transcribe`. The quoted voice note is available in the reply's `contextInfo`:

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

The reply then quotes the **voice note** (using the quoted message's `stanzaID` and `participant`), not the `!transcribe` command.

## Optional: Reply to the Voice Note with an LLM

A transcript is just text, so you can feed it into a chatbot and answer the voice note instead of (or in addition to) transcribing it:

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

For per-user conversation history and error handling, see [How to Connect WhatsApp to ChatGPT](connect-to-chatgpt).

## Complete Example

Transcribes every voice note in direct chats, and voice notes quoted with `!transcribe` in groups:

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

## Running Transcription Locally

If you can't send audio to a third-party API (privacy, cost, or offline use), you can run an open-source Whisper model on your own hardware instead — for example [whisper.cpp](https://github.com/ggml-org/whisper.cpp) or [faster-whisper](https://github.com/SYSTRAN/faster-whisper). The WhatsApp side stays the same: download with `downloadAny()`, pass the file path to your local transcriber (usually via a child process or a small HTTP service), and reply with the text. Some local tools only accept WAV input, so you may need to convert the Opus audio with ffmpeg first.

## Common Pitfalls

:::warning Temp files have no extension
`downloadAny()` writes to a temp file without an extension. OpenAI needs enough format metadata to identify the audio and recommends an extension-bearing filename, so rename the file to `.ogg` (or upload it with `toFile(buffer, "voice.ogg")` from the `openai` package). Without it, the request may be rejected as an unsupported format.
:::

:::warning 25 MB upload limit
The OpenAI transcription API accepts files up to 25 MB. At WhatsApp's voice note bitrate, that's a very long recording, but check the size (or `audioMessage.seconds`) before uploading and skip or split anything too large. Forwarded audio *files* can be much bigger than voice notes.
:::

:::warning Always clean up temp files
Every download creates a new temp file. Delete it in a `finally` block — otherwise a busy bot slowly fills the disk, and you keep private voice messages around longer than necessary.
:::

:::warning Casing: `PTT` and `stanzaID`
Message fields use exact proto casing. It's `audioMessage.PTT`, not `ptt`, and `contextInfo.stanzaID`, not `stanzaId`. Wrong casing on received messages silently returns `undefined`; wrong casing on sent messages is rejected with an `unknown field` error.
:::

:::warning Groups and privacy
Auto-transcribing every voice note in a group posts other people's private audio as text for everyone to read. Transcribe only on request (as in Step 6), and make sure members know a bot is processing their audio with a third-party API.
:::

<RelatedGuides slugs={["connect-to-chatgpt", "download-media", "typing-indicators", "connect-to-ollama"]} />
