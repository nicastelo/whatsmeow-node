---
title: Tratamento de Erros
sidebar_label: Erros
sidebar_position: 3
description: "Tratamento de erros no whatsmeow-node — classes de erro tipadas, codigos de erro para cada categoria de metodo e padroes de catch recomendados."
keywords: [tratamento erros whatsmeow, erros api whatsapp, codigos erro whatsapp, tipos erro whatsmeow-node]
---

# Tratamento de Erros

Todos os metodos do client lancam excecoes em caso de falha. Os erros sao tipados para facilitar o tratamento.

## Classes de Erro

```typescript
import {
  WhatsmeowError,     // Classe base para todos os erros do whatsmeow
  TimeoutError,       // Timeout no comando IPC
  ProcessExitedError  // Binario Go travou ou encerrou
} from "@whatsmeow-node/whatsmeow-node";
```

## Codigos de Erro Comuns

| Codigo | Origem | Significado |
|--------|--------|-------------|
| `ERR_TIMEOUT` | TS | Timeout no comando IPC (padrao: 30s) |
| `ERR_PROCESS_EXITED` | TS | Binario Go travou ou encerrou |
| `ERR_NOT_INIT` | Go | `init()` ainda nao foi chamado |
| `ERR_INVALID_ARGS` | Go | Argumentos ausentes ou invalidos |
| `ERR_INVALID_JID` | Go | String JID malformada |
| `ERR_UNKNOWN_CMD` | Go | Comando IPC nao reconhecido |
| `ERR_ALREADY_INIT` | Go | `init()` chamado mais de uma vez |
| `ERR_STORE` | Go | Falha ao abrir o banco de dados da sessao |

## Codigos de Erro por Metodo

Cada metodo possui seu proprio codigo de erro para que voce possa identificar exatamente o que falhou:

| Area | Codigos de Erro |
|------|-----------------|
| Conexao | `ERR_CONNECT`, `ERR_PAIR`, `ERR_QR`, `ERR_LOGOUT` |
| Mensagens | `ERR_SEND`, `ERR_REVOKE`, `ERR_MARK_READ`, `ERR_PARSE` |
| Midia | `ERR_UPLOAD`, `ERR_DOWNLOAD`, `ERR_READ_FILE`, `ERR_TEMPFILE`, `ERR_WRITE` |
| Grupos | `ERR_CREATE_GROUP`, `ERR_GROUP_INFO`, `ERR_GROUPS`, `ERR_GROUP_TOPIC`, `ERR_SET_GROUP_NAME`, `ERR_SET_GROUP_DESC`, `ERR_SET_GROUP_PHOTO`, `ERR_SET_GROUP_ANNOUNCE`, `ERR_SET_GROUP_LOCKED`, `ERR_SET_MEMBER_ADD_MODE`, `ERR_SET_JOIN_APPROVAL`, `ERR_INVITE_LINK`, `ERR_JOIN_GROUP`, `ERR_LEAVE_GROUP`, `ERR_UPDATE_PARTICIPANTS`, `ERR_GROUP_REQUESTS`, `ERR_UPDATE_REQUESTS` |
| Comunidades | `ERR_LINK_GROUP`, `ERR_UNLINK_GROUP`, `ERR_SUB_GROUPS`, `ERR_LINKED_PARTICIPANTS` |
| Newsletters | `ERR_CREATE_NEWSLETTER`, `ERR_NEWSLETTERS`, `ERR_NEWSLETTER_INFO`, `ERR_NEWSLETTER_MESSAGES`, `ERR_NEWSLETTER_UPDATES`, `ERR_NEWSLETTER_SUBSCRIBE`, `ERR_NEWSLETTER_REACTION`, `ERR_NEWSLETTER_MARK_VIEWED`, `ERR_NEWSLETTER_MUTE`, `ERR_FOLLOW_NEWSLETTER`, `ERR_UNFOLLOW_NEWSLETTER` |
| Contatos | `ERR_CHECK`, `ERR_USER_INFO`, `ERR_USER_DEVICES`, `ERR_PROFILE_PIC`, `ERR_BUSINESS_PROFILE`, `ERR_SET_STATUS` |
| Privacidade | `ERR_GET_PRIVACY`, `ERR_SET_PRIVACY`, `ERR_GET_STATUS_PRIVACY`, `ERR_SET_DISAPPEARING`, `ERR_BLOCKLIST`, `ERR_UPDATE_BLOCKLIST` |
| Presenca | `ERR_PRESENCE`, `ERR_CHAT_PRESENCE`, `ERR_SUBSCRIBE_PRESENCE` |
| QR e Links | `ERR_QR_LINK`, `ERR_RESOLVE_QR`, `ERR_RESOLVE_BIZ_LINK` |
| Enquetes | `ERR_POLL_VOTE` |
| Bots | `ERR_BOT_LIST`, `ERR_BOT_PROFILES` |
| Estado do App | `ERR_FETCH_APP_STATE`, `ERR_MARK_NOT_DIRTY` |
| Criptografia | `ERR_DECRYPT`, `ERR_ENCRYPT` |
| Chamadas | `ERR_REJECT_CALL` |
| Outros | `ERR_SET_PASSIVE`, `ERR_ACCEPT_TOS` |

## Tratamento Basico

```typescript
try {
  await client.sendMessage(jid, { conversation: "hello" });
} catch (err) {
  if (err instanceof WhatsmeowError) {
    console.error(`Erro WhatsApp [${err.code}]: ${err.message}`);
  }
}
```

## Tratamento de Erros Especificos

```typescript
try {
  const profile = await client.getBusinessProfile(jid);
} catch (err) {
  if (err instanceof WhatsmeowError) {
    switch (err.code) {
      case "ERR_BUSINESS_PROFILE":
        console.log("Nao e uma conta comercial");
        break;
      case "ERR_INVALID_JID":
        console.error("Formato de JID invalido");
        break;
      default:
        throw err;
    }
  }
}
```
