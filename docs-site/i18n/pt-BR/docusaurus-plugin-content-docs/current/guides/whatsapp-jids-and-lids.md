---
title: "Entendendo JIDs, LIDs e IDs de Dispositivo do WhatsApp"
sidebar_label: JIDs, LIDs e IDs de Dispositivo
sidebar_position: 26
description: "O que são JIDs, LIDs e sufixos de dispositivo do WhatsApp, por que info.sender pode terminar em @lid, e como normalizar, comparar e montar JIDs com segurança no whatsmeow-node."
keywords: [whatsapp jid, whatsapp lid, whatsapp @lid, jid s.whatsapp.net, id de dispositivo whatsapp jid, whatsmeow jid, jid whatsapp número de telefone, normalizar jid whatsapp]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/whatsapp-jids-and-lids.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/whatsapp-jids-and-lids.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Entendendo JIDs, LIDs e IDs de Dispositivo do WhatsApp",
      "description": "O que são JIDs, LIDs e sufixos de dispositivo do WhatsApp, por que info.sender pode terminar em @lid, e como normalizar, comparar e montar JIDs com segurança no whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/whatsapp-jids-and-lids.png",
      "step": [
        {"@type": "HowToStep", "name": "Entender a Anatomia do JID", "text": "Um JID é user@server. O servidor diz o que ele é: s.whatsapp.net para números de telefone, lid para identidades ocultas, g.us para grupos, newsletter para canais e broadcast para status e listas de transmissão."},
        {"@type": "HowToStep", "name": "Remover Sufixos de Dispositivo", "text": "JIDs de remetente podem ter uma parte de dispositivo (user:12@s.whatsapp.net). Normalize com um helper toUserJid() antes de salvar ou comparar."},
        {"@type": "HowToStep", "name": "Lidar com LIDs", "text": "info.sender e info.chat podem ser JIDs @lid sem número de telefone. Trate-os como IDs opacos e responda para info.chat."},
        {"@type": "HowToStep", "name": "Comparar JIDs com Segurança", "text": "Compare JIDs normalizados, nunca strings brutas, e nunca assuma que um LID e um JID de número de telefone pertencem a pessoas diferentes."},
        {"@type": "HowToStep", "name": "Montar JIDs a partir de Números de Telefone", "text": "Remova tudo que não for dígito de um número internacional e adicione @s.whatsapp.net, ou resolva com isOnWhatsApp() para obter o JID canônico."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Entendendo JIDs, LIDs e IDs de Dispositivo do WhatsApp",
      "description": "O que são JIDs, LIDs e sufixos de dispositivo do WhatsApp, por que info.sender pode terminar em @lid, e como normalizar, comparar e montar JIDs com segurança no whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/whatsapp-jids-and-lids.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Entendendo JIDs, LIDs e IDs de Dispositivo do WhatsApp](/img/guides/pt-BR/whatsapp-jids-and-lids.png)
![Entendendo JIDs, LIDs e IDs de Dispositivo do WhatsApp](/img/guides/pt-BR/whatsapp-jids-and-lids-light.png)

# Entendendo JIDs, LIDs e IDs de Dispositivo do WhatsApp

Todo chat, usuário, grupo e canal do WhatsApp é identificado por um **JID** (Jabber ID), uma string como `5989...@s.whatsapp.net`. O whatsmeow-node trata JIDs como strings simples (`type JID = string`), então é fácil tratá-los como números de telefone. Isso funciona até chegar uma mensagem de `12345678901234@lid` ou de `5989...:12@s.whatsapp.net`. Este guia explica o que essas formas significam e traz helpers pequenos para lidar com elas corretamente.

## Pré-requisitos

- whatsmeow-node instalado ([Guia de instalação](/docs/installation))
- Uma sessão pareada ([Como Parear o WhatsApp](pair-whatsapp))

## Anatomia de um JID

Um JID tem até quatro partes. O whatsmeow as formata assim:

```
<user>@<server>                     5989XXXXXXX@s.whatsapp.net
<user>:<device>@<server>            5989XXXXXXX:12@s.whatsapp.net
<user>.<agent>:<device>@<server>    5989XXXXXXX.1:12@s.whatsapp.net   (rare)
<server>                            s.whatsapp.net                    (server-only JID)
```

O **servidor** diz que tipo de entidade o JID representa:

| Servidor | Exemplo | O que é |
|---|---|---|
| `s.whatsapp.net` | `5989XXXXXXX@s.whatsapp.net` | Um usuário, identificado por número de telefone (só dígitos, sem `+`) |
| `lid` | `123456789012345@lid` | Um usuário, identificado por um **LID** oculto (sem número de telefone) |
| `g.us` | `120363XXXXXXXXXXXX@g.us` | Um grupo |
| `newsletter` | `120363XXXXXXXXXXXX@newsletter` | Um canal (newsletter) |
| `broadcast` | `status@broadcast` | Status. Qualquer outro usuário `@broadcast` é uma lista de transmissão |
| `c.us` | `5989XXXXXXX@c.us` | Servidor de usuários legado. O whatsmeow o usa internamente para consultas por telefone; você raramente o verá em eventos |
| `bot` | `867051314767696@bot` | Meta AI e outros bots |
| `hosted`, `hosted.lid` | — | Contas comerciais da Cloud API (hosted). `hosted.lid` é a forma LID |

O whatsmeow define mais alguns servidores (`msgr`, `interop`) para mensagens entre apps. Você pode tratá-los como "outros".

## Sufixos de Dispositivo

Uma conta do WhatsApp pode ter até quatro dispositivos vinculados além do celular. Cada dispositivo tem um número: `0` é o celular principal, e os dispositivos vinculados (WhatsApp Web, Desktop, sua sessão do whatsmeow-node) recebem números maiores. Quando um JID se refere a um dispositivo específico, o número do dispositivo vem depois de dois-pontos:

```
5989XXXXXXX@s.whatsapp.net      → the user (as a sender: their primary phone, device 0)
5989XXXXXXX:12@s.whatsapp.net   → device #12 of that user
```

Você verá JIDs de dispositivo em dois lugares comuns:

- **`init()` e o evento `connected`** retornam seu próprio JID *com* o número de dispositivo da sua sessão, por exemplo `5989XXXXXXX:12@s.whatsapp.net`.
- **`info.sender`** nas mensagens recebidas inclui o dispositivo de onde a mensagem foi enviada. A mesma pessoa pode aparecer como `...:3` (um dispositivo vinculado) ou sem sufixo (dispositivo 0, o telefone principal), dependendo do dispositivo que usou.

O whatsmeow também entende uma parte de **agente** (`user.<agent>:<device>@server`). Ela só aparece na saída normal quando o agente é diferente de zero, o que você quase nunca vai ver. Você ainda pode encontrar a forma explícita `user.0:N@server` se trocar JIDs com outras ferramentas ou bibliotecas. O helper abaixo interpreta as duas.

`info.chat` nunca tem sufixo de dispositivo em chats privados, então é sempre seguro enviar para ele.

## O Que São LIDs?

Um **LID** (Linked Identity) é um número opaco, por conta, que o WhatsApp usa para identificar um usuário *sem* revelar o número de telefone dele. O WhatsApp está migrando cada vez mais tráfego para endereçamento por LID. Começou com grupos grandes e comunidades, e agora também aparece em chats privados.

Para você, isso significa:

- Em grupos, `info.sender` pode ser `123456789012345@lid` em vez de um JID de número de telefone. Isso acontece até com pessoas que estão nos seus contatos.
- Em chats privados, tanto `info.chat` quanto `info.sender` podem ser `@lid`.
- `getGroupInfo()` pode retornar participantes cujo `jid` termina em `@lid`.
- `isOnWhatsApp()` pode retornar um JID `@lid` como `jid` canônico de um número de telefone.
- A **mesma pessoa** pode aparecer como `5989XXXXXXX@s.whatsapp.net` em um lugar e como `123456789012345@lid` em outro. As duas strings não têm nada em comum.

Os dígitos de um LID **não** são um número de telefone. Não os mostre para os usuários como se fossem, nem os envie para o campo de telefone de um CRM.

### O whatsmeow-node expõe o mapeamento número de telefone ↔ LID? {#lid-mapping}

**Não, hoje não.** O whatsmeow (a biblioteca Go) mantém o mapeamento internamente. Ele registra `SenderAlt` / `RecipientAlt` e o `AddressingMode` de cada mensagem, `PhoneNumber` / `LID` nos participantes de grupo, e mantém um mapa de LIDs no seu store. O whatsmeow-node não serializa nada disso. O que chega ao TypeScript é:

| API | Campos JID que você recebe |
|---|---|
| evento `message` → `info` | `chat`, `sender`, `pushName` (sem JID alternativo nem modo de endereçamento) |
| `getGroupInfo()` → `participants[]` | `jid`, `isAdmin`, `isSuperAdmin` (sem telefone/LID separados) |
| `isOnWhatsApp()` | `query`, `isIn`, `jid` (o JID canônico, possivelmente `@lid`) |

Na prática:

1. **Indexe seus dados pelo JID que você receber**, normalizado com `toUserJid()`. Não assuma que sempre dá para ir de uma forma para a outra.
2. **Responda para `info.chat`**, que sempre funciona, seja qual for o modo de endereçamento. O WhatsApp roteia corretamente tanto JIDs LID quanto de número de telefone. A exceção são `status@broadcast` e as listas de transmissão: ignore-os, porque responder ali publica um status ou envia uma transmissão.
3. **Quando precisar de um número de telefone**, use `phoneFromJid()` (abaixo), que só o retorna para JIDs de número de telefone. Para remetentes `@lid`, use `info.pushName` como alternativa ou pergunte ao usuário.
4. **Quando começar a partir de um número de telefone**, monte o JID com `phoneToJid()`, ou resolva com `isOnWhatsApp()` e salve o JID retornado.

:::note
O whatsmeow persiste o mapa de LIDs no banco de dados da sessão (tabela `whatsmeow_lid_map`, colunas `lid` e `pn`, ambas salvas só com a parte de usuário). É um esquema interno que pode mudar em qualquer atualização do whatsmeow, então leia por sua conta e risco. Nunca escreva nela.
:::

## Os Helpers

Coloque isto em um arquivo `jid.ts`. São funções puras de string, sem dependências:

```typescript
import type { JID } from "@whatsmeow-node/whatsmeow-node";

export interface ParsedJID {
  user: string;   // phone number, LID, group ID, ...
  agent: number;  // almost always 0
  device: number; // 0 = primary phone, >0 = linked/companion device
  server: string; // "s.whatsapp.net", "lid", "g.us", ...
}

export function parseJID(jid: JID): ParsedJID {
  const at = jid.indexOf("@");
  if (at === -1) return { user: "", agent: 0, device: 0, server: jid };

  const server = jid.slice(at + 1);
  let user = jid.slice(0, at);
  let agent = 0;
  let device = 0;

  const colon = user.indexOf(":");
  if (colon !== -1) {
    device = Number(user.slice(colon + 1));
    user = user.slice(0, colon);
  }
  const dot = user.indexOf(".");
  if (dot !== -1) {
    agent = Number(user.slice(dot + 1));
    user = user.slice(0, dot);
  }
  return { user, agent, device, server };
}

/** Strip the agent/device part: "5989...:12@s.whatsapp.net" → "5989...@s.whatsapp.net" */
export function toUserJid(jid: JID): JID {
  const { user, server } = parseJID(jid);
  return user ? `${user}@${server}` : server;
}

export type JIDKind = "pn" | "lid" | "group" | "newsletter" | "status" | "broadcast" | "bot" | "other";

export function jidKind(jid: JID): JIDKind {
  const { user, server } = parseJID(jid);
  switch (server) {
    case "s.whatsapp.net":
    case "c.us":
    case "hosted":
      return "pn";
    case "lid":
    case "hosted.lid":
      return "lid";
    case "g.us":
      return "group";
    case "newsletter":
      return "newsletter";
    case "broadcast":
      return user === "status" ? "status" : "broadcast";
    case "bot":
      return "bot";
    default:
      return "other";
  }
}
```

`toUserJid()` faz o mesmo que o `JID.ToNonAD()` do whatsmeow:

| Entrada | `toUserJid()` |
|---|---|
| `5989XXXXXXX@s.whatsapp.net` | `5989XXXXXXX@s.whatsapp.net` |
| `5989XXXXXXX:12@s.whatsapp.net` | `5989XXXXXXX@s.whatsapp.net` |
| `5989XXXXXXX.0:12@s.whatsapp.net` | `5989XXXXXXX@s.whatsapp.net` |
| `123456789012345:3@lid` | `123456789012345@lid` |
| `120363XXXXXXXXXXXX@g.us` | `120363XXXXXXXXXXXX@g.us` |
| `status@broadcast` | `status@broadcast` |

## Comparar JIDs com Segurança

Nunca compare strings de remetente brutas. Normalize os dois lados primeiro:

```typescript
export function sameUser(a: JID, b: JID): boolean {
  return toUserJid(a) === toUserJid(b);
}
```

Para listas de permissão e buscas, normalize uma vez ao montar o set e de novo em cada busca:

```typescript
const ADMINS = new Set(["59899111222@s.whatsapp.net"].map(toUserJid));

client.on("message", async ({ info }) => {
  if (!ADMINS.has(toUserJid(info.sender))) return;
  // ...
});
```

Verificar se você está em um grupo funciona do mesmo jeito, porque `init()` retorna seu JID com sufixo de dispositivo:

```typescript
const { jid } = await client.init();
if (!jid) throw new Error("Not paired");
const me = toUserJid(jid);

const group = await client.getGroupInfo("120363XXXXX@g.us");
const isMember = group.participants.some((p) => sameUser(p.jid, me));
```

:::warning Normalizar não liga LIDs a números
`sameUser("5989XXXXXXX@s.whatsapp.net", "123456789012345@lid")` retorna `false` mesmo que os dois sejam da mesma pessoa, e o whatsmeow-node não consegue dizer o contrário (veja [acima](#lid-mapping)). Se uma lista de permissão precisa funcionar em grupos com endereçamento LID, registre o JID `@lid` na primeira vez que vir o usuário, ou compare por outro dado.
:::

## Montar JIDs a partir de Números de Telefone

Um JID de número de telefone é o número em formato internacional, **só dígitos** (sem `+`, espaços ou traços), seguido de `@s.whatsapp.net`:

```typescript
/**
 * Build a user JID from an international phone number ("+598 99 111 222").
 * Formatting characters are stripped; national formats and 00 prefixes are not handled.
 */
export function phoneToJid(phone: string): JID {
  const digits = phone.replace(/\D/g, "");
  if (!digits) throw new Error(`Not a phone number: ${phone}`);
  return `${digits}@s.whatsapp.net`;
}

phoneToJid("+598 99 111 222"); // "59899111222@s.whatsapp.net"
```

Isso não verifica se o número está no WhatsApp. Para verificar e obter o JID canônico em um passo só, use `isOnWhatsApp()`. O whatsmeow espera números em formato internacional **com** o prefixo `+`:

```typescript
import type { JID, WhatsmeowClient } from "@whatsmeow-node/whatsmeow-node";

export async function resolvePhone(client: WhatsmeowClient, phone: string): Promise<JID | null> {
  const digits = phone.replace(/\D/g, "");
  const [result] = await client.isOnWhatsApp([`+${digits}`]);
  return result?.isIn && result.jid ? result.jid : null;
}

const target = await resolvePhone(client, "+598 99 111 222");
if (target) await client.sendMessage(target, { conversation: "Hi!" });
```

Números que não estão registrados ficam fora do resultado (então `result` é `undefined`) ou voltam com `isIn: false`. A verificação acima cobre os dois casos. O `jid` retornado pode ser um JID `@lid`. Dá para enviar para as duas formas.

## Obter o Número de Telefone de um JID

Só JIDs de número de telefone contêm um número de telefone. Retorne `null` para todo o resto, assim você não usa por engano um LID ou ID de grupo como número de telefone:

```typescript
/** Return the phone number (digits only) or null if the JID doesn't contain one. */
export function phoneFromJid(jid: JID): string | null {
  if (jidKind(jid) !== "pn") return null;
  const { user } = parseJID(jid);
  return /^[1-9]\d{5,}$/.test(user) ? user : null;
}

phoneFromJid("59899111222:12@s.whatsapp.net"); // "59899111222"
phoneFromJid("123456789012345@lid");            // null
phoneFromJid("120363XXXXX@g.us");               // null
```

## Exemplo Completo

Um bot que normaliza cada remetente e responde a dois comandos: `!whoami` mostra o que ele consegue saber sobre você, e `!admin` confere uma lista de permissão por número de telefone. Ele importa os helpers do `jid.ts` acima:

```typescript
import { createClient } from "@whatsmeow-node/whatsmeow-node";
import type { JID } from "@whatsmeow-node/whatsmeow-node";
import { toUserJid, jidKind, phoneFromJid, parseJID } from "./jid.js";

const client = createClient({ store: "session.db" });

// Admins listed by phone number, normalized once at startup
const ADMINS = new Set(["59899111222@s.whatsapp.net"].map(toUserJid));

// Remember the last display name seen for each normalized sender
const seen = new Map<JID, string>();

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;
  // Never reply to status updates or broadcast lists: that would post a status
  const chatKind = jidKind(info.chat);
  if (chatKind === "status" || chatKind === "broadcast") return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  const sender = toUserJid(info.sender);
  seen.set(sender, info.pushName);

  if (text === "!whoami") {
    const { device } = parseJID(info.sender);
    const phone = phoneFromJid(sender);
    const lines = [
      `Chat: ${info.chat} (${jidKind(info.chat)})`,
      `Sender: ${sender} (${jidKind(sender)})`,
      `Device: ${device === 0 ? "primary phone" : `linked device #${device}`}`,
      phone ? `Phone: +${phone}` : "Phone: hidden (LID)",
    ];
    await client.sendMessage(info.chat, { conversation: lines.join("\n") });
    return;
  }

  if (text === "!admin") {
    const reply = ADMINS.has(sender) ? "You are an admin." : "You are not an admin.";
    await client.sendMessage(info.chat, { conversation: reply });
  }
});

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired — run the pairing flow first");
    process.exit(1);
  }
  console.log(`Logged in as ${toUserJid(jid)} (device ${parseJID(jid).device})`);
  await client.connect();

  process.on("SIGINT", async () => {
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Erros Comuns

:::warning Extrair números de telefone dos JIDs de remetente
`jid.split("@")[0]` só é um número de telefone para JIDs `@s.whatsapp.net` *sem* sufixo de dispositivo. Com `5989...:12@s.whatsapp.net` você recebe `"5989...:12"`, e com `@lid` recebe um LID que parece um número de telefone mas não é. O [guia do Chatwoot](integrate-chatwoot) usa esse atalho para preencher `phone_number`. Funciona para chats privados simples, mas em produção use `phoneFromJid()` e recorra ao `pushName` quando ele retornar `null`.
:::

:::warning Comparar remetentes ou chats como strings exatas
`info.sender === "5989...@s.whatsapp.net"` falha assim que a mensagem vem de um dispositivo vinculado (`:3`) ou com endereçamento LID. O bot relay de [Encaminhar Mensagens](forward-messages) compara `info.chat` com um JID fixo no código. Isso funciona para grupos (`@g.us` nunca muda), mas um chat privado pode chegar como `@lid`. Normalize com `toUserJid()` e registre em log os JIDs que você realmente recebe antes de fixá-los no código.
:::

:::warning Responder para um JID de dispositivo
Enviar para um JID com parte de dispositivo falha com `message recipient must be a user JID with no device part`. Isso acontece quando você responde para `info.sender` ou manda mensagem para o seu próprio JID do `init()`. Responda para `info.chat`, ou passe o JID por `toUserJid()` antes.
:::

:::warning Responder ao remetente em vez do chat
Em grupos, `info.sender` é a pessoa e `info.chat` é o grupo. Enviar para `info.sender` (mesmo normalizado) inicia uma conversa privada. Use `info.chat`, a não ser que você realmente queira mandar uma mensagem no privado.
:::

:::warning Mostrar LIDs como números de telefone
LIDs são strings numéricas longas, então acabam aparecendo em interfaces e CRMs como números falsos do tipo `+123456789012345`. Confira o `jidKind()` antes de exibir ou salvar algo como número de telefone.
:::

<RelatedGuides slugs={["build-a-bot", "automate-group-messages", "forward-messages", "integrate-chatwoot"]} />
