---
title: Problemas Comunes
sidebar_position: 1
description: "Soluciones para problemas comunes de whatsmeow-node — QR que no aparece, errores de conexión, nombres de campos proto y fallos al enviar mensajes."
keywords: [solución problemas whatsmeow-node, qr whatsapp no aparece, error conexión whatsapp, fallo envío mensaje whatsapp]
---

# Problemas Comunes

## El QR Nunca Aparece

- Llama a `getQRChannel()` **antes** de `connect()`.
- Asegúrate de estar en el flujo de no emparejado (`init()` no retornó un `jid`).
- Verifica que estés escuchando el evento `qr`.

## Los Comandos Fallan con `ERR_NOT_INIT`

Debes llamar a `init()` una vez antes de cualquier operación del cliente. Esto abre el store y crea el cliente whatsmeow.

## El Envío de Mensajes Falla

- Confirma que el evento `connected` se haya disparado antes de enviar.
- Valida el formato del JID: `<teléfono>@s.whatsapp.net` para chats individuales, `<id>@g.us` para grupos.
- Verifica que el número de teléfono incluya el código de país (sin prefijo `+`).

## El Proceso Termina Inesperadamente

- Escucha el evento `log` para la salida del binario de Go — a menudo contiene la causa raíz.
- Verifica que el binario de Go empaquetado exista para tu plataforma.
- Comprueba que la ruta de tu `store` tenga permisos de escritura.

## `ERR_TIMEOUT` en Cada Comando

- El timeout predeterminado es de 30 segundos. Si los servidores de WhatsApp están lentos o la sincronización inicial está en progreso, los comandos pueden tardar más.
- Aumenta `commandTimeout` en las opciones del cliente: `createClient({ store: "session.db", commandTimeout: 60000 })`.

## Evento `logged_out` Después de Reiniciar

- La sesión de WhatsApp fue revocada (el usuario desvinculó el dispositivo desde su teléfono).
- Elimina la base de datos de sesión y vuelve a emparejar.

## Falla la Subida/Descarga de Medios

- Asegúrate de que la ruta del archivo sea absoluta o relativa al directorio de trabajo del binario de Go.
- Verifica los permisos del archivo.
- Para subidas, usa el `mediaType` correcto: `"image"`, `"video"`, `"audio"` o `"document"`.

## Nombres de Campos Proto {#proto-field-naming}

Los campos de mensaje deben usar el casing exacto de protobuf, **no** camelCase:

```typescript
// Correct
const correct = { URL: "...", fileSHA256: "...", fileEncSHA256: "..." };

// Wrong — will silently fail
const wrong = { url: "...", fileSha256: "...", fileEncSha256: "..." };
```

En caso de duda, consulta el [esquema proto de whatsmeow](https://pkg.go.dev/go.mau.fi/whatsmeow/proto/waE2E#Message).
