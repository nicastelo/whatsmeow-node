---
title: Presenca e Status
sidebar_position: 6
description: "Controle o status online do WhatsApp, indicadores de digitacao, configuracoes de privacidade e mensagens temporarias com Node.js e whatsmeow-node."
keywords: [whatsapp indicador digitacao api, whatsapp status online nodejs, whatsapp configuracoes privacidade api, whatsapp mensagens temporarias nodejs]
---

# Presenca e Status

:::tip Procurando um tutorial passo a passo?
Veja [Como Mostrar Indicadores de Digitacao](/docs/guides/typing-indicators).
:::

Status online/offline, indicadores de digitacao, configuracoes de privacidade e mensagens temporarias.

## Presenca e Indicadores de Digitacao

### Definir seu status online

```typescript
// Appear online
await client.sendPresence("available");

// Appear offline
await client.sendPresence("unavailable");
```

### Mostrar indicadores de digitacao

```typescript
// Show "typing..." in a chat
await client.sendChatPresence(chatJid, "composing");

// Show "recording audio..." in a chat
await client.sendChatPresence(chatJid, "composing", "audio");

// Clear the indicator
await client.sendChatPresence(chatJid, "paused");
```

:::info
O indicador de digitacao e removido automaticamente quando voce envia uma mensagem. Voce so precisa enviar `"paused"` manualmente se quiser parar o indicador sem enviar uma mensagem.
:::

### Inscrever-se na presenca de outro usuario

```typescript
// Subscribe to online/offline updates
await client.subscribePresence(watchJid);

// Listen for presence changes
client.on("presence", ({ jid, presence, lastSeen }) => {
  console.log(`${jid}: ${presence} (last seen: ${lastSeen})`);
});

// Listen for typing indicators
client.on("chat_presence", ({ chat, sender, state, media }) => {
  const action = state === "composing"
    ? (media === "audio" ? "recording audio" : "typing")
    : "stopped typing";
  console.log(`${sender} is ${action} in ${chat}`);
});
```

[Codigo fonte completo: `presence-typing.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/presence-typing.ts)

---

## Configuracoes de Privacidade

Visualize e modifique configuracoes de privacidade, visibilidade de status e lista de bloqueio.

### Ver configuracoes atuais

```typescript
const privacy = await client.getPrivacySettings();
console.log(`Last seen: ${privacy.lastSeen}`);
console.log(`Profile photo: ${privacy.profile}`);
console.log(`Read receipts: ${privacy.readReceipts}`);
// Also: groupAdd, status, callAdd, online, messages, defense, stickers
```

### Modificar uma configuracao

```typescript
// Hide last seen from everyone
await client.setPrivacySetting("last", "none");

// Only contacts can see your profile photo
await client.setPrivacySetting("profile", "contacts");

// Disable read receipts (no blue ticks)
await client.setPrivacySetting("readreceipts", "none");
```

:::warning
Os nomes das configuracoes de privacidade usam **valores do protocolo**, nao camelCase: `"groupadd"`, `"last"`, `"readreceipts"`, `"calladd"`. Veja a lista completa no arquivo fonte.
:::

### Privacidade de status e lista de bloqueio

```typescript
// Who can see your status updates
const statusPrivacy = await client.getStatusPrivacy();

// View blocked contacts
const blocklist = await client.getBlocklist();

// Block / unblock
await client.updateBlocklist("5989XXXXXXXX@s.whatsapp.net", "block");
await client.updateBlocklist("5989XXXXXXXX@s.whatsapp.net", "unblock");
```

[Codigo fonte completo: `privacy-settings.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/privacy-settings.ts)

---

## Mensagens Temporarias

Defina temporizadores de exclusao automatica para chats.

```typescript
const TIMER = {
  OFF: 0,
  DAY: 86400,     // 24 hours
  WEEK: 604800,   // 7 days
  QUARTER: 7776000, // 90 days
};

// Set default timer for all new chats
await client.setDefaultDisappearingTimer(TIMER.DAY);

// Set timer for a specific chat (overrides default)
await client.setDisappearingTimer(jid, TIMER.WEEK);

// Disable for a specific chat
await client.setDisappearingTimer(jid, TIMER.OFF);
```

:::warning
O WhatsApp suporta apenas valores especificos de temporizador: 0 (desativado), 86400 (24h), 604800 (7d), 7776000 (90d). Outros valores podem ser silenciosamente arredondados ou rejeitados.
:::

:::info
Como o whatsmeow conecta como um dispositivo vinculado (nao o telefone principal), alguns destinatarios podem ver avisos de "Esta mensagem nao vai desaparecer" na primeira mensagem apos uma mudanca de temporizador. Isso e um comportamento do protocolo WhatsApp, nao um bug da biblioteca.
:::

[Codigo fonte completo: `disappearing-messages.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/disappearing-messages.ts)
