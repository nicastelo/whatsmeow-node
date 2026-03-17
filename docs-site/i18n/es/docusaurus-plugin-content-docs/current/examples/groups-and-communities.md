---
title: Grupos y Comunidades
sidebar_position: 5
description: "Crea y administra grupos de WhatsApp programáticamente — lista miembros, cambia configuraciones, gestiona participantes y genera enlaces de invitación."
keywords: [whatsapp grupo api nodejs, crear grupo whatsapp programaticamente, whatsapp enlace invitacion grupo api, whatsapp administrar grupo typescript]
---

# Grupos y Comunidades

Creación, configuración y administración de grupos de WhatsApp.

## Listar Grupos Unidos

```typescript
const groups = await client.getJoinedGroups();

for (const g of groups) {
  const adminCount = g.participants.filter((p) => p.isAdmin).length;
  console.log(`${g.name} — ${g.participants.length} members (${adminCount} admins)`);
  console.log(`  Announce-only: ${g.announce} | Locked: ${g.locked}`);
}
```

## Obtener Detalles del Grupo

```typescript
const info = await client.getGroupInfo(groupJid);
console.log(`Description: ${info.description ?? "(none)"}`);
console.log(`Owner: ${info.owner ?? "(unknown)"}`);

for (const p of info.participants) {
  const role = p.isSuperAdmin ? "super-admin" : p.isAdmin ? "admin" : "member";
  console.log(`  ${p.jid} [${role}]`);
}
```

## Escuchar Eventos de Grupo

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

## Crear y Configurar Grupos

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

## Administrar Participantes

```typescript
const memberJid = "5989XXXXXXXX@s.whatsapp.net";

await client.updateGroupParticipants(groupJid, [memberJid], "add");
await client.updateGroupParticipants(groupJid, [memberJid], "promote");
await client.updateGroupParticipants(groupJid, [memberJid], "demote");
await client.updateGroupParticipants(groupJid, [memberJid], "remove");
```

## Enlaces de Invitación

```typescript
// Get the current invite link
const link = await client.getGroupInviteLink(groupJid);

// Reset invite link (invalidates the old one)
const newLink = await client.getGroupInviteLink(groupJid, true);
```

## Salir de un Grupo

```typescript
await client.leaveGroup(groupJid);
```

:::info
El ejemplo se ejecuta en modo de solo lectura por defecto, listando tus grupos y mostrando detalles. Descomenta las operaciones de escritura en el código fuente para probar la creación y administración de grupos.
:::

[Código fuente completo: `groups.ts`](https://github.com/nicastelo/whatsmeow-node/blob/main/ts/examples/groups.ts)
