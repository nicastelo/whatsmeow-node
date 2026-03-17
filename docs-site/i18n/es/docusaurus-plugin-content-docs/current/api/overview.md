---
title: Referencia de la API
sidebar_label: API General
sidebar_position: 1
description: "Referencia completa de la API de whatsmeow-node — 100 métodos tipados para mensajería, grupos, medios, newsletters, presencia y más."
keywords: [api whatsmeow-node, referencia api whatsapp, métodos cliente whatsapp, api typescript whatsmeow]
---

# API General

## `createClient(options)`

Retorna una instancia de `WhatsmeowClient`.

| Opción           | Tipo     | Predeterminado | Descripción                                |
|------------------|----------|----------------|--------------------------------------------|
| `store`          | `string` | requerido      | Ruta SQLite o URL de Postgres              |
| `binaryPath`     | `string` | auto           | Ruta al binario de Go                      |
| `commandTimeout` | `number` | `30000`        | Timeout de comandos IPC en ms              |

## Conexión

- `init()` — Abre el store y crea el cliente whatsmeow. Retorna `{ jid }` si ya está emparejado.
- `getQRChannel()` — Configura el canal de emparejamiento QR. Llámalo antes de `connect()`.
- `pairCode(phone)` — Empareja vía número de teléfono (alternativa al QR). Llámalo después de `connect()`.
- `connect()` — Conectar a WhatsApp
- `disconnect()` — Desconectar de WhatsApp
- `logout()` — Cerrar sesión y eliminar el dispositivo
- `isConnected()` — Verificar estado de conexión
- `isLoggedIn()` — Verificar estado de sesión
- `waitForConnection(timeoutMs?)` — Esperar hasta estar conectado e iniciado sesión, o timeout
- `resetConnection()` — Reiniciar la conexión WebSocket
- `close()` — Terminar el subproceso de Go

## Mensajería

- `sendMessage(jid, message)` — Enviar un mensaje tipado (conversación, texto extendido con respuestas)
- `sendRawMessage(jid, message)` — Enviar cualquier JSON con forma de `waE2E.Message`
- `sendReaction(chat, sender, id, reaction)` — Reaccionar a un mensaje (string vacío para eliminar)
- `editMessage(chat, id, message)` — Editar un mensaje enviado previamente
- `revokeMessage(chat, sender, id)` — Revocar/eliminar un mensaje
- `markRead(ids, chat, sender?)` — Marcar mensajes como leídos

## Encuestas

- `sendPollCreation(jid, name, options, selectableCount)` — Crear y enviar una encuesta
- `sendPollVote(pollChat, pollSender, pollId, pollTimestamp, options)` — Votar en una encuesta

## Medios

- `downloadMedia(msg)` — Descargar medios de un mensaje recibido
- `downloadAny(message)` — Descargar medios de cualquier tipo de mensaje (auto-detecta)
- `downloadMediaWithPath(opts)` — Descargar medios usando ruta directa y claves
- `uploadMedia(path, mediaType)` — Subir medios para enviar (`"image"` | `"video"` | `"audio"` | `"document"`)

Los medios usan rutas de archivos temporales en lugar de base64 para evitar sobrecargar el pipe IPC. Upload retorna `{ URL, directPath, mediaKey, fileEncSHA256, fileSHA256, fileLength }`.

## Contactos y Usuarios

- `isOnWhatsApp(phones)` — Verificar si números de teléfono están en WhatsApp
- `getUserInfo(jids)` — Obtener info de usuario (estado, ID de foto, nombre verificado)
- `getProfilePicture(jid)` — Obtener URL de foto de perfil
- `getUserDevices(jids)` — Obtener todos los dispositivos de usuarios dados
- `getBusinessProfile(jid)` — Obtener info de perfil de negocio
- `setStatusMessage(message)` — Establecer tu mensaje de estado

## Grupos

- `createGroup(name, participants)` — Crear un grupo
- `getGroupInfo(jid)` — Obtener metadatos del grupo
- `getGroupInfoFromLink(code)` — Obtener info del grupo desde un enlace de invitación
- `getGroupInfoFromInvite(jid, inviter, code, expiration)` — Obtener info del grupo desde una invitación directa
- `getJoinedGroups()` — Listar todos los grupos a los que perteneces
- `getGroupInviteLink(jid, reset?)` — Obtener/reiniciar enlace de invitación
- `joinGroupWithLink(code)` — Unirse vía enlace de invitación
- `joinGroupWithInvite(jid, inviter, code, expiration)` — Unirse vía invitación directa
- `leaveGroup(jid)` — Salir de un grupo
- `setGroupName(jid, name)` — Actualizar nombre del grupo
- `setGroupTopic(jid, topic, previousId?, newId?)` — Actualizar tema del grupo (texto de anuncio)
- `setGroupDescription(jid, description)` — Actualizar descripción del grupo
- `setGroupPhoto(jid, path)` — Actualizar foto del grupo
- `setGroupAnnounce(jid, announce)` — Alternar modo de anuncio
- `setGroupLocked(jid, locked)` — Alternar bloqueo del grupo
- `updateGroupParticipants(jid, participants, action)` — Agregar/eliminar/promover/degradar
- `getGroupRequestParticipants(jid)` — Obtener solicitudes de ingreso pendientes
- `updateGroupRequestParticipants(jid, participants, action)` — Aprobar/rechazar solicitudes de ingreso
- `setGroupMemberAddMode(jid, mode)` — `"admin_add"` | `"all_member_add"`
- `setGroupJoinApprovalMode(jid, enabled)` — Habilitar/deshabilitar aprobación de ingreso

