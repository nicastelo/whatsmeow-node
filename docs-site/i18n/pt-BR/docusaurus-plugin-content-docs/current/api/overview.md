---
title: Referencia da API
sidebar_label: Visao Geral
sidebar_position: 1
description: "Referencia completa da API whatsmeow-node — 100 metodos tipados para mensagens, grupos, midia, newsletters, presenca e mais."
---

# Visao Geral da API

## `createClient(options)`

Retorna uma instancia de `WhatsmeowClient`.

| Opcao            | Tipo     | Padrao    | Descricao                                |
|------------------|----------|-----------|------------------------------------------|
| `store`          | `string` | obrigatorio | Caminho SQLite ou URL do Postgres       |
| `binaryPath`     | `string` | auto      | Caminho para o binario Go                |
| `commandTimeout` | `number` | `30000`   | Timeout de comando IPC em ms             |

## Conexao

- `init()` — Abre o store e cria o client whatsmeow. Retorna `{ jid }` se ja estiver pareado.
- `getQRChannel()` — Configura o canal de pareamento por QR code. Chame antes de `connect()`.
- `pairCode(phone)` — Parear via numero de telefone (alternativa ao QR). Chame apos `connect()`.
- `connect()` — Conectar ao WhatsApp
- `disconnect()` — Desconectar do WhatsApp
- `logout()` — Fazer logout e remover dispositivo
- `isConnected()` — Verificar status da conexao
- `isLoggedIn()` — Verificar status de login
- `waitForConnection(timeoutMs?)` — Aguardar ate estar conectado e logado, ou timeout
- `resetConnection()` — Resetar a conexao WebSocket
- `close()` — Encerrar o subprocesso Go

## Mensagens

- `sendMessage(jid, message)` — Enviar uma mensagem tipada (conversa, texto estendido com respostas)
- `sendRawMessage(jid, message)` — Enviar qualquer JSON no formato `waE2E.Message`
- `sendReaction(chat, sender, id, reaction)` — Reagir a uma mensagem (string vazia para remover)
- `editMessage(chat, id, message)` — Editar uma mensagem enviada anteriormente
- `revokeMessage(chat, sender, id)` — Revogar/excluir uma mensagem
- `markRead(ids, chat, sender?)` — Marcar mensagens como lidas

## Enquetes

- `sendPollCreation(jid, name, options, selectableCount)` — Criar e enviar uma enquete
- `sendPollVote(pollChat, pollSender, pollId, pollTimestamp, options)` — Votar em uma enquete

## Midia

- `downloadMedia(msg)` — Baixar midia de uma mensagem recebida
- `downloadAny(message)` — Baixar midia de qualquer tipo de mensagem (detecta automaticamente)
- `downloadMediaWithPath(opts)` — Baixar midia usando caminho direto e chaves
- `uploadMedia(path, mediaType)` — Fazer upload de midia para envio (`"image"` | `"video"` | `"audio"` | `"document"`)

Midia usa caminhos de arquivos temporarios em vez de base64 para evitar sobrecarga no pipe IPC. O upload retorna `{ URL, directPath, mediaKey, fileEncSHA256, fileSHA256, fileLength }`.

## Contatos e Usuarios

- `isOnWhatsApp(phones)` — Verificar se numeros de telefone estao no WhatsApp
- `getUserInfo(jids)` — Obter informacoes do usuario (status, ID da foto, nome verificado)
- `getProfilePicture(jid)` — Obter URL da foto de perfil
- `getUserDevices(jids)` — Obter todos os dispositivos de usuarios especificos
- `getBusinessProfile(jid)` — Obter informacoes do perfil comercial
- `setStatusMessage(message)` — Definir a mensagem de status da sua conta

## Grupos

- `createGroup(name, participants)` — Criar um grupo
- `getGroupInfo(jid)` — Obter metadados do grupo
- `getGroupInfoFromLink(code)` — Obter informacoes do grupo a partir de um link de convite
- `getGroupInfoFromInvite(jid, inviter, code, expiration)` — Obter informacoes do grupo a partir de um convite direto
- `getJoinedGroups()` — Listar todos os grupos dos quais participa
- `getGroupInviteLink(jid, reset?)` — Obter/resetar link de convite
- `joinGroupWithLink(code)` — Entrar via link de convite
- `joinGroupWithInvite(jid, inviter, code, expiration)` — Entrar via convite direto
- `leaveGroup(jid)` — Sair de um grupo
- `setGroupName(jid, name)` — Atualizar nome do grupo
- `setGroupTopic(jid, topic, previousId?, newId?)` — Atualizar topico do grupo (texto de anuncio)
- `setGroupDescription(jid, description)` — Atualizar descricao do grupo
- `setGroupPhoto(jid, path)` — Atualizar foto do grupo
- `setGroupAnnounce(jid, announce)` — Alternar modo de anuncio
- `setGroupLocked(jid, locked)` — Alternar bloqueio do grupo
- `updateGroupParticipants(jid, participants, action)` — Adicionar/remover/promover/rebaixar
- `getGroupRequestParticipants(jid)` — Obter solicitacoes de entrada pendentes
- `updateGroupRequestParticipants(jid, participants, action)` — Aprovar/rejeitar solicitacoes de entrada
- `setGroupMemberAddMode(jid, mode)` — `"admin_add"` | `"all_member_add"`
- `setGroupJoinApprovalMode(jid, enabled)` — Ativar/desativar aprovacao de entrada

