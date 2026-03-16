---
title: Problemas Comuns
sidebar_position: 1
description: "Solucoes para problemas comuns do whatsmeow-node — QR nao aparece, erros de conexao, nomenclatura de campos proto e falhas no envio de mensagens."
---

# Problemas Comuns

## QR Nunca Aparece

- Chame `getQRChannel()` **antes** de `connect()`.
- Certifique-se de que voce esta no fluxo de nao pareado (`init()` retornou sem `jid`).
- Verifique se voce esta ouvindo o evento `qr`.

## Comandos Falham com `ERR_NOT_INIT`

Voce precisa chamar `init()` uma vez antes de qualquer operacao do client. Isso abre o store e cria o client whatsmeow.

## Falha no Envio de Mensagem

- Confirme que o evento `connected` foi emitido antes de enviar.
- Valide o formato do JID: `<telefone>@s.whatsapp.net` para chats individuais, `<id>@g.us` para grupos.
- Verifique se o numero de telefone inclui o codigo do pais (sem prefixo `+`).

## Processo Encerra Inesperadamente

- Ouca o evento `log` para ver a saida do binario Go — geralmente contem a causa raiz.
- Verifique se o binario Go empacotado existe para sua plataforma.
- Confirme que o caminho do `store` tem permissao de escrita.

## `ERR_TIMEOUT` em Todos os Comandos

- O timeout padrao e 30 segundos. Se os servidores do WhatsApp estiverem lentos ou a sincronizacao inicial estiver rodando, os comandos podem demorar mais.
- Aumente o `commandTimeout` nas opcoes do client: `createClient({ store: "session.db", commandTimeout: 60000 })`.

## Evento `logged_out` Apos Reinicio

- A sessao do WhatsApp foi revogada (o usuario desvinculou o dispositivo do telefone).
- Exclua o banco de dados da sessao e pareie novamente.

## Falha no Upload/Download de Midia

- Certifique-se de que o caminho do arquivo e absoluto ou relativo ao diretorio de trabalho do binario Go.
- Verifique as permissoes do arquivo.
- Para uploads, use o `mediaType` correto: `"image"`, `"video"`, `"audio"` ou `"document"`.

## Nomenclatura de Campos Proto {#proto-field-naming}

Os campos de mensagem devem usar a capitalizacao exata do protobuf, **nao** camelCase:

```typescript
// Correct
const correct = { URL: "...", fileSHA256: "...", fileEncSHA256: "..." };

// Wrong — will silently fail
const wrong = { url: "...", fileSha256: "...", fileEncSha256: "..." };
```

Em caso de duvida, consulte o [schema proto do whatsmeow](https://pkg.go.dev/go.mau.fi/whatsmeow/proto/waE2E#Message).
