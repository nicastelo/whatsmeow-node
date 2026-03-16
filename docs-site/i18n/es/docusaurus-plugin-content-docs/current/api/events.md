---
title: Referencia de Eventos
sidebar_label: Eventos
sidebar_position: 2
description: "Todos los eventos de whatsmeow-node — conexión, mensaje, grupo, presencia, llamada, newsletter y eventos QR con payloads completamente tipados."
---

# Eventos

`WhatsmeowClient` extiende `EventEmitter` y emite eventos tipados. Todos los [eventos de whatsmeow](https://pkg.go.dev/go.mau.fi/whatsmeow#section-readme) son reenviados.

## Uso

```typescript
client.on("message", ({ info, message }) => { /* ... */ });
client.on("connected", ({ jid }) => { /* ... */ });
```

## Eventos de Conexión

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `connected` | `{ jid: string }` | Conexión con WhatsApp establecida. Es seguro enviar mensajes. |
| `disconnected` | `{}` | Conexión perdida. La reconexión automática es automática. |
| `logged_out` | `{ reason: string }` | Sesión revocada. Debes volver a emparejar. |
| `stream_error` | `{ code: string }` | Error de protocolo. Generalmente seguido por reconexión automática. |
| `temporary_ban` | `{ code: string, expire: string }` | Suspensión temporal de WhatsApp. |
| `keep_alive_timeout` | `{ errorCount: number }` | Los pings de keep-alive están fallando. La conexión puede estar degradada. |
| `keep_alive_restored` | `{}` | Keep-alive recuperado. La conexión está saludable. |

## Eventos de Mensajes

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `message` | `{ info: MessageInfo, message: Record<string, unknown> }` | Nuevo mensaje recibido. |
| `message:receipt` | `{ type: string, chat: string, sender: string, isGroup: boolean, ids: string[], timestamp: number }` | Confirmación de lectura/entrega. |

### MessageInfo

```typescript
interface MessageInfo {
  id: string;
  chat: string;      // JID of the chat
  sender: string;    // JID of the sender
  isFromMe: boolean;
  isGroup: boolean;
  timestamp: number;  // Unix timestamp
  pushName: string;   // Sender's display name
}
```

## Eventos de Presencia

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `presence` | `{ jid: string, presence: "available" \| "unavailable", lastSeen?: number }` | Estado en línea/fuera de línea del contacto. |
| `chat_presence` | `{ chat: string, sender: string, state: "composing" \| "paused", media: "audio" \| "" }` | Indicador de escritura/grabación. |

## Eventos de Grupos

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `group:info` | `GroupInfoEvent` | Metadatos del grupo cambiaron. |
| `group:joined` | `{ jid: string, name: string }` | Te uniste a un grupo. |

### GroupInfoEvent

```typescript
interface GroupInfoEvent {
  jid: string;
  name?: string;         // New group name
  description?: string;  // New description
  announce?: boolean;     // Announcement mode changed
  locked?: boolean;       // Lock status changed
  ephemeral?: boolean;    // Disappearing messages changed
  join?: string[];        // JIDs that joined
  leave?: string[];       // JIDs that left
  promote?: string[];     // JIDs promoted to admin
  demote?: string[];      // JIDs demoted from admin
}
```

## Eventos de Medios

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `picture` | `{ jid: string, remove: boolean, pictureId?: string }` | Foto de perfil/grupo cambió. |

## Eventos de Llamadas

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `call:offer` | `{ from: string, callId: string }` | Llamada entrante. |
| `call:accept` | `{ from: string, callId: string }` | Llamada aceptada. |
| `call:terminate` | `{ from: string, callId: string, reason: string }` | Llamada finalizada. |

## Otros Eventos

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `identity_change` | `{ jid: string, timestamp: number }` | La clave de identidad del contacto cambió (se registró nuevamente). |
| `history_sync` | `{ type: string }` | Progreso de sincronización de historial. |
| `qr` | `{ code: string }` | Código QR para emparejar. |
| `qr:timeout` | `null` | El emparejamiento por QR expiró. |
| `qr:error` | `{ event: string }` | Error en el canal QR. |
| `log` | `{ level: string, msg: string, [key: string]: unknown }` | Salida de log del binario de Go. Útil para depuración. |
| `error` | `Error` | Error interno. |
| `exit` | `{ code: number \| null }` | El binario de Go terminó. |
