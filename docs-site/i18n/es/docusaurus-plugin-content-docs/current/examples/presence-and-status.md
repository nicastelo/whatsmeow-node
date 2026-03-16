---
title: Presencia y Estado
sidebar_position: 6
description: "Controla el estado en línea de WhatsApp, indicadores de escritura, configuración de privacidad y mensajes que desaparecen con Node.js y whatsmeow-node."
keywords: [whatsapp indicador escribiendo api, whatsapp estado en linea nodejs, whatsapp configuracion privacidad api, whatsapp mensajes desaparecen nodejs]
---

# Presencia y Estado

:::tip Buscas un tutorial paso a paso?
Consulta [Cómo Mostrar Indicadores de Escritura](/docs/guides/typing-indicators).
:::

Estado en línea/fuera de línea, indicadores de escritura, configuración de privacidad y mensajes que desaparecen.

## Presencia e Indicadores de Escritura

### Establecer tu estado en línea

```typescript
// Appear online
await client.sendPresence("available");

// Appear offline
await client.sendPresence("unavailable");
```

### Mostrar indicadores de escritura

```typescript
// Show "typing..." in a chat
await client.sendChatPresence(chatJid, "composing");

// Show "recording audio..." in a chat
await client.sendChatPresence(chatJid, "composing", "audio");

// Clear the indicator
await client.sendChatPresence(chatJid, "paused");
```

:::info
El indicador de escritura se limpia automáticamente cuando envías un mensaje. Solo necesitas enviar `"paused"` manualmente si quieres detener el indicador sin enviar un mensaje.
:::

### Suscribirse a la presencia de otro usuario

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

[Código fuente completo: `presence-typing.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/presence-typing.ts)

---

## Configuración de Privacidad

Ver y modificar configuraciones de privacidad, visibilidad de estado y lista de bloqueo.

### Ver configuración actual

```typescript
const privacy = await client.getPrivacySettings();
console.log(`Last seen: ${privacy.lastSeen}`);
console.log(`Profile photo: ${privacy.profile}`);
console.log(`Read receipts: ${privacy.readReceipts}`);
// Also: groupAdd, status, callAdd, online, messages, defense, stickers
```

### Modificar una configuración

```typescript
// Hide last seen from everyone
await client.setPrivacySetting("last", "none");

// Only contacts can see your profile photo
await client.setPrivacySetting("profile", "contacts");

// Disable read receipts (no blue ticks)
await client.setPrivacySetting("readreceipts", "none");
```

:::warning
Los nombres de las configuraciones de privacidad usan **valores de protocolo**, no camelCase: `"groupadd"`, `"last"`, `"readreceipts"`, `"calladd"`. Consulta la lista completa en el archivo fuente.
:::

### Privacidad de estado y lista de bloqueo

```typescript
// Who can see your status updates
const statusPrivacy = await client.getStatusPrivacy();

// View blocked contacts
const blocklist = await client.getBlocklist();

// Block / unblock
await client.updateBlocklist("5989XXXXXXXX@s.whatsapp.net", "block");
await client.updateBlocklist("5989XXXXXXXX@s.whatsapp.net", "unblock");
```

[Código fuente completo: `privacy-settings.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/privacy-settings.ts)

---

## Mensajes que Desaparecen

Establece temporizadores de auto-eliminación para chats.

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
WhatsApp solo soporta valores de temporizador específicos: 0 (desactivado), 86400 (24h), 604800 (7d), 7776000 (90d). Otros valores pueden ser redondeados silenciosamente o rechazados.
:::

:::info
Como whatsmeow se conecta como un dispositivo vinculado (no el teléfono principal), algunos destinatarios pueden ver advertencias de "Este mensaje no desaparecerá" para el primer mensaje después de un cambio de temporizador. Esto es un comportamiento del protocolo de WhatsApp, no un error de la librería.
:::

[Código fuente completo: `disappearing-messages.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/disappearing-messages.ts)
