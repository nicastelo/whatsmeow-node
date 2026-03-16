---
title: Exemplos Avancados
sidebar_label: Avancado
sidebar_position: 7
description: "Crie enquetes no WhatsApp, gerencie canais de newsletter, envie localizacoes e cartoes de contato e busque usuarios com Node.js e TypeScript."
keywords: [whatsapp enquete api nodejs, whatsapp newsletter canal api, whatsapp mensagem localizacao api, whatsapp cartao contato vcard nodejs]
---

# Avancado

Enquetes, newsletters (canais), compartilhamento de localizacao, cartoes de contato e busca de contatos.

## Enquetes

Crie enquetes e descriptografe votos recebidos.

### Criar uma enquete

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

### Descriptografar votos de enquete

Votos de enquete sao criptografados de ponta a ponta. Use `decryptPollVote()` para ver as opcoes selecionadas:

```typescript
client.on("message", async ({ info, message }) => {
  const pollUpdate = message.pollUpdateMessage;
  if (!pollUpdate) return;

  const decrypted = await client.decryptPollVote(info, message);
  console.log("Vote:", JSON.stringify(decrypted, null, 2));
});
```

[Codigo fonte completo: `polls.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/polls.ts)

---

## Newsletters (Canais)

Gerencie Canais do WhatsApp — inscreva-se, busque mensagens, reaja e crie.

### Listar canais inscritos

```typescript
const newsletters = await client.getSubscribedNewsletters();
for (const nl of newsletters) {
  console.log(`${nl.name} (${nl.id})`);
}
```

### Obter informacoes e mensagens do canal

```typescript
const info = await client.getNewsletterInfo(channelJid);
console.log(`State: ${info.state}, Role: ${info.role ?? "subscriber"}`);

const messages = await client.getNewsletterMessages(channelJid, 5);
for (const msg of messages) {
  console.log(`[${msg.viewsCount} views] ${msg.message?.conversation}`);
}
```

### Operacoes com canais

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

[Codigo fonte completo: `newsletters.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/newsletters.ts)

---

## Localizacao e Cartoes de Contato

Envie localizacoes GPS e cartoes de contato vCard.

### Enviar uma localizacao

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

### Enviar um cartao de contato (vCard)

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

### Enviar multiplos contatos

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

[Codigo fonte completo: `location-and-contact.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/location-and-contact.ts)

---

## Busca de Contatos

Verifique registro no WhatsApp, obtenha informacoes de usuarios, fotos de perfil e dispositivos vinculados.

### Verificar registro no WhatsApp

```typescript
const results = await client.isOnWhatsApp(["59897756343", "14155551234"]);
for (const r of results) {
  console.log(`${r.query}: ${r.isIn ? `registered → ${r.jid}` : "NOT on WhatsApp"}`);
}
```

### Obter informacoes de usuarios (em lote)

```typescript
// Returns a map of JID → { status, pictureID, verifiedName }
const userInfoMap = await client.getUserInfo(registeredJids);
for (const [jid, info] of Object.entries(userInfoMap)) {
  console.log(`${jid}: ${info.status || "(empty)"}`);
}
```

### Fotos de perfil e dispositivos

```typescript
// Get full-size profile picture URL
const pic = await client.getProfilePicture(jid);
console.log(`URL: ${pic.url}, ID: ${pic.id}`);

// List all linked devices for users
const devices = await client.getUserDevices(registeredJids);
```

[Codigo fonte completo: `contact-lookup.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/contact-lookup.ts)
