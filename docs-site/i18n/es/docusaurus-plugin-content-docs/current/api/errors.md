---
title: Manejo de Errores
sidebar_label: Errores
sidebar_position: 3
description: "Manejo de errores en whatsmeow-node — clases de errores tipados, códigos de error para cada categoría de método y patrones de captura recomendados."
---

# Manejo de Errores

Todos los métodos del cliente lanzan excepciones en caso de fallo. Los errores están tipados para facilitar su manejo.

## Clases de Errores

```typescript
import {
  WhatsmeowError,     // Base class for all whatsmeow errors
  TimeoutError,       // IPC command timed out
  ProcessExitedError  // Go binary crashed or exited
} from "@whatsmeow-node/whatsmeow-node";
```

## Códigos de Error Comunes

| Código | Origen | Significado |
|--------|--------|-------------|
| `ERR_TIMEOUT` | TS | Timeout del comando IPC (predeterminado: 30s) |
| `ERR_PROCESS_EXITED` | TS | El binario de Go se detuvo o terminó |
| `ERR_NOT_INIT` | Go | `init()` no fue llamado todavía |
| `ERR_INVALID_ARGS` | Go | Argumentos faltantes o inválidos |
| `ERR_INVALID_JID` | Go | JID con formato incorrecto |
| `ERR_UNKNOWN_CMD` | Go | Comando IPC no reconocido |
| `ERR_ALREADY_INIT` | Go | `init()` fue llamado más de una vez |
| `ERR_STORE` | Go | No se pudo abrir la base de datos de sesión |

## Códigos de Error por Método

Cada método tiene su propio código de error para que puedas identificar exactamente qué falló:

| Área | Códigos de Error |
|------|-----------------|
| Conexión | `ERR_CONNECT`, `ERR_PAIR`, `ERR_QR`, `ERR_LOGOUT` |
| Mensajería | `ERR_SEND`, `ERR_REVOKE`, `ERR_MARK_READ`, `ERR_PARSE` |
| Medios | `ERR_UPLOAD`, `ERR_DOWNLOAD`, `ERR_READ_FILE`, `ERR_TEMPFILE`, `ERR_WRITE` |
| Grupos | `ERR_CREATE_GROUP`, `ERR_GROUP_INFO`, `ERR_GROUPS`, `ERR_GROUP_TOPIC`, `ERR_SET_GROUP_NAME`, `ERR_SET_GROUP_DESC`, `ERR_SET_GROUP_PHOTO`, `ERR_SET_GROUP_ANNOUNCE`, `ERR_SET_GROUP_LOCKED`, `ERR_SET_MEMBER_ADD_MODE`, `ERR_SET_JOIN_APPROVAL`, `ERR_INVITE_LINK`, `ERR_JOIN_GROUP`, `ERR_LEAVE_GROUP`, `ERR_UPDATE_PARTICIPANTS`, `ERR_GROUP_REQUESTS`, `ERR_UPDATE_REQUESTS` |
| Comunidades | `ERR_LINK_GROUP`, `ERR_UNLINK_GROUP`, `ERR_SUB_GROUPS`, `ERR_LINKED_PARTICIPANTS` |
| Newsletters | `ERR_CREATE_NEWSLETTER`, `ERR_NEWSLETTERS`, `ERR_NEWSLETTER_INFO`, `ERR_NEWSLETTER_MESSAGES`, `ERR_NEWSLETTER_UPDATES`, `ERR_NEWSLETTER_SUBSCRIBE`, `ERR_NEWSLETTER_REACTION`, `ERR_NEWSLETTER_MARK_VIEWED`, `ERR_NEWSLETTER_MUTE`, `ERR_FOLLOW_NEWSLETTER`, `ERR_UNFOLLOW_NEWSLETTER` |
| Contactos | `ERR_CHECK`, `ERR_USER_INFO`, `ERR_USER_DEVICES`, `ERR_PROFILE_PIC`, `ERR_BUSINESS_PROFILE`, `ERR_SET_STATUS` |
| Privacidad | `ERR_GET_PRIVACY`, `ERR_SET_PRIVACY`, `ERR_GET_STATUS_PRIVACY`, `ERR_SET_DISAPPEARING`, `ERR_BLOCKLIST`, `ERR_UPDATE_BLOCKLIST` |
| Presencia | `ERR_PRESENCE`, `ERR_CHAT_PRESENCE`, `ERR_SUBSCRIBE_PRESENCE` |
| QR y Enlaces | `ERR_QR_LINK`, `ERR_RESOLVE_QR`, `ERR_RESOLVE_BIZ_LINK` |
| Encuestas | `ERR_POLL_VOTE` |
| Bots | `ERR_BOT_LIST`, `ERR_BOT_PROFILES` |
| Estado de App | `ERR_FETCH_APP_STATE`, `ERR_MARK_NOT_DIRTY` |
| Criptografía | `ERR_DECRYPT`, `ERR_ENCRYPT` |
| Llamadas | `ERR_REJECT_CALL` |
| Otros | `ERR_SET_PASSIVE`, `ERR_ACCEPT_TOS` |

## Manejo Básico

```typescript
try {
  await client.sendMessage(jid, { conversation: "hello" });
} catch (err) {
  if (err instanceof WhatsmeowError) {
    console.error(`WhatsApp error [${err.code}]: ${err.message}`);
  }
}
```

## Manejo de Errores Específicos

```typescript
try {
  const profile = await client.getBusinessProfile(jid);
} catch (err) {
  if (err instanceof WhatsmeowError) {
    switch (err.code) {
      case "ERR_BUSINESS_PROFILE":
        console.log("Not a business account");
        break;
      case "ERR_INVALID_JID":
        console.error("Bad JID format");
        break;
      default:
        throw err;
    }
  }
}
```
