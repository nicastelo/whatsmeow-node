---
title: "Cómo Automatizar Mensajes de Grupo en WhatsApp"
sidebar_label: Automatizar Mensajes de Grupo
sidebar_position: 12
description: "Automatiza mensajes de grupo en WhatsApp con Node.js — envía a grupos, menciona miembros, crea grupos, administra participantes y envía difusión a múltiples grupos."
keywords: [automatizar mensajes grupo whatsapp, bot grupo whatsapp nodejs, enviar mensaje grupo whatsapp api, mensaje masivo grupo whatsapp, automatización grupo whatsapp typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/automate-group-messages.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/automate-group-messages.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Automate Group Messages in WhatsApp",
      "description": "Automate WhatsApp group messaging with Node.js — send to groups, mention members, create groups, manage participants, and broadcast to multiple groups.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/automate-group-messages.png",
      "step": [
        {"@type": "HowToStep", "name": "List Your Groups", "text": "Use getJoinedGroups() to discover all groups you're a member of, with participant lists and settings."},
        {"@type": "HowToStep", "name": "Send Messages to Groups", "text": "Use sendMessage() with a group JID (ending in @g.us) to send text messages to any group."},
        {"@type": "HowToStep", "name": "Mention Group Members", "text": "Include mentionedJid in contextInfo with extendedTextMessage to @mention specific members or everyone."},
        {"@type": "HowToStep", "name": "Listen for Group Events", "text": "Handle group:info events to react to joins, leaves, promotions, and setting changes."},
        {"@type": "HowToStep", "name": "Broadcast to Multiple Groups", "text": "Iterate over groups with a delay between sends to avoid rate limiting."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Automate Group Messages in WhatsApp",
      "description": "Automate WhatsApp group messaging with Node.js — send to groups, mention members, create groups, manage participants, and broadcast to multiple groups.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/automate-group-messages.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/automate-group-messages.png"}}
    })}
  </script>
</Head>

![Cómo Automatizar Mensajes de Grupo en WhatsApp](/img/guides/es/automate-group-messages.png)
![Cómo Automatizar Mensajes de Grupo en WhatsApp](/img/guides/es/automate-group-messages-light.png)

# Cómo Automatizar Mensajes de Grupo en WhatsApp

whatsmeow-node te da control total sobre los grupos de WhatsApp — envía mensajes, menciona miembros, crea grupos, administra participantes y envía difusión a múltiples grupos. Esta guía cubre las tareas de automatización de grupos más comunes.

## Requisitos Previos

- Una sesión vinculada de whatsmeow-node ([Cómo Vincular](pair-whatsapp))
- Membresía en los grupos a los que quieres enviar mensajes (no puedes enviar a grupos a los que no te has unido)

## Listar tus Grupos

Empieza descubriendo en qué grupos estás:

```typescript
const groups = await client.getJoinedGroups();

for (const g of groups) {
  console.log(`${g.name} (${g.jid}) — ${g.participants.length} members`);
}
```

Cada grupo tiene un JID que termina en `@g.us` — esto es lo que pasas a `sendMessage()`.

## Enviar un Mensaje a un Grupo

Enviar a un grupo funciona igual que enviar a un individuo — solo usa el JID del grupo:

```typescript
const groupJid = "120363XXXXX@g.us";
await client.sendMessage(groupJid, { conversation: "Hello group!" });
```

## Mencionar Miembros del Grupo

### Mencionar miembros específicos

Incluye los JID en `mentionedJid` y usa `@<número>` en el cuerpo del texto:

```typescript
const memberJid = "5512345678@s.whatsapp.net";

await client.sendRawMessage(groupJid, {
  extendedTextMessage: {
    text: `Hey @${memberJid.split("@")[0]}, check this out!`,
    contextInfo: {
      mentionedJid: [memberJid],
    },
  },
});
```

### Mencionar a todos

Obtén los participantes del grupo y construye una lista de menciones:

```typescript
const group = await client.getGroupInfo(groupJid);
const jids = group.participants.map((p) => p.jid);
const mentions = jids.map((j) => `@${j.split("@")[0]}`).join(" ");

await client.sendRawMessage(groupJid, {
  extendedTextMessage: {
    text: `Attention everyone: ${mentions}`,
    contextInfo: { mentionedJid: jids },
  },
});
```

## Escuchar Eventos de Grupo

Reacciona a cambios en tus grupos:

```typescript
// Member changes and setting updates
client.on("group:info", (event) => {
  if (event.join) {
    console.log(`New members in ${event.jid}: ${event.join.join(", ")}`);
    // Welcome new members
    for (const newMember of event.join) {
      client.sendRawMessage(event.jid, {
        extendedTextMessage: {
          text: `Welcome @${newMember.split("@")[0]}!`,
          contextInfo: { mentionedJid: [newMember] },
        },
      });
    }
  }

  if (event.leave) {
    console.log(`Left ${event.jid}: ${event.leave.join(", ")}`);
  }

  if (event.name) {
    console.log(`Group renamed to: ${event.name}`);
  }
});

// When you're added to a new group
client.on("group:joined", ({ jid, name }) => {
  console.log(`Joined group: ${name} (${jid})`);
});
```

## Responder a Mensajes de Grupo

Maneja los mensajes de forma diferente según si son de un grupo:

