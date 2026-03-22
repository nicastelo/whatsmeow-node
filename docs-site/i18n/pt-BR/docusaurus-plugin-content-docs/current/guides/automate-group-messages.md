---
title: "Como Automatizar Mensagens em Grupos do WhatsApp"
sidebar_label: Automatizar Mensagens de Grupo
sidebar_position: 12
description: "Automatize mensagens em grupos do WhatsApp com Node.js — envie para grupos, mencione membros, crie grupos, gerencie participantes e faça broadcast para vários grupos."
keywords: [automatizar mensagens grupo whatsapp, bot grupo whatsapp nodejs, enviar mensagem grupo whatsapp api, mensagem em massa grupo whatsapp, automação grupo whatsapp typescript]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/automate-group-messages.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/automate-group-messages.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Automatizar Mensagens em Grupos do WhatsApp",
      "description": "Automatize mensagens em grupos do WhatsApp com Node.js — envie para grupos, mencione membros, crie grupos, gerencie participantes e faça broadcast para vários grupos.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/automate-group-messages.png",
      "step": [
        {"@type": "HowToStep", "name": "Listar Seus Grupos", "text": "Use getJoinedGroups() para descobrir todos os grupos dos quais você é membro, com listas de participantes e configurações."},
        {"@type": "HowToStep", "name": "Enviar Mensagens para Grupos", "text": "Use sendMessage() com um JID de grupo (terminando em @g.us) para enviar mensagens de texto para qualquer grupo."},
        {"@type": "HowToStep", "name": "Mencionar Membros do Grupo", "text": "Inclua mentionedJid em contextInfo com extendedTextMessage para @mencionar membros específicos ou todos."},
        {"@type": "HowToStep", "name": "Ouvir Eventos de Grupo", "text": "Trate eventos group:info para reagir a entradas, saídas, promoções e mudanças de configuração."},
        {"@type": "HowToStep", "name": "Broadcast para Vários Grupos", "text": "Itere sobre os grupos com um delay entre os envios para evitar rate limiting."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Automatizar Mensagens em Grupos do WhatsApp",
      "description": "Automatize mensagens em grupos do WhatsApp com Node.js — envie para grupos, mencione membros, crie grupos, gerencie participantes e faça broadcast para vários grupos.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/automate-group-messages.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/automate-group-messages.png"}}
    })}
  </script>
</Head>

![Como Automatizar Mensagens em Grupos do WhatsApp](/img/guides/pt-BR/automate-group-messages.png)
![Como Automatizar Mensagens em Grupos do WhatsApp](/img/guides/pt-BR/automate-group-messages-light.png)

# Como Automatizar Mensagens em Grupos do WhatsApp

O whatsmeow-node dá controle total sobre grupos do WhatsApp — enviar mensagens, mencionar membros, criar grupos, gerenciar participantes e fazer broadcast para vários grupos. Este guia cobre as tarefas mais comuns de automação de grupo.

## Pré-requisitos

- Uma sessão pareada do whatsmeow-node ([Como Parear](pair-whatsapp))
- Ser membro dos grupos que deseja enviar mensagens (não é possível enviar para grupos em que você não entrou)

## Listar Seus Grupos

Comece descobrindo em quais grupos você está:

```typescript
const groups = await client.getJoinedGroups();

for (const g of groups) {
  console.log(`${g.name} (${g.jid}) — ${g.participants.length} members`);
}
```

Cada grupo tem um JID terminando em `@g.us` — é isso que você passa para `sendMessage()`.

## Enviar uma Mensagem para um Grupo

Enviar para um grupo funciona da mesma forma que enviar para um indivíduo — basta usar o JID do grupo:

```typescript
const groupJid = "120363XXXXX@g.us";
await client.sendMessage(groupJid, { conversation: "Hello group!" });
```

## Mencionar Membros do Grupo

### Mencionar membros específicos

Inclua os JIDs em `mentionedJid` e use `@<número>` no corpo do texto:

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

### Mencionar todos

Busque os participantes do grupo e monte a lista de menções:

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

## Ouvir Eventos de Grupo

Reaja a mudanças nos seus grupos:

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

## Responder Mensagens de Grupo

Trate mensagens de forma diferente dependendo se são de grupo:

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

## Broadcast para Vários Grupos

Envie a mesma mensagem para diversos grupos com um delay para evitar rate limiting:

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

:::warning Rate limiting
O WhatsApp limita a taxa de envio, especialmente em massa. Espaçe as mensagens de 1 a 3 segundos. Enviar rápido demais pode restringir temporariamente sua conta. Veja [Rate Limiting](/docs/rate-limiting).
:::

## Criar e Configurar Grupos

### Criar um grupo

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

### Gerenciar participantes

```typescript
// Add members
await client.updateGroupParticipants(groupJid, [newMemberJid], "add");

// Promote to admin
await client.updateGroupParticipants(groupJid, [memberJid], "promote");

// Remove a member
await client.updateGroupParticipants(groupJid, [memberJid], "remove");
```

### Compartilhar link de convite

```typescript
const link = await client.getGroupInviteLink(groupJid);
console.log(`Invite link: ${link}`);

// Reset the link (invalidates the old one)
const newLink = await client.getGroupInviteLink(groupJid, true);
```

## Exemplo Completo

Um bot de gerenciamento de grupo que trata comandos e dá boas-vindas a novos membros:

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

## Erros Comuns

:::warning Envie para `info.chat`, não para `info.sender`
Em grupos, `info.chat` é o JID do grupo e `info.sender` é o indivíduo. Sempre responda para `info.chat` — enviar para `info.sender` inicia uma conversa privada.
:::

:::warning Grupos somente anúncios
Se um grupo tem `announce: true`, apenas administradores podem enviar mensagens. Seu bot precisa ser admin para enviar mensagens nesses grupos.
:::

:::warning Rate limiting em broadcasts
Enviar a mesma mensagem para muitos grupos rapidamente vai acionar o rate limiter do WhatsApp. Sempre adicione um delay (1-3 segundos) entre os envios. Veja [Rate Limiting](/docs/rate-limiting).
:::

:::warning Operações de admin em grupo
`updateGroupParticipants` com `"promote"`, `"demote"` ou `"remove"` exige que seu bot seja admin do grupo. `"add"` também pode exigir permissão de admin dependendo das configurações do grupo.
:::

<RelatedGuides slugs={["build-a-bot", "send-messages-typescript", "send-notifications", "poll-bot"]} />
