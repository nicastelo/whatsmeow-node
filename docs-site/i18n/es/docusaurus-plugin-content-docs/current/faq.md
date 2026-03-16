---
title: Preguntas Frecuentes
sidebar_label: Preguntas Frecuentes
sidebar_position: 6
description: "Preguntas frecuentes sobre whatsmeow-node — requisitos, tipos de cuenta WhatsApp, despliegue, multi-dispositivo, serverless y más."
keywords: [preguntas frecuentes whatsmeow-node, preguntas bot whatsapp, faq whatsapp nodejs, requisitos whatsmeow-node, crear bot whatsapp]
---

# Preguntas Frecuentes

## General

### ¿Qué es whatsmeow-node?

whatsmeow-node es un cliente TypeScript/Node.js para WhatsApp Web. Envuelve a [whatsmeow](https://github.com/tulir/whatsmeow), una librería de Go que implementa el protocolo multi-dispositivo de WhatsApp Web. Obtienes la confiabilidad de whatsmeow con la experiencia de desarrollo de TypeScript — 100 métodos async tipados, eventos tipados y errores tipados.

### ¿Cómo funciona internamente?

Un binario de Go precompilado se ejecuta como subproceso. Tu código TypeScript se comunica con él por stdin/stdout usando JSON-line IPC. La clase `WhatsmeowClient` gestiona el ciclo de vida del proceso, la serialización y la reconexión. Desde la perspectiva de tu código, son solo llamadas a métodos async.

### ¿Es esta la API oficial de WhatsApp?

No. whatsmeow-node es un cliente no oficial que se conecta como dispositivo vinculado (igual que WhatsApp Web). La única API oficial es la [API Cloud de WhatsApp Business](https://developers.facebook.com/docs/whatsapp/cloud-api) de Meta, que requiere verificación de negocio y tiene precios por conversación.

### ¿Pueden banear mi cuenta?

Sí. Usar clientes no oficiales viola los Términos de Servicio de WhatsApp, y tu cuenta puede ser baneada. Este riesgo aplica a todas las librerías no oficiales (Baileys, whatsapp-web.js, etc.), no solo a whatsmeow-node. Evita mensajes masivos, spam o comportamiento sospechoso para minimizar el riesgo.

### ¿whatsmeow-node es gratis?

Sí. whatsmeow-node tiene licencia MIT y es gratis para usar. La librería upstream whatsmeow tiene licencia MPL-2.0.

## Requisitos

### ¿Qué versión de Node.js necesito?

Node.js 18 o superior.

### ¿Necesito tener Go instalado?

No. Los binarios de Go precompilados se incluyen para todas las plataformas soportadas (macOS, Linux, Windows — x64 y arm64). El binario correcto se instala automáticamente vía `optionalDependencies` de npm.

### ¿Qué plataformas son soportadas?

macOS (x64, arm64), Linux (x64, arm64, x64-musl para Alpine) y Windows (x64, arm64).

### ¿Funciona en Alpine Linux / Docker?

Sí. El paquete `linux-x64-musl` proporciona un binario compilado estáticamente para sistemas basados en musl como Alpine.

## Cuenta de WhatsApp

### ¿Necesito una cuenta de WhatsApp Business?

No. whatsmeow-node funciona con cualquier cuenta regular de WhatsApp. Se conecta como dispositivo vinculado, de la misma forma que WhatsApp Web o Desktop.

### ¿Puedo usar múltiples cuentas de WhatsApp?

Sí. Crea una instancia de cliente separada para cada cuenta, cada una con su propia ruta de store:

```typescript
const client1 = createClient({ store: "account1.db" });
const client2 = createClient({ store: "account2.db" });
```

Cada cliente genera su propio proceso de Go.

### ¿El teléfono necesita estar en línea?

No. El protocolo multi-dispositivo de WhatsApp permite que los dispositivos vinculados operen de forma independiente. Tu teléfono puede estar sin conexión, apagado o desconectado — la sesión del dispositivo vinculado se mantiene activa.

### ¿Cuántos dispositivos vinculados puedo tener?

WhatsApp permite hasta 4 dispositivos vinculados por cuenta (además del teléfono principal). whatsmeow-node usa uno de estos slots.

### ¿Qué pasa si desvinculo el dispositivo desde mi teléfono?

Se dispara el evento `logged_out` con la razón. La sesión se revoca permanentemente — necesitarás eliminar la base de datos de sesión y emparejar de nuevo.

## Capacidades

### ¿Qué puede hacer whatsmeow-node?

100 de 126 métodos upstream de whatsmeow están envueltos. Las capacidades principales incluyen:

- Enviar y recibir texto, imágenes, video, audio, documentos, stickers, contactos y ubicaciones
- Crear, gestionar e interactuar con grupos y comunidades
- Enviar encuestas, reacciones y ediciones de mensajes
- Gestionar newsletters (canales)
- Manejar presencia (en línea/fuera de línea, indicadores de escritura)
- Descargar y subir media
- Gestionar configuraciones de privacidad y lista de bloqueo
- Recibir y procesar datos de sincronización de historial
- Manejar llamadas (recibir ofertas, rechazar llamadas)
- Gestionar mensajes temporales

### ¿Puede enviar mensajes a grupos?

Sí. Usa el JID del grupo (formato: `<id>@g.us`) con cualquier método de envío. También puedes crear grupos, gestionar participantes, cambiar configuraciones y más.

### ¿Puede recibir imágenes y videos?

Sí. Escucha el evento `"message"` y verifica los campos `imageMessage`, `videoMessage`, `audioMessage`, `documentMessage` o `stickerMessage`. Descarga con `downloadAny(message)`.

### ¿Puede hacer o recibir llamadas?

Puede recibir ofertas de llamada (evento `call:offer`) y rechazarlas (`rejectCall`). No puede iniciar ni aceptar llamadas de voz/video.

### ¿Soporta botones o listas en mensajes?

WhatsApp ha restringido los mensajes interactivos (botones, listas, catálogos de productos) a la API oficial de Business. Enviarlos a través de clientes no oficiales puede no funcionar o puede resultar en restricciones de cuenta.

### ¿Puede leer el historial de mensajes?

whatsmeow-node recibe datos de sincronización de historial cuando un dispositivo se empareja por primera vez. Escucha los eventos `history_sync` para capturar mensajes pasados. No puedes solicitar historial bajo demanda — WhatsApp lo envía durante la sincronización inicial.

## Despliegue

### ¿Puedo ejecutarlo en un servidor (headless)?

Sí. whatsmeow-node está diseñado para entornos headless. Usa emparejamiento por número de teléfono (`pairCode()`) si no puedes mostrar códigos QR, o renderiza códigos QR por otros medios (interfaz web, endpoint de API, etc.).

### ¿Funciona con serverless (AWS Lambda, Vercel)?

Depende del caso de uso. Para tareas de tipo fire-and-forget como enviar un OTP o una notificación única, serverless funciona — init, connect, send, disconnect en una sola invocación. Para bots de larga ejecución que escuchan mensajes entrantes, serverless no es buena opción porque whatsmeow-node mantiene una conexión WebSocket persistente y genera un subproceso de Go. Para bots siempre activos, un servidor persistente (VPS, contenedor, EC2) tiende a funcionar mejor. Si vas por la ruta serverless para envíos únicos, considera usar un store PostgreSQL para que la sesión persista entre invocaciones.

### ¿Funciona con Docker?

Sí. Usa una imagen base de Node.js (no Alpine a menos que específicamente necesites musl). El binario de Go está incluido en el paquete npm — no se necesita configuración adicional. Ejemplo:

```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "bot.js"]
```

### ¿Funciona con Next.js?

Sí, pero debes agregar todos los paquetes `@whatsmeow-node` a `serverExternalPackages` en tu configuración de Next.js para evitar que el bundler intente interpretar el binario de Go. Consulta la [guía de Instalación](/docs/installation#usage-with-nextjs).

### ¿Qué base de datos debería usar en producción?

PostgreSQL. Soporta acceso concurrente y es adecuada para despliegues multi-instancia. SQLite está bien para desarrollo y producción de una sola instancia.

### ¿Cuánta memoria usa?

El binario de Go usa ~10-20 MB de RAM. La memoria total del proceso (Node.js + Go) es típicamente 50-80 MB, comparado con 200-500 MB de soluciones basadas en navegador.

## Comparación

### ¿En qué se diferencia de Baileys?

Baileys implementa el protocolo de WhatsApp en JavaScript puro. whatsmeow-node envuelve una implementación en Go (whatsmeow) que potencia el bridge Mautrix WhatsApp, usado por miles de usuarios de Matrix. El principal compromiso: whatsmeow-node genera un proceso externo pero hereda la confiabilidad y mantenimiento de whatsmeow.

### ¿En qué se diferencia de whatsapp-web.js?

whatsapp-web.js automatiza un navegador Chrome headless, requiriendo 200-500 MB de RAM y rompiéndose cuando WhatsApp actualiza su cliente web. whatsmeow-node implementa el protocolo directamente con ~10-20 MB de RAM y sin dependencia de navegador.

### ¿Debería usar esto o la API oficial de WhatsApp Business?

La API oficial es la única opción segura si necesitas uptime garantizado, cumplimiento normativo y sin riesgo de baneo de cuenta. whatsmeow-node es mejor para proyectos personales, prototipado, herramientas internas, o casos donde el costo o proceso de aprobación de la API oficial es prohibitivo.

## Solución de problemas

### ¿Por qué no se muestra mi código QR?

Llama a `getQRChannel()` **antes** de `connect()`, y solo cuando `init()` no devuelve JID (lo que significa que el dispositivo aún no está emparejado). Asegúrate de estar escuchando el evento `"qr"`.

### ¿Por qué mis mensajes fallan silenciosamente?

La causa más común es el casing incorrecto de campos. Los campos proto usan el casing exacto de protobuf: `URL`, `fileSHA256`, `fileEncSHA256` — no `url`, `fileSha256`, `fileEncSha256`. Consulta [Solución de problemas](/docs/troubleshooting/common-issues#proto-field-naming).

### ¿Por qué obtengo `ERR_TIMEOUT`?

El timeout de comandos por defecto es de 30 segundos. Durante la sincronización inicial o bajo carga pesada, las operaciones pueden tomar más tiempo. Auméntalo con `createClient({ store: "session.db", commandTimeout: 60000 })`.

### ¿Cómo depuro problemas?

Escucha el evento `"log"` para ver la salida del binario de Go:

```typescript
client.on("log", (log) => {
  console.log(`[${log.level}] ${log.msg}`);
});
```

Esto frecuentemente revela la causa raíz de problemas de conexión o protocolo.