## Comunidades

- `linkGroup(parent, child)` — Vincular un grupo hijo a una comunidad padre
- `unlinkGroup(parent, child)` — Desvincular un grupo hijo
- `getSubGroups(jid)` — Obtener subgrupos de una comunidad
- `getLinkedGroupsParticipants(jid)` — Obtener participantes de todos los grupos vinculados

## Presencia

- `sendPresence(presence)` — Establecer estado en línea/fuera de línea
- `sendChatPresence(jid, presence, media?)` — Establecer indicador de escritura/grabación
- `subscribePresence(jid)` — Suscribirse a la presencia de un contacto

## Newsletters

- `getSubscribedNewsletters()` — Listar newsletters suscritos
- `newsletterSubscribeLiveUpdates(jid)` — Suscribirse a actualizaciones en vivo
- `createNewsletter(name, description, picture?)` — Crear un newsletter/canal
- `getNewsletterInfo(jid)` — Obtener metadatos del newsletter
- `getNewsletterInfoWithInvite(key)` — Obtener info del newsletter desde enlace de invitación
- `followNewsletter(jid)` — Seguir un newsletter
- `unfollowNewsletter(jid)` — Dejar de seguir un newsletter
- `getNewsletterMessages(jid, count, before?)` — Obtener mensajes del newsletter
- `getNewsletterMessageUpdates(jid, count, opts?)` — Obtener actualizaciones de mensajes
- `newsletterMarkViewed(jid, serverIds)` — Marcar mensajes como vistos
- `newsletterSendReaction(jid, serverId, reaction, messageId)` — Reaccionar a un mensaje del newsletter
- `newsletterToggleMute(jid, mute)` — Silenciar/activar un newsletter
- `acceptTOSNotice(noticeId, stage)` — Aceptar un aviso de Términos de Servicio
- `uploadNewsletter(path, mediaType)` — Subir medios para mensajes del newsletter

## Privacidad y Configuración

- `getPrivacySettings()` — Obtener todas las configuraciones de privacidad
- `tryFetchPrivacySettings(ignoreCache?)` — Obtener desde caché o servidor
- `setPrivacySetting(name, value)` — Actualizar una configuración de privacidad
- `getStatusPrivacy()` — Obtener reglas de audiencia predeterminadas para el estado
- `setDefaultDisappearingTimer(seconds)` — Establecer temporizador predeterminado de mensajes que desaparecen
- `setDisappearingTimer(jid, seconds)` — Establecer para un chat específico

## Lista de Bloqueo

- `getBlocklist()` — Obtener contactos bloqueados
- `updateBlocklist(jid, action)` — Bloquear/desbloquear (`"block"` | `"unblock"`)

## QR y Resolución de Enlaces

- `getContactQRLink(revoke?)` — Generar o revocar tu enlace QR de contacto
- `resolveContactQRLink(code)` — Resolver un código QR de contacto a info de usuario
- `resolveBusinessMessageLink(code)` — Resolver un enlace de mensaje de negocio

## Llamadas

- `rejectCall(from, callId)` — Rechazar una llamada entrante

## Configuración

- `setPassive(passive)` — Establecer modo pasivo (no recibir mensajes)
- `setForceActiveDeliveryReceipts(active)` — Forzar envío de confirmaciones de entrega

## Utilidades de Mensajes

- `generateMessageID()` — Generar un ID de mensaje único
- `buildMessageKey(chat, sender, id)` — Construir una clave de mensaje protobuf
- `buildUnavailableMessageRequest(chat, sender, id)` — Construir una solicitud para mensajes no disponibles
- `buildHistorySyncRequest(info, count)` — Construir un mensaje de solicitud de sincronización de historial
- `sendPeerMessage(message)` — Enviar un mensaje a tus propios dispositivos
- `sendMediaRetryReceipt(info, mediaKey)` — Solicitar re-subida de medios al remitente

## Bots

- `getBotListV2()` — Obtener la lista de bots disponibles
- `getBotProfiles(bots)` — Obtener perfiles de bots específicos

## Estado de Aplicación

- `fetchAppState(name, fullSync?, onlyIfNotSynced?)` — Obtener estado de aplicación del servidor
- `markNotDirty(cleanType, timestamp)` — Marcar un parche de estado de aplicación como no modificado

## Descifrar / Cifrar

- `decryptComment(info, message)` — Descifrar un mensaje de comentario
- `decryptPollVote(info, message)` — Descifrar un voto de encuesta
- `decryptReaction(info, message)` — Descifrar una reacción
- `decryptSecretEncryptedMessage(info, message)` — Descifrar un mensaje secreto cifrado
- `encryptComment(info, message)` — Cifrar un comentario
- `encryptPollVote(info, vote)` — Cifrar un voto de encuesta
- `encryptReaction(info, reaction)` — Cifrar una reacción

## Análisis de Mensajes Web

- `parseWebMessage(chatJid, webMsg)` — Analizar un WebMessageInfo (de sincronización de historial) en un evento de mensaje

## Genérico

- `call(method, args)` — Enviar cualquier comando al binario de Go (escape hatch)
