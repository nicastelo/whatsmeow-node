---
title: Exemplos de Mensagens
sidebar_label: Mensagens
sidebar_position: 3
description: "Envie mensagens no WhatsApp, responda com citacoes, mencione usuarios com @, adicione reacoes com emoji e edite ou exclua mensagens com Node.js e TypeScript."
keywords: [enviar mensagem whatsapp nodejs, whatsapp resposta citacao nodejs, whatsapp mencao api, whatsapp reagir editar revogar typescript]
---

# Mensagens

Envio de mensagens de texto, respostas com citacoes, @mencoes, reacoes, edicoes e revogacao de mensagens.

## Enviar uma Mensagem de Texto

O exemplo mais simples — enviar uma mensagem para um numero de telefone.

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

[Codigo fonte completo: `send-test.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/send-test.ts)

---

## Resposta com Citacao e @Mencoes

Ouca mensagens recebidas e responda com mensagens citadas e @mencoes.

### Citando uma mensagem

Para citar uma mensagem, defina `contextInfo.stanzaId` com o ID da mensagem original e `contextInfo.participant` com o JID do remetente:

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

### Mencionando usuarios com @

Inclua JIDs em `mentionedJid` e use `@<numero>` no corpo do texto:

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

### Mencionar todos os membros do grupo

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
Citacao e mencao podem ser combinadas em uma unica mensagem incluindo tanto `stanzaId`/`participant`/`quotedMessage` quanto `mentionedJid` em `contextInfo`.
:::

[Codigo fonte completo: `reply-and-mentions.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/reply-and-mentions.ts)

---

## Reacoes, Edicoes e Revogacoes

Envie reacoes, edite mensagens e exclua mensagens para todos.

### Reacoes

```typescript
// Add a reaction
await client.sendReaction(jid, myJid, sent.id, "👍");

// Change a reaction (replaces previous)
await client.sendReaction(jid, myJid, sent.id, "🚀");

// Remove a reaction (empty string)
await client.sendReaction(jid, myJid, sent.id, "");
```

### Editando uma mensagem

```typescript
// Only works on messages you sent
await client.editMessage(jid, sent.id, {
  conversation: "This message was edited!",
});
```

### Revogando (excluindo) uma mensagem

```typescript
// Deletes for everyone in the chat
// Only works on your own messages within the time limit
await client.revokeMessage(jid, myJid, sent.id);
```

:::warning
`sendReaction()` recebe quatro argumentos: o JID do chat, o **remetente** da mensagem que esta recebendo a reacao (seu proprio JID se for reagir a sua propria mensagem), o ID da mensagem e o emoji.
:::

[Codigo fonte completo: `reactions-and-edits.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/reactions-and-edits.ts)