```typescript
client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;
  if (!info.isGroup) return; // Only handle group messages

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  // In groups, info.chat is the group JID, info.sender is the person
  console.log(`[${info.chat}] ${info.pushName}: ${text}`);

  if (text === "!members") {
    const group = await client.getGroupInfo(info.chat);
    const list = group.participants
      .map((p) => `- ${p.jid}${p.isAdmin ? " (admin)" : ""}`)
      .join("\n");
    await client.sendMessage(info.chat, {
      conversation: `Members:\n${list}`,
    });
  }
});
```

## Difusión a Múltiples Grupos

Envía el mismo mensaje a varios grupos con un delay para evitar límites de tasa:

```typescript
const groups = await client.getJoinedGroups();
const targetGroups = groups.filter((g) => g.name.startsWith("Team "));

for (const group of targetGroups) {
  await client.sendMessage(group.jid, {
    conversation: "Weekly reminder: standup at 9 AM tomorrow",
  });

  // Wait between sends to avoid rate limiting
  await new Promise((r) => setTimeout(r, 2000));
}

console.log(`Sent to ${targetGroups.length} groups`);
```

:::warning Límites de tasa
WhatsApp limita la tasa de envío, especialmente en masa. Espacia los mensajes de 1 a 3 segundos. Enviar demasiado rápido puede hacer que tu cuenta sea restringida temporalmente. Consulta [Límites de Tasa](/docs/rate-limiting).
:::

## Crear y Configurar Grupos

### Crear un grupo

```typescript
const newGroup = await client.createGroup("Project Alpha", [
  "5512345678@s.whatsapp.net",
  "5598765432@s.whatsapp.net",
]);

console.log(`Created group: ${newGroup.name} (${newGroup.jid})`);
```

### Configurar ajustes

```typescript
await client.setGroupDescription(groupJid, "Discussion for Project Alpha");
await client.setGroupAnnounce(groupJid, true);  // Only admins can send
await client.setGroupLocked(groupJid, true);     // Only admins can edit info
```

### Administrar participantes

```typescript
// Add members
await client.updateGroupParticipants(groupJid, [newMemberJid], "add");

// Promote to admin
await client.updateGroupParticipants(groupJid, [memberJid], "promote");

// Remove a member
await client.updateGroupParticipants(groupJid, [memberJid], "remove");
```

### Compartir un enlace de invitación

```typescript
const link = await client.getGroupInviteLink(groupJid);
console.log(`Invite link: ${link}`);

// Reset the link (invalidates the old one)
const newLink = await client.getGroupInviteLink(groupJid, true);
```

## Ejemplo Completo

Un bot de administración de grupo que maneja comandos y da la bienvenida a nuevos miembros:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("error", (err) => console.error("Error:", err));

// Welcome new members
client.on("group:info", async (event) => {
  if (!event.join) return;

  for (const jid of event.join) {
    await client.sendRawMessage(event.jid, {
      extendedTextMessage: {
        text: `Welcome @${jid.split("@")[0]}! Type !help for available commands.`,
        contextInfo: { mentionedJid: [jid] },
      },
    });
  }
});

// Handle group commands
client.on("message", async ({ info, message }) => {
  if (info.isFromMe || !info.isGroup) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text?.startsWith("!")) return;

  await client.markRead([info.id], info.chat, info.sender);
  const command = text.toLowerCase().trim();

  if (command === "!help") {
    await client.sendMessage(info.chat, {
      conversation: "Commands:\n!help — show this message\n!members — list members\n!invite — get invite link",
    });
  }

  if (command === "!members") {
    const group = await client.getGroupInfo(info.chat);
    const list = group.participants
      .map((p) => {
        const role = p.isSuperAdmin ? "owner" : p.isAdmin ? "admin" : "member";
        return `- @${p.jid.split("@")[0]} (${role})`;
      })
      .join("\n");

    await client.sendRawMessage(info.chat, {
      extendedTextMessage: {
        text: `Members (${group.participants.length}):\n${list}`,
        contextInfo: {
          mentionedJid: group.participants.map((p) => p.jid),
        },
      },
    });
  }

  if (command === "!invite") {
    const link = await client.getGroupInviteLink(info.chat);
    await client.sendMessage(info.chat, { conversation: link });
  }
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! See: How to Pair WhatsApp");
    process.exit(1);
  }

  await client.connect();
  await client.sendPresence("available");
  console.log("Group bot is online!");

  process.on("SIGINT", async () => {
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Errores Comunes

:::warning Envía a `info.chat`, no a `info.sender`
En grupos, `info.chat` es el JID del grupo e `info.sender` es el individuo. Siempre responde a `info.chat` — enviar a `info.sender` inicia una conversación privada.
:::

:::warning Grupos de solo anuncios
Si un grupo tiene `announce: true`, solo los administradores pueden enviar mensajes. Tu bot debe ser admin para enviar mensajes en esos grupos.
:::

:::warning Límites de tasa en difusiones
Enviar el mismo mensaje a muchos grupos demasiado rápido activará el limitador de tasa de WhatsApp. Siempre agrega un delay (1-3 segundos) entre envíos. Consulta [Límites de Tasa](/docs/rate-limiting).
:::

:::warning Operaciones de admin de grupo
`updateGroupParticipants` con `"promote"`, `"demote"` o `"remove"` requiere que tu bot sea administrador del grupo. `"add"` también puede requerir permisos de admin dependiendo de la configuración del grupo.
:::

<RelatedGuides slugs={["build-a-bot", "send-messages-typescript", "send-notifications", "poll-bot"]} />
