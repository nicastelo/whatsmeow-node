---
title: "Entendiendo los JIDs, LIDs e IDs de Dispositivo de WhatsApp"
sidebar_label: JIDs, LIDs e IDs de Dispositivo
sidebar_position: 26
description: "Qué son los JIDs, LIDs y sufijos de dispositivo de WhatsApp, por qué info.sender puede terminar en @lid, y cómo normalizar, comparar y construir JIDs de forma segura en whatsmeow-node."
keywords: [whatsapp jid, whatsapp lid, whatsapp @lid, jid s.whatsapp.net, id de dispositivo whatsapp jid, whatsmeow jid, jid whatsapp número de teléfono, normalizar jid whatsapp]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/whatsapp-jids-and-lids.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/whatsapp-jids-and-lids.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Entendiendo los JIDs, LIDs e IDs de Dispositivo de WhatsApp",
      "description": "Qué son los JIDs, LIDs y sufijos de dispositivo de WhatsApp, por qué info.sender puede terminar en @lid, y cómo normalizar, comparar y construir JIDs de forma segura en whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/whatsapp-jids-and-lids.png",
      "step": [
        {"@type": "HowToStep", "name": "Leer la Anatomía del JID", "text": "Un JID es user@server. El servidor indica qué es: s.whatsapp.net para números de teléfono, lid para identidades ocultas, g.us para grupos, newsletter para canales y broadcast para estados y listas de difusión."},
        {"@type": "HowToStep", "name": "Quitar los Sufijos de Dispositivo", "text": "Los JIDs de remitente pueden incluir una parte de dispositivo (user:12@s.whatsapp.net). Normalízalos con un helper toUserJid() antes de guardarlos o compararlos."},
        {"@type": "HowToStep", "name": "Manejar LIDs", "text": "info.sender e info.chat pueden ser JIDs @lid sin número de teléfono. Trátalos como IDs opacos y responde a info.chat."},
        {"@type": "HowToStep", "name": "Comparar JIDs de Forma Segura", "text": "Compara JIDs normalizados, nunca strings crudos, y nunca asumas que un LID y un JID de número de teléfono pertenecen a personas distintas."},
        {"@type": "HowToStep", "name": "Construir JIDs desde Números de Teléfono", "text": "Quita todo lo que no sea dígito de un número internacional y agrega @s.whatsapp.net, o resuelve con isOnWhatsApp() para obtener el JID canónico."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Entendiendo los JIDs, LIDs e IDs de Dispositivo de WhatsApp",
      "description": "Qué son los JIDs, LIDs y sufijos de dispositivo de WhatsApp, por qué info.sender puede terminar en @lid, y cómo normalizar, comparar y construir JIDs de forma segura en whatsmeow-node.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/whatsapp-jids-and-lids.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Entendiendo los JIDs, LIDs e IDs de Dispositivo de WhatsApp](/img/guides/es/whatsapp-jids-and-lids.png)
![Entendiendo los JIDs, LIDs e IDs de Dispositivo de WhatsApp](/img/guides/es/whatsapp-jids-and-lids-light.png)

# Entendiendo los JIDs, LIDs e IDs de Dispositivo de WhatsApp

Cada chat, usuario, grupo y canal de WhatsApp se identifica con un **JID** (Jabber ID), un string como `5989...@s.whatsapp.net`. whatsmeow-node maneja los JIDs como strings simples (`type JID = string`), así que es fácil tratarlos como números de teléfono. Eso funciona hasta que llega un mensaje de `12345678901234@lid` o de `5989...:12@s.whatsapp.net`. Esta guía explica qué significan esas formas y te da helpers pequeños para manejarlas correctamente.

## Requisitos Previos

- whatsmeow-node instalado ([Guía de instalación](/docs/installation))
- Una sesión vinculada ([Cómo Vincular WhatsApp](pair-whatsapp))

## Anatomía de un JID

Un JID tiene hasta cuatro partes. whatsmeow las formatea así:

```
<user>@<server>                     5989XXXXXXX@s.whatsapp.net
<user>:<device>@<server>            5989XXXXXXX:12@s.whatsapp.net
<user>.<agent>:<device>@<server>    5989XXXXXXX.1:12@s.whatsapp.net   (rare)
<server>                            s.whatsapp.net                    (server-only JID)
```

El **servidor** indica qué tipo de entidad es el JID:

| Servidor | Ejemplo | Qué es |
|---|---|---|
| `s.whatsapp.net` | `5989XXXXXXX@s.whatsapp.net` | Un usuario, identificado por número de teléfono (solo dígitos, sin `+`) |
| `lid` | `123456789012345@lid` | Un usuario, identificado por un **LID** oculto (no contiene número de teléfono) |
| `g.us` | `120363XXXXXXXXXXXX@g.us` | Un grupo |
| `newsletter` | `120363XXXXXXXXXXXX@newsletter` | Un canal (newsletter) |
| `broadcast` | `status@broadcast` | Estados. Cualquier otro usuario `@broadcast` es una lista de difusión |
| `c.us` | `5989XXXXXXX@c.us` | Servidor de usuarios legado. whatsmeow lo usa internamente para búsquedas por teléfono; rara vez lo verás en eventos |
| `bot` | `867051314767696@bot` | Meta AI y otros bots |
| `hosted`, `hosted.lid` | — | Cuentas de empresa de la Cloud API (hosted). `hosted.lid` es la forma LID |

whatsmeow define algunos servidores más (`msgr`, `interop`) para mensajería entre apps. Puedes tratarlos como "otros".

## Sufijos de Dispositivo

Una cuenta de WhatsApp puede tener hasta cuatro dispositivos vinculados además del teléfono. Cada dispositivo tiene un número: `0` es el teléfono principal, y los dispositivos vinculados (WhatsApp Web, Desktop, tu sesión de whatsmeow-node) reciben números más altos. Cuando un JID se refiere a un dispositivo específico, el número de dispositivo va después de dos puntos:

```
5989XXXXXXX@s.whatsapp.net      → the user (as a sender: their primary phone, device 0)
5989XXXXXXX:12@s.whatsapp.net   → device #12 of that user
```

Verás JIDs de dispositivo en dos lugares comunes:

- **`init()` y el evento `connected`** devuelven tu propio JID *con* el número de dispositivo de tu sesión, por ejemplo `5989XXXXXXX:12@s.whatsapp.net`.
- **`info.sender`** en los mensajes entrantes incluye el dispositivo desde el que se envió el mensaje. La misma persona puede aparecer como `...:3` (un dispositivo vinculado) o sin sufijo (dispositivo 0, el teléfono principal), según el dispositivo que haya usado.

whatsmeow también entiende una parte de **agente** (`user.<agent>:<device>@server`). Solo aparece en la salida normal cuando el agente no es cero, algo que casi nunca verás. Igual puedes encontrarte con la forma explícita `user.0:N@server` si intercambias JIDs con otras herramientas o librerías. El helper de abajo interpreta ambas.

`info.chat` nunca tiene sufijo de dispositivo en chats privados, así que siempre es seguro enviarle mensajes.

## ¿Qué Son los LIDs?

Un **LID** (Linked Identity) es un número opaco por cuenta que WhatsApp usa para identificar a un usuario *sin* revelar su número de teléfono. WhatsApp está moviendo cada vez más tráfico a direccionamiento por LID. Empezó con grupos grandes y comunidades, y ahora también aparece en chats privados.

Para ti, esto significa:

- En grupos, `info.sender` puede ser `123456789012345@lid` en lugar de un JID de número de teléfono. Pasa incluso con personas que están en tus contactos.
- En chats privados, tanto `info.chat` como `info.sender` pueden ser `@lid`.
- `getGroupInfo()` puede devolver participantes cuyo `jid` termina en `@lid`.
- `isOnWhatsApp()` puede devolver un JID `@lid` como `jid` canónico de un número de teléfono.
- La **misma persona** puede aparecer como `5989XXXXXXX@s.whatsapp.net` en un lugar y como `123456789012345@lid` en otro. Los dos strings no tienen nada en común.

Los dígitos de un LID **no** son un número de teléfono. No se los muestres a los usuarios como si lo fueran, ni los pases al campo de teléfono de un CRM.

### ¿whatsmeow-node expone el mapeo número de teléfono ↔ LID? {#lid-mapping}

**No, hoy no.** whatsmeow (la librería de Go) lleva el mapeo internamente. Registra `SenderAlt` / `RecipientAlt` y el `AddressingMode` de cada mensaje, `PhoneNumber` / `LID` en los participantes de grupo, y mantiene un mapa de LIDs en su store. whatsmeow-node no serializa nada de eso. Lo que llega a TypeScript es:

| API | Campos JID que recibes |
|---|---|
| evento `message` → `info` | `chat`, `sender`, `pushName` (sin JID alternativo ni modo de direccionamiento) |
| `getGroupInfo()` → `participants[]` | `jid`, `isAdmin`, `isSuperAdmin` (sin teléfono/LID por separado) |
| `isOnWhatsApp()` | `query`, `isIn`, `jid` (el JID canónico, posiblemente `@lid`) |

En la práctica:

1. **Indexa tus datos por el JID que recibas**, normalizado con `toUserJid()`. No asumas que siempre puedes pasar de una forma a la otra.
2. **Responde a `info.chat`**, que siempre funciona sin importar el modo de direccionamiento. WhatsApp enruta correctamente tanto los JIDs LID como los de número de teléfono. La excepción son `status@broadcast` y las listas de difusión: ignóralos, porque responder ahí publica un estado o envía una difusión.
3. **Cuando necesites un número de teléfono**, usa `phoneFromJid()` (abajo), que solo lo devuelve para JIDs de número de teléfono. Para remitentes `@lid`, usa `info.pushName` como alternativa o pídeselo al usuario.
4. **Cuando partas de un número de teléfono**, construye el JID con `phoneToJid()`, o resuélvelo con `isOnWhatsApp()` y guarda el JID que devuelve.

:::note
whatsmeow persiste su mapa de LIDs en la base de datos de la sesión (tabla `whatsmeow_lid_map`, columnas `lid` y `pn`, ambas guardadas solo con la parte de usuario). Es un esquema interno que puede cambiar en cualquier actualización de whatsmeow, así que léelo bajo tu propio riesgo. Nunca escribas en ella.
:::

## Los Helpers

Pon esto en un archivo `jid.ts`. Son funciones puras sobre strings, sin dependencias:

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

`toUserJid()` hace lo mismo que `JID.ToNonAD()` de whatsmeow:

| Entrada | `toUserJid()` |
|---|---|
| `5989XXXXXXX@s.whatsapp.net` | `5989XXXXXXX@s.whatsapp.net` |
| `5989XXXXXXX:12@s.whatsapp.net` | `5989XXXXXXX@s.whatsapp.net` |
| `5989XXXXXXX.0:12@s.whatsapp.net` | `5989XXXXXXX@s.whatsapp.net` |
| `123456789012345:3@lid` | `123456789012345@lid` |
| `120363XXXXXXXXXXXX@g.us` | `120363XXXXXXXXXXXX@g.us` |
| `status@broadcast` | `status@broadcast` |

## Comparar JIDs de Forma Segura

Nunca compares strings de remitente crudos. Normaliza ambos lados primero:

```typescript
export function sameUser(a: JID, b: JID): boolean {
  return toUserJid(a) === toUserJid(b);
}
```

Para listas de permitidos y búsquedas, normaliza una vez al construir el set y otra vez en cada búsqueda:

```typescript
const ADMINS = new Set(["59899111222@s.whatsapp.net"].map(toUserJid));

client.on("message", async ({ info }) => {
  if (!ADMINS.has(toUserJid(info.sender))) return;
  // ...
});
```

Verificar si estás en un grupo funciona igual, porque `init()` devuelve tu JID con sufijo de dispositivo:

```typescript
const { jid } = await client.init();
if (!jid) throw new Error("Not paired");
const me = toUserJid(jid);

const group = await client.getGroupInfo("120363XXXXX@g.us");
const isMember = group.participants.some((p) => sameUser(p.jid, me));
```

:::warning Normalizar no conecta LIDs
`sameUser("5989XXXXXXX@s.whatsapp.net", "123456789012345@lid")` devuelve `false` aunque ambos pertenezcan a la misma persona, y whatsmeow-node no puede decirte lo contrario (ver [arriba](#lid-mapping)). Si una lista de permitidos tiene que funcionar en grupos con direccionamiento LID, registra el JID `@lid` la primera vez que veas a ese usuario, o compara por otro dato.
:::

## Construir JIDs desde Números de Teléfono

Un JID de número de teléfono es el número en formato internacional, **solo dígitos** (sin `+`, espacios ni guiones), seguido de `@s.whatsapp.net`:

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

Esto no verifica que el número esté en WhatsApp. Para verificarlo y obtener el JID canónico en un solo paso, usa `isOnWhatsApp()`. whatsmeow espera los números en formato internacional **con** el prefijo `+`:

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

Los números que no están registrados quedan fuera del resultado (así que `result` es `undefined`) o vuelven con `isIn: false`. La verificación de arriba cubre ambos casos. El `jid` devuelto puede ser un JID `@lid`. Se puede enviar a ambas formas.

## Obtener un Número de Teléfono desde un JID

Solo los JIDs de número de teléfono contienen un número de teléfono. Devuelve `null` para todo lo demás, así no puedes usar por error un LID o un ID de grupo como número de teléfono:

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

## Ejemplo Completo

Un bot que normaliza cada remitente y responde dos comandos: `!whoami` muestra lo que puede saber de ti, y `!admin` revisa una lista de permitidos por número de teléfono. Importa los helpers de `jid.ts` de arriba:

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

## Errores Comunes

:::warning Extraer números de teléfono de los JIDs de remitente
`jid.split("@")[0]` solo es un número de teléfono para JIDs `@s.whatsapp.net` *sin* sufijo de dispositivo. Con `5989...:12@s.whatsapp.net` obtienes `"5989...:12"`, y con `@lid` obtienes un LID que parece un número de teléfono pero no lo es. La [guía de Chatwoot](integrate-chatwoot) usa este atajo para llenar `phone_number`. Funciona para chats privados simples, pero en producción usa `phoneFromJid()` y recurre a `pushName` cuando devuelva `null`.
:::

:::warning Comparar remitentes o chats como strings exactos
`info.sender === "5989...@s.whatsapp.net"` falla en cuanto el mensaje llega desde un dispositivo vinculado (`:3`) o con direccionamiento LID. El bot relay de [Reenviar Mensajes](forward-messages) compara `info.chat` con un JID fijo en el código. Eso está bien para grupos (`@g.us` nunca cambia), pero un chat privado puede llegar como `@lid`. Normaliza con `toUserJid()` y registra en logs los JIDs que realmente recibes antes de fijarlos en el código.
:::

:::warning Responder a un JID de dispositivo
Enviar a un JID con parte de dispositivo falla con `message recipient must be a user JID with no device part`. Esto pasa cuando respondes a `info.sender` o le escribes a tu propio JID de `init()`. Responde a `info.chat`, o pasa el JID por `toUserJid()` primero.
:::

:::warning Responder al remitente en lugar del chat
En grupos, `info.sender` es la persona e `info.chat` es el grupo. Enviar a `info.sender` (aunque esté normalizado) inicia una conversación privada. Usa `info.chat` salvo que realmente quieras escribirle por privado.
:::

:::warning Mostrar LIDs como números de teléfono
Los LIDs son strings numéricos largos, así que terminan en interfaces y CRMs como números falsos del tipo `+123456789012345`. Revisa `jidKind()` antes de mostrar o guardar algo como número de teléfono.
:::

<RelatedGuides slugs={["build-a-bot", "automate-group-messages", "forward-messages", "integrate-chatwoot"]} />
