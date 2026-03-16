---
title: Limites de Taxa
sidebar_position: 5
description: "Orientacoes sobre limites de taxa do WhatsApp para whatsmeow-node — limites aproximados, padroes seguros de envio e como lidar com banimentos temporarios."
---

# Limites de Taxa

O WhatsApp aplica limites de taxa que podem resultar em banimentos temporarios se excedidos. Nao existem limites oficialmente publicados, mas a comunidade observou estes limites aproximados:

- **Mensagens**: ~50-80 mensagens por minuto para chats individuais, menor para numeros novos/nao verificados
- **Operacoes de grupo**: Criar grupos, adicionar participantes e modificar configuracoes tem limites mais restritos
- **Upload de midia**: Limite de taxa mais lento que mensagens de texto; arquivos grandes contam mais
- **Verificacoes de contato** (`isOnWhatsApp`): ~50 numeros por requisicao, agrupados automaticamente pelo whatsmeow
- **Operacoes de newsletter**: Limites menores que mensagens regulares

## Padrao de Envio Seguro

```typescript
async function sendWithBackoff(
  client: WhatsmeowClient,
  messages: Array<{ jid: string; text: string }>
) {
  for (const { jid, text } of messages) {
    try {
      await client.sendMessage(jid, { conversation: text });
    } catch (err) {
      if (err instanceof WhatsmeowError && err.code === "ERR_SEND") {
        await new Promise((r) => setTimeout(r, 5000));
        await client.sendMessage(jid, { conversation: text });
      } else {
        throw err;
      }
    }
    // Space out messages: 1-3 seconds between sends
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000));
  }
}
```

## Orientacoes Gerais

- Espaco entre mensagens (1-3 segundos entre envios)
- Evite operacoes em massa em numeros novos/recem-pareados
- Trate eventos `temporary_ban` — eles incluem um tempo de expiracao
- Monitore eventos `stream_error` e `keep_alive_timeout` como sinais de alerta precoce
- Use `sendPresence("available")` antes de enviar para simular comportamento normal de cliente
