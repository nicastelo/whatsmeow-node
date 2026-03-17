---
title: Referencia de Eventos
sidebar_label: Eventos
sidebar_position: 2
description: "Todos os eventos do whatsmeow-node — conexao, mensagem, grupo, presenca, chamada, newsletter e eventos QR com payloads totalmente tipados."
keywords: [eventos whatsmeow, evento mensagem whatsapp, webhook whatsapp nodejs, listener eventos whatsapp typescript]
---

# Eventos

`WhatsmeowClient` estende `EventEmitter` e emite eventos tipados. Todos os [eventos do whatsmeow](https://pkg.go.dev/go.mau.fi/whatsmeow#section-readme) sao encaminhados.

## Uso

```typescript
client.on("message", ({ info, message }) => { /* ... */ });
client.on("connected", ({ jid }) => { /* ... */ });
```

## Eventos de Conexao

| Evento | Payload | Descricao |
|--------|---------|-----------|
| `connected` | `{ jid: string }` | Conexao com o WhatsApp estabelecida. Seguro para enviar mensagens. |
| `disconnected` | `{}` | Conexao perdida. A reconexao automatica e feita internamente. |
| `logged_out` | `{ reason: string }` | Sessao revogada. E necessario parear novamente. |
| `stream_error` | `{ code: string }` | Erro de protocolo. Geralmente seguido por reconexao automatica. |
| `temporary_ban` | `{ code: string, expire: string }` | Banimento temporario do WhatsApp. |
| `keep_alive_timeout` | `{ errorCount: number }` | Pings de keep-alive falhando. A conexao pode estar degradada. |
| `keep_alive_restored` | `{}` | Keep-alive recuperado. A conexao esta saudavel. |

## Eventos de Mensagem

| Evento | Payload | Descricao |
|--------|---------|-----------|
| `message` | `{ info: MessageInfo, message: Record<string, unknown> }` | Nova mensagem recebida. |
| `message:receipt` | `{ type: string, chat: string, sender: string, isGroup: boolean, ids: string[], timestamp: number }` | Confirmacao de leitura/entrega. |

### MessageInfo

```typescript
interface MessageInfo {
  id: string;
  chat: string;      // JID do chat
  sender: string;    // JID do remetente
  isFromMe: boolean;
  isGroup: boolean;
  timestamp: number;  // Timestamp Unix
  pushName: string;   // Nome de exibicao do remetente
}
```

## Eventos de Presenca

| Evento | Payload | Descricao |
|--------|---------|-----------|
| `presence` | `{ jid: string, presence: "available" \| "unavailable", lastSeen?: number }` | Status online/offline do contato. |
| `chat_presence` | `{ chat: string, sender: string, state: "composing" \| "paused", media: "audio" \| "" }` | Indicador de digitacao/gravacao. |

## Eventos de Grupo

| Evento | Payload | Descricao |
|--------|---------|-----------|
| `group:info` | `GroupInfoEvent` | Metadados do grupo alterados. |
| `group:joined` | `{ jid: string, name: string }` | Voce entrou em um grupo. |

### GroupInfoEvent

```typescript
interface GroupInfoEvent {
  jid: string;
  name?: string;         // Novo nome do grupo
  description?: string;  // Nova descricao
  announce?: boolean;     // Modo de anuncio alterado
  locked?: boolean;       // Status de bloqueio alterado
  ephemeral?: boolean;    // Mensagens temporarias alteradas
  join?: string[];        // JIDs que entraram
  leave?: string[];       // JIDs que sairam
  promote?: string[];     // JIDs promovidos a admin
  demote?: string[];      // JIDs rebaixados de admin
}
```

## Eventos de Midia

| Evento | Payload | Descricao |
|--------|---------|-----------|
| `picture` | `{ jid: string, remove: boolean, pictureId?: string }` | Foto de perfil/grupo alterada. |

## Eventos de Chamada

| Evento | Payload | Descricao |
|--------|---------|-----------|
| `call:offer` | `{ from: string, callId: string }` | Chamada recebida. |
| `call:accept` | `{ from: string, callId: string }` | Chamada aceita. |
| `call:terminate` | `{ from: string, callId: string, reason: string }` | Chamada encerrada. |

## Outros Eventos

| Evento | Payload | Descricao |
|--------|---------|-----------|
| `identity_change` | `{ jid: string, timestamp: number }` | Chave de identidade do contato alterada (recadastro). |
| `history_sync` | `{ type: string }` | Progresso da sincronizacao de historico. |
| `qr` | `{ code: string }` | QR code para pareamento. |
| `qr:timeout` | `null` | Tempo de pareamento por QR expirou. |
| `qr:error` | `{ event: string }` | Erro no canal QR. |
| `log` | `{ level: string, msg: string, [key: string]: unknown }` | Saida de log do binario Go. Util para depuracao. |
| `error` | `Error` | Erro interno. |
| `exit` | `{ code: number \| null }` | O binario Go encerrou. |