## Comunidades

- `linkGroup(parent, child)` — Vincular um grupo filho a uma comunidade pai
- `unlinkGroup(parent, child)` — Desvincular um grupo filho
- `getSubGroups(jid)` — Obter subgrupos de uma comunidade
- `getLinkedGroupsParticipants(jid)` — Obter participantes dos grupos vinculados

## Presenca

- `sendPresence(presence)` — Definir status online/offline
- `sendChatPresence(jid, presence, media?)` — Definir indicador de digitacao/gravacao
- `subscribePresence(jid)` — Inscrever-se na presenca de um contato

## Newsletters

- `getSubscribedNewsletters()` — Listar newsletters inscritas
- `newsletterSubscribeLiveUpdates(jid)` — Inscrever-se para atualizacoes em tempo real
- `createNewsletter(name, description, picture?)` — Criar um newsletter/canal
- `getNewsletterInfo(jid)` — Obter metadados do newsletter
- `getNewsletterInfoWithInvite(key)` — Obter informacoes do newsletter a partir do link de convite
- `followNewsletter(jid)` — Seguir um newsletter
- `unfollowNewsletter(jid)` — Deixar de seguir um newsletter
- `getNewsletterMessages(jid, count, before?)` — Buscar mensagens do newsletter
- `getNewsletterMessageUpdates(jid, count, opts?)` — Obter atualizacoes de mensagens
- `newsletterMarkViewed(jid, serverIds)` — Marcar mensagens como visualizadas
- `newsletterSendReaction(jid, serverId, reaction, messageId)` — Reagir a uma mensagem de newsletter
- `newsletterToggleMute(jid, mute)` — Silenciar/ativar som de um newsletter
- `acceptTOSNotice(noticeId, stage)` — Aceitar um aviso de Termos de Servico
- `uploadNewsletter(path, mediaType)` — Fazer upload de midia para mensagens de newsletter

## Privacidade e Configuracoes

- `getPrivacySettings()` — Obter todas as configuracoes de privacidade
- `tryFetchPrivacySettings(ignoreCache?)` — Buscar do cache ou servidor
- `setPrivacySetting(name, value)` — Atualizar uma configuracao de privacidade
- `getStatusPrivacy()` — Obter regras de audiencia padrao do status
- `setDefaultDisappearingTimer(seconds)` — Definir temporizador padrao de mensagens temporarias
- `setDisappearingTimer(jid, seconds)` — Definir para um chat especifico

## Lista de Bloqueio

- `getBlocklist()` — Obter contatos bloqueados
- `updateBlocklist(jid, action)` — Bloquear/desbloquear (`"block"` | `"unblock"`)

## QR e Resolucao de Links

- `getContactQRLink(revoke?)` — Gerar ou revogar seu link QR de contato
- `resolveContactQRLink(code)` — Resolver um QR code de contato para informacoes do usuario
- `resolveBusinessMessageLink(code)` — Resolver um link de mensagem comercial

## Chamadas

- `rejectCall(from, callId)` — Rejeitar uma chamada recebida

## Configuracao

- `setPassive(passive)` — Definir modo passivo (nao receber mensagens)
- `setForceActiveDeliveryReceipts(active)` — Forcar envio de confirmacoes de entrega

## Auxiliares de Mensagem

- `generateMessageID()` — Gerar um ID de mensagem unico
- `buildMessageKey(chat, sender, id)` — Construir uma chave de mensagem protobuf
- `buildUnavailableMessageRequest(chat, sender, id)` — Construir uma requisicao para mensagens indisponiveis
- `buildHistorySyncRequest(info, count)` — Construir uma mensagem de requisicao de sincronizacao de historico
- `sendPeerMessage(message)` — Enviar uma mensagem para seus proprios dispositivos
- `sendMediaRetryReceipt(info, mediaKey)` — Solicitar re-upload de midia ao remetente

## Bots

- `getBotListV2()` — Obter a lista de bots disponiveis
- `getBotProfiles(bots)` — Obter perfis de bots especificos

## Estado do App

- `fetchAppState(name, fullSync?, onlyIfNotSynced?)` — Buscar estado do app no servidor
- `markNotDirty(cleanType, timestamp)` — Marcar um patch de estado do app como nao modificado

## Descriptografia / Criptografia

- `decryptComment(info, message)` — Descriptografar uma mensagem de comentario
- `decryptPollVote(info, message)` — Descriptografar um voto de enquete
- `decryptReaction(info, message)` — Descriptografar uma reacao
- `decryptSecretEncryptedMessage(info, message)` — Descriptografar uma mensagem criptografada secreta
- `encryptComment(info, message)` — Criptografar um comentario
- `encryptPollVote(info, vote)` — Criptografar um voto de enquete
- `encryptReaction(info, reaction)` — Criptografar uma reacao

## Parsing de Mensagens Web

- `parseWebMessage(chatJid, webMsg)` — Fazer parsing de um WebMessageInfo (da sincronizacao de historico) em um evento de mensagem

## Generico

- `call(method, args)` — Enviar qualquer comando para o binario Go (recurso de escape)
