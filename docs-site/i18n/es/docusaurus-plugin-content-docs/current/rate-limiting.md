---
title: Límites de Tasa
sidebar_label: Límites de tasa
sidebar_position: 5
description: "Guía de límites de tasa de WhatsApp para whatsmeow-node — umbrales aproximados, patrones seguros de envío y manejo de baneos temporales."
---

# Límites de Tasa

WhatsApp aplica límites de tasa que pueden resultar en baneos temporales si se exceden. No hay límites publicados oficialmente, pero la comunidad ha observado estos umbrales aproximados:

- **Mensajes**: ~50-80 mensajes por minuto para chats individuales, menos para números nuevos/no verificados
- **Operaciones de grupo**: Crear grupos, agregar participantes y modificar configuraciones tienen límites más estrictos
- **Subida de media**: Límite de tasa más lento que mensajes de texto; archivos grandes cuentan más
- **Verificación de contactos** (`isOnWhatsApp`): ~50 números por solicitud, agrupados automáticamente por whatsmeow
- **Operaciones de newsletters**: Límites más bajos que la mensajería regular

## Patrón de envío seguro

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

## Guía general

- Espacia los mensajes (1-3 segundos entre envíos)
- Evita operaciones masivas con números nuevos/recién emparejados
- Maneja los eventos `temporary_ban` — incluyen un tiempo de expiración
- Monitorea los eventos `stream_error` y `keep_alive_timeout` como señales de alerta temprana
- Usa `sendPresence("available")` antes de enviar para simular el comportamiento normal del cliente
