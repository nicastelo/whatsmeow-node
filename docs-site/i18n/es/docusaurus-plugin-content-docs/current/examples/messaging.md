---
title: Ejemplos de Mensajería
sidebar_label: Mensajería
sidebar_position: 3
description: "Envía mensajes de WhatsApp, responde con citas, @menciona usuarios, agrega reacciones con emoji, y edita o elimina mensajes con Node.js y TypeScript."
keywords: [enviar mensaje whatsapp nodejs, whatsapp respuesta cita nodejs, whatsapp mencion api, whatsapp reaccion editar revocar typescript]
---

# Mensajería

Envío de mensajes de texto, respuestas con citas, @menciones, reacciones, ediciones y revocación de mensajes.

## Enviar un Mensaje de Texto

El ejemplo más simple — envía un mensaje a un número de teléfono.

```typescript
// Wait for connection before sending
await client.connect();
await connected; // Promise that resolves on "connected" event

// Send a simple text message
const resp = await client.sendMessage(jid, {
  conversation: "Hello from whatsmeow-node!",
});
console.log("Sent!", resp);
```

[Código fuente completo: `send-test.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/send-test.ts)

---

## Responder con Cita y @Menciones

Escucha mensajes entrantes y responde con mensajes citados y @menciones.

### Citar un mensaje

Para citar un mensaje, establece `contextInfo.stanzaId` con el ID del mensaje original y `contextInfo.participant` con el JID del remitente:

```typescript
await client.sendRawMessage(info.chat, {
  extendedTextMessage: {
    text: "This is a reply to your message!",
    contextInfo: {
      stanzaId: info.id,           // ID of the message we're replying to
      participant: info.sender,     // Who sent the original
      quotedMessage: {
        conversation: text,         // Original message content (shown in quote bubble)
      },
    },
  },
});
```

### @Mencionar usuarios

Incluye JIDs en `mentionedJid` y usa `@<número>` en el cuerpo del texto:

```typescript
await client.sendRawMessage(info.chat, {
  extendedTextMessage: {
    text: `Hey @${info.sender.split("@")[0]}, you were mentioned!`,
    contextInfo: {
      mentionedJid: [info.sender],
    },
  },
});
```

### Mencionar a todos los miembros del grupo

```typescript
const group = await client.getGroupInfo(info.chat);
const participantJids = group.participants.map((p) => p.jid);
const mentions = participantJids.map((jid) => `@${jid.split("@")[0]}`).join(" ");

await client.sendRawMessage(info.chat, {
  extendedTextMessage: {
    text: `Mentioning everyone: ${mentions}`,
    contextInfo: {
      mentionedJid: participantJids,
    },
  },
});
```

:::info
Citar y mencionar se pueden combinar en un solo mensaje incluyendo tanto `stanzaId`/`participant`/`quotedMessage` como `mentionedJid` en `contextInfo`.
:::

[Código fuente completo: `reply-and-mentions.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/reply-and-mentions.ts)

---

## Reacciones, Ediciones y Revocaciones

Envía reacciones, edita mensajes y elimina mensajes para todos.

### Reacciones

```typescript
// Add a reaction
await client.sendReaction(jid, myJid, sent.id, "👍");

// Change a reaction (replaces previous)
await client.sendReaction(jid, myJid, sent.id, "🚀");

// Remove a reaction (empty string)
await client.sendReaction(jid, myJid, sent.id, "");
```

### Editar un mensaje

```typescript
// Only works on messages you sent
await client.editMessage(jid, sent.id, {
  conversation: "This message was edited!",
});
```

### Revocar (eliminar) un mensaje

```typescript
// Deletes for everyone in the chat
// Only works on your own messages within the time limit
await client.revokeMessage(jid, myJid, sent.id);
```

:::warning
`sendReaction()` toma cuatro argumentos: el JID del chat, el **remitente** del mensaje al que se reacciona (tu propio JID si reaccionas a tu propio mensaje), el ID del mensaje y el emoji.
:::

[Código fuente completo: `reactions-and-edits.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/reactions-and-edits.ts)
