---
title: Grupos e Comunidades
sidebar_position: 5
description: "Crie e gerencie grupos do WhatsApp programaticamente — liste membros, altere configuracoes, gerencie participantes e gere links de convite."
keywords: [whatsapp grupo api nodejs, criar grupo whatsapp programaticamente, whatsapp link convite grupo api, whatsapp gerenciamento grupo typescript]
---

# Grupos e Comunidades

Criacao, configuracao e gerenciamento de grupos do WhatsApp.

## Listar Grupos

```typescript
const groups = await client.getJoinedGroups();

for (const g of groups) {
  const adminCount = g.participants.filter((p) => p.isAdmin).length;
  console.log(`${g.name} — ${g.participants.length} members (${adminCount} admins)`);
  console.log(`  Announce-only: ${g.announce} | Locked: ${g.locked}`);
}
```

## Obter Detalhes do Grupo

```typescript
const info = await client.getGroupInfo(groupJid);
console.log(`Description: ${info.description ?? "(none)"}`);
console.log(`Owner: ${info.owner ?? "(unknown)"}`);

for (const p of info.participants) {
  const role = p.isSuperAdmin ? "super-admin" : p.isAdmin ? "admin" : "member";
  console.log(`  ${p.jid} [${role}]`);
}
```

## Ouvir Eventos de Grupo

```typescript
client.on("group:info", (event) => {
  if (event.name) console.log(`Name changed to: ${event.name}`);
  if (event.join) console.log(`Joined: ${event.join.join(", ")}`);
  if (event.leave) console.log(`Left: ${event.leave.join(", ")}`);
  if (event.promote) console.log(`Promoted: ${event.promote.join(", ")}`);
  if (event.demote) console.log(`Demoted: ${event.demote.join(", ")}`);
});

client.on("group:joined", ({ jid, name }) => {
  console.log(`Joined group: ${name} (${jid})`);
});
```

## Criar e Configurar Grupos

```typescript
// Create a group with initial members
const newGroup = await client.createGroup("My Group", [
  "5989XXXXXXXX@s.whatsapp.net",
  "5989YYYYYYYY@s.whatsapp.net",
]);

// Update settings
await client.setGroupName(groupJid, "New Group Name");
await client.setGroupDescription(groupJid, "Updated description");
await client.setGroupAnnounce(groupJid, true);  // Only admins can send
await client.setGroupLocked(groupJid, true);     // Only admins can edit info
```

## Gerenciar Participantes

```typescript
const memberJid = "5989XXXXXXXX@s.whatsapp.net";

await client.updateGroupParticipants(groupJid, [memberJid], "add");
await client.updateGroupParticipants(groupJid, [memberJid], "promote");
await client.updateGroupParticipants(groupJid, [memberJid], "demote");
await client.updateGroupParticipants(groupJid, [memberJid], "remove");
```

## Links de Convite

```typescript
// Get the current invite link
const link = await client.getGroupInviteLink(groupJid);

// Reset invite link (invalidates the old one)
const newLink = await client.getGroupInviteLink(groupJid, true);
```

## Sair de um Grupo

```typescript
await client.leaveGroup(groupJid);
```

:::info
O exemplo roda em modo somente leitura por padrao, listando seus grupos e mostrando detalhes. Descomente as operacoes de escrita no codigo fonte para testar criacao e gerenciamento de grupos.
:::

[Codigo fonte completo: `groups.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/groups.ts)
