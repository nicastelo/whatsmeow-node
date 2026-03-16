---
title: Ejemplos Avanzados
sidebar_label: Avanzado
sidebar_position: 7
description: "Crea encuestas de WhatsApp, administra canales de newsletter, envía ubicaciones y tarjetas de contacto, y busca usuarios con Node.js y TypeScript."
keywords: [whatsapp encuesta api nodejs, whatsapp newsletter canal api, whatsapp mensaje ubicacion api, whatsapp tarjeta contacto vcard nodejs]
---

# Avanzado

Encuestas, newsletters (canales), compartir ubicación, tarjetas de contacto y búsqueda de contactos.

## Encuestas

Crea encuestas y descifra votos de encuestas entrantes.

### Crear una encuesta

```typescript
// sendPollCreation(jid, question, options, selectableCount)
//   selectableCount: 0 = unlimited, 1 = single choice, N = multi-choice up to N
const poll = await client.sendPollCreation(
  jid,
  "What's your favorite programming language?",
  ["TypeScript", "Go", "Rust", "Python"],
  1, // single choice
);
console.log(`Poll created (id: ${poll.id})`);
```

### Descifrar votos de encuestas

Los votos de encuestas están cifrados de extremo a extremo. Usa `decryptPollVote()` para ver las opciones seleccionadas:

```typescript
client.on("message", async ({ info, message }) => {
  const pollUpdate = message.pollUpdateMessage;
  if (!pollUpdate) return;

  const decrypted = await client.decryptPollVote(info, message);
  console.log("Vote:", JSON.stringify(decrypted, null, 2));
});
```

[Código fuente completo: `polls.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/polls.ts)

---

## Newsletters (Canales)

Administra Canales de WhatsApp — suscríbete, obtén mensajes, reacciona y crea.

### Listar canales suscritos

```typescript
const newsletters = await client.getSubscribedNewsletters();
for (const nl of newsletters) {
  console.log(`${nl.name} (${nl.id})`);
}
```

### Obtener info y mensajes del canal

```typescript
const info = await client.getNewsletterInfo(channelJid);
console.log(`State: ${info.state}, Role: ${info.role ?? "subscriber"}`);

const messages = await client.getNewsletterMessages(channelJid, 5);
for (const msg of messages) {
  console.log(`[${msg.viewsCount} views] ${msg.message?.conversation}`);
}
```

### Operaciones de canales

```typescript
// Create a channel
const channel = await client.createNewsletter("My Channel", "Description");

// Follow / unfollow
await client.followNewsletter(channelJid);
await client.unfollowNewsletter(channelJid);

// Mute / unmute notifications
await client.newsletterToggleMute(channelJid, true);

// React to a channel message
const msgId = await client.generateMessageID();
await client.newsletterSendReaction(channelJid, serverId, "🔥", msgId);

// Subscribe to live updates
await client.newsletterSubscribeLiveUpdates(channelJid);
```

[Código fuente completo: `newsletters.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/newsletters.ts)

---

## Ubicación y Tarjetas de Contacto

Envía ubicaciones GPS y tarjetas de contacto vCard.

### Enviar una ubicación

```typescript
await client.sendRawMessage(jid, {
  locationMessage: {
    degreesLatitude: 40.7128,
    degreesLongitude: -74.006,
    name: "New York City",
    address: "Manhattan, NY, USA",
    comment: "Sent from whatsmeow-node",
    // url: "https://maps.google.com/...",  // optional link
  },
});
```

### Enviar una tarjeta de contacto (vCard)

```typescript
const vcard = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:Jane Doe",
  "TEL;TYPE=CELL:+1-555-123-4567",
  "EMAIL:jane@example.com",
  "ORG:Example Corp",
  "END:VCARD",
].join("\n");

await client.sendRawMessage(jid, {
  contactMessage: {
    displayName: "Jane Doe",
    vcard,
  },
});
```

### Enviar múltiples contactos

```typescript
await client.sendRawMessage(jid, {
  contactsArrayMessage: {
    displayName: "Team Contacts",
    contacts: [
      { displayName: "Jane Doe", vcard: "BEGIN:VCARD\n..." },
      { displayName: "John Smith", vcard: "BEGIN:VCARD\n..." },
    ],
  },
});
```

[Código fuente completo: `location-and-contact.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/location-and-contact.ts)

---

## Búsqueda de Contactos

Verifica registro en WhatsApp, obtén info de usuarios, fotos de perfil y dispositivos vinculados.

### Verificar registro en WhatsApp

```typescript
const results = await client.isOnWhatsApp(["59897756343", "14155551234"]);
for (const r of results) {
  console.log(`${r.query}: ${r.isIn ? `registered → ${r.jid}` : "NOT on WhatsApp"}`);
}
```

### Obtener info de usuarios (lote)

```typescript
// Returns a map of JID → { status, pictureID, verifiedName }
const userInfoMap = await client.getUserInfo(registeredJids);
for (const [jid, info] of Object.entries(userInfoMap)) {
  console.log(`${jid}: ${info.status || "(empty)"}`);
}
```

### Fotos de perfil y dispositivos

```typescript
// Get full-size profile picture URL
const pic = await client.getProfilePicture(jid);
console.log(`URL: ${pic.url}, ID: ${pic.id}`);

// List all linked devices for users
const devices = await client.getUserDevices(registeredJids);
```

[Código fuente completo: `contact-lookup.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/contact-lookup.ts)
