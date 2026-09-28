---
title: "Cómo Desplegar un Bot de WhatsApp en Producción"
sidebar_label: Desplegar en Producción
sidebar_position: 27
description: "Despliega un bot de WhatsApp con whatsmeow-node en producción con Docker, systemd o PM2 — almacén de sesión persistente, vinculación inicial, cierre elegante, health checks y alertas."
keywords: [desplegar bot whatsapp, bot whatsapp docker, bot whatsapp producción nodejs, bot whatsapp systemd pm2, hosting bot whatsapp servidor]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/deploy-to-production.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/es/deploy-to-production.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Cómo Desplegar un Bot de WhatsApp en Producción",
      "description": "Despliega un bot de WhatsApp con whatsmeow-node en producción con Docker, systemd o PM2 — almacén de sesión persistente, vinculación inicial, cierre elegante, health checks y alertas.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/deploy-to-production.png",
      "step": [
        {"@type": "HowToStep", "name": "Elegir un host de larga duración", "text": "Ejecuta el bot en un VPS o una plataforma de contenedores que mantenga un proceso corriendo. Las plataformas serverless como Vercel, Lambda o Cloudflare Workers no pueden mantener la conexión abierta; para solo enviar, llama desde ellas a un servicio emisor siempre activo."},
        {"@type": "HowToStep", "name": "Persistir el almacén de sesión", "text": "Apunta la opción store a un archivo SQLite en un volumen persistente o a una cadena de conexión de PostgreSQL, y haz respaldos."},
        {"@type": "HowToStep", "name": "Escribir un punto de entrada de producción", "text": "Lee el store, el puerto de health check y el teléfono de vinculación desde variables de entorno, y emite logs JSON estructurados, incluidos los eventos log del binario Go."},
        {"@type": "HowToStep", "name": "Manejar eventos fatales", "text": "Alerta y termina el proceso ante logged_out y eventos exit inesperados; alerta ante temporary_ban sin reconectar. Algunas desconexiones permanentes no emiten ningún evento, así que vigila también el health check."},
        {"@type": "HowToStep", "name": "Agregar un health check", "text": "Expón un endpoint HTTP que devuelva 200 solo cuando isConnected() sea true. Úsalo para readiness y monitoreo, no como liveness probe que reinicie el bot."},
        {"@type": "HowToStep", "name": "Cierre elegante", "text": "Ante SIGTERM y SIGINT, marca la presencia como unavailable, llama a disconnect() y luego a close() para detener el proceso Go."},
        {"@type": "HowToStep", "name": "Arrancar y vincular en la primera ejecución", "text": "Llama a init(); si no hay JID guardado y PAIR_PHONE está definido, llama a connect() y pide un pairCode(); si no, termina con un código que el supervisor no reinicie."},
        {"@type": "HowToStep", "name": "Empaquetar con Docker", "text": "Construye sobre node:22-slim o node:22-alpine sin omitir las dependencias opcionales y monta el store en un volumen con nombre."},
        {"@type": "HowToStep", "name": "Vincular dentro del contenedor", "text": "Ejecuta el contenedor una vez con PAIR_PHONE definido e ingresa el código en WhatsApp; después inicia el servicio normalmente."},
        {"@type": "HowToStep", "name": "Ejecutar sin Docker", "text": "Crea un usuario de servicio y el directorio del store, vincula una vez en primer plano con ese usuario y luego ejecuta el bot con una unidad de systemd o un archivo ecosystem de PM2 con una sola instancia y una política de reinicio."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cómo Desplegar un Bot de WhatsApp en Producción",
      "description": "Despliega un bot de WhatsApp con whatsmeow-node en producción con Docker, systemd o PM2 — almacén de sesión persistente, vinculación inicial, cierre elegante, health checks y alertas.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/es/deploy-to-production.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Cómo Desplegar un Bot de WhatsApp en Producción](/img/guides/es/deploy-to-production.png)
![Cómo Desplegar un Bot de WhatsApp en Producción](/img/guides/es/deploy-to-production-light.png)

# Cómo Desplegar un Bot de WhatsApp en Producción

Un bot que funciona en tu laptop necesita algunas cosas más antes de correr sin supervisión: un host que lo mantenga en ejecución, un almacén de sesión que sobreviva a los reinicios, una forma de vincularlo en un servidor sin pantalla, un cierre limpio y alertas para los fallos de los que no puede recuperarse solo. Esta guía cubre todo eso, con Docker, systemd y PM2.

## Requisitos Previos

- Un bot funcionando ([Cómo Crear un Bot de WhatsApp](build-a-bot))
- Un proyecto TypeScript que compile a `dist/` (`npm run build`) con un `package-lock.json`
- Un servidor o plataforma de contenedores donde puedas ejecutar un proceso de larga duración con almacenamiento persistente

## Paso 1: Elegir un Host de Larga Duración

whatsmeow-node lanza un binario Go que mantiene una conexión WebSocket con WhatsApp mientras tu bot esté en línea. Los mensajes entrantes llegan por esa conexión, así que algo tiene que mantenerla abierta todo el tiempo.

Eso descarta las plataformas serverless:

- **Funciones de Vercel, AWS Lambda, Google Cloud Functions** — el proceso se congela o se mata entre peticiones, así que la conexión se cae y pierdes mensajes.
- **Cloudflare Workers y otros runtimes edge** — directamente no pueden lanzar procesos hijos.

Usa cualquier cosa que ejecute un proceso de forma continua: un VPS, un servidor dedicado o una plataforma de contenedores con volúmenes persistentes (Docker en una VM, Fly.io, Railway, background workers de Render, Kubernetes, etc.). Si usas Next.js, un servidor `next start` autoalojado funciona; consulta [Instalación](/docs/installation#usage-with-nextjs) para la configuración del bundler.

### ¿Y si solo envío mensajes?

Serverless no está soportado, ni siquiera si solo *envías* mensajes. Una función serverless de Node.js (Vercel, Lambda) técnicamente puede hacer `init()` → `connect()` → `sendMessage()` → `disconnect()` en cada petición, pero falla de formas difíciles de ver:

- **La sesión tiene que vivir en PostgreSQL.** El sistema de archivos de la función es temporal, así que un store SQLite se pierde y tienes que volver a emparejar.
- **Las invocaciones concurrentes pueden romper la sesión.** Dos peticiones a la vez son dos procesos conectándose como el mismo dispositivo vinculado: WhatsApp desconecta uno y ambos escriben el estado de cifrado en el mismo store. Tendrías que limitar la función a una sola instancia concurrente o agregar un lock.
- **Cada envío paga un handshake de conexión completo**, y los mensajes que llegaron mientras estaba offline se entregan a un proceso que termina de inmediato.
- **Los ciclos constantes de conexión/desconexión** no parecen un dispositivo vinculado normal y pueden aumentar el riesgo de bloqueo.

El patrón confiable es un proceso siempre activo que sea dueño de la conexión con WhatsApp y exponga un pequeño endpoint HTTP o lea de una cola. Tu app serverless llama a ese servicio en lugar de hablar directamente con WhatsApp.

## Paso 2: Persistir el Almacén de Sesión

La opción `store` es donde whatsmeow guarda la identidad del dispositivo y las claves de cifrado creadas durante la vinculación. **Si pierdes el store, tienes que vincular de nuevo.** Trátalo como una base de datos, no como una caché.

| Store | Valor de `store` | Notas |
|-------|------------------|-------|
| SQLite | `/data/session.db` o `file:/data/session.db` | A las rutas simples se les agrega el prefijo `file:` automáticamente. El modo WAL, las foreign keys y un busy timeout se activan por ti. Ponlo en un volumen persistente. |
| PostgreSQL | `postgres://user:pass@host:5432/whatsmeow` | También acepta `postgresql://`. Úsalo si ya tienes Postgres o si tu plataforma no tiene disco persistente. |

Reglas para producción:

- **Pon SQLite en almacenamiento persistente.** La capa escribible de un contenedor se borra cuando el contenedor se recrea. Monta un volumen y apunta el store a él.
- **Nunca incluyas el store en una imagen** ni lo subas a git. Contiene las llaves de la cuenta de WhatsApp.
- **Haz respaldos.** SQLite corre en modo WAL, así que copia `session.db` junto con sus archivos `-wal` y `-shm` con el bot detenido (o usa `sqlite3 session.db ".backup backup.db"`). Para Postgres, usa `pg_dump`. Guarda los respaldos como secretos.
- **Un proceso por store.** Dos procesos usando la misma sesión se van a pelear por la conexión.

## Paso 3: Escribir un Punto de Entrada de Producción

Lee la configuración desde variables de entorno y escribe logs JSON estructurados en stdout, para que Docker, journald y PM2 puedan recolectarlos.

```typescript
import { createServer } from "node:http";
import { createClient } from "@whatsmeow-node/whatsmeow-node";

// ── Config ───────────────────────────────────────────
const STORE = process.env.WA_STORE ?? "session.db";
const HEALTH_PORT = Number(process.env.HEALTH_PORT ?? 3000);
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;
const PAIR_PHONE = process.env.PAIR_PHONE;
const EXIT_NOT_PAIRED = 78; // "configuration error": the supervisor should not restart

// ── Logging & alerts ─────────────────────────────────
function log(level: string, msg: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ time: new Date().toISOString(), level, msg, ...extra }));
}

async function alert(text: string) {
  log("error", text, { alert: true });
  if (!ALERT_WEBHOOK_URL) return;
  try {
    await fetch(ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `[whatsapp-bot] ${text}` }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (err) {
    log("error", "Failed to deliver alert", { error: String(err) });
  }
}

const client = createClient({ store: STORE });
let shuttingDown = false;
```

`alert()` envía `{ "text": "..." }`, el formato que esperan los incoming webhooks de Slack. Cámbialo por lo que use tu equipo.

### Reenviar los logs del binario Go

El proceso Go escribe líneas de log JSON en stderr, y el cliente reemite cada una como un evento `log`. Las líneas que no son JSON — como el stack trace de un panic de Go — llegan con `level: "raw"`. Reenvíalas al mismo flujo de logs:

```typescript
client.on("log", ({ level, msg, ...rest }) => {
  log(level === "raw" ? "error" : level, `[go] ${msg}`, rest);
});

client.on("error", (err) => {
  log("error", "Client error", { error: err.message });
});

client.on("connected", ({ jid }) => log("info", "Connected", { jid }));
client.on("disconnected", () => log("warn", "Disconnected, auto-reconnecting"));
client.on("stream_error", ({ code }) => log("warn", "Stream error", { code }));
client.on("keep_alive_timeout", ({ errorCount }) =>
  log("warn", "Keep-alive timeout", { errorCount }),
);
```

Siempre registra un listener de `error`: como cualquier `EventEmitter`, el cliente lanza una excepción si un evento `error` no tiene listener (por ejemplo, cuando no se puede lanzar el binario).

## Paso 4: Manejar Eventos Fatales y Alertar

`disconnected` es rutinario — whatsmeow reconecta automáticamente. Hay tres eventos que indican que no se va a recuperar solo:

| Evento | Qué pasó | Qué hacer |
|--------|----------|-----------|
| `logged_out` | La sesión fue revocada (dispositivo desvinculado, o WhatsApp la rechazó). Las credenciales guardadas ya no son válidas. | Alertar y terminar. Una persona tiene que volver a vincular (whatsmeow borra el dispositivo del store; si el siguiente arranque todavía registra "Session found" y vuelve a desloguearse, borra el store primero). |
| `temporary_ban` | WhatsApp rechazó la conexión. `expire` es una duración como `"23h59m0s"`. whatsmeow **no** reconecta automáticamente. | Alertar y dejar de enviar. Reiniciar el bot cuando expire el bloqueo. |
| `exit` | El proceso Go terminó. Los comandos pendientes se rechazan con `ProcessExitedError`. | Si no lo causaste tú, termina con un código distinto de cero para que el supervisor te reinicie. |

```typescript
client.on("logged_out", async ({ reason }) => {
  await alert(`Logged out (${reason}). The session is gone, re-pair this device.`);
  client.close();
  process.exit(EXIT_NOT_PAIRED);
});

client.on("temporary_ban", async ({ code, expire }) => {
  await alert(`Temporarily banned (code ${code}), expires in ${expire}. Not reconnecting.`);
});

client.on("exit", async ({ code }) => {
  if (shuttingDown) return;
  await alert(`Go process exited unexpectedly (code ${code}). Restarting.`);
  process.exit(1);
});
```

Algunas desconexiones permanentes ni siquiera se reenvían como eventos: otro proceso que se conecta con la misma sesión (WhatsApp reemplaza esta conexión por la nueva), o WhatsApp rechazando una versión de cliente desactualizada. whatsmeow no reconecta después de ninguna de las dos, y whatsmeow-node no emite nada, ni siquiera `disconnected`. El bot sigue corriendo pero se queda en silencio, e `isConnected()` sigue en `false`. El health check del Paso 5 es la forma de notarlo. Para evitar el primer caso, respeta la regla de un proceso por store del Paso 2, también durante los despliegues.

El bot usa dos códigos de salida a propósito:

- **`1`** — algo transitorio falló. El supervisor debe reiniciarlo.
- **`78`** — el bot no está vinculado (o fue deslogueado). Reiniciar no sirve hasta que alguien lo vincule, así que configura systemd y PM2 para no reiniciar con `78` (se muestra en el Paso 10).

Un bloqueo temporal casi siempre se debe a enviar demasiado y demasiado rápido. Lee [Límites de Tasa](/docs/rate-limiting) antes de reiniciar.

## Paso 5: Agregar un Health Check

`isConnected()` le pregunta al proceso Go si el socket de WhatsApp está activo. Envuélvelo en un pequeño endpoint HTTP que los orquestadores puedan consultar:

```typescript
const health = createServer(async (req, res) => {
  if (req.url !== "/healthz") {
    res.writeHead(404).end();
    return;
  }
  let connected = false;
  try {
    connected = !shuttingDown && (await client.isConnected());
  } catch {
    connected = false; // Go process gone or command timed out
  }
  res
    .writeHead(connected ? 200 : 503, { "content-type": "application/json" })
    .end(JSON.stringify({ connected }));
});
```

Si el proceso Go murió, `isConnected()` se rechaza, así que la comprobación también falla. Las desconexiones cortas durante la reconexión automática también devuelven `503`, así que deja que la comprobación falle varias veces seguidas (por ejemplo, `retries: 3`) antes de actuar.

Úsalo como readiness check y para monitoreo, no como liveness check que reinicie el proceso: durante un `temporary_ban` sigue en `503` hasta que reinicies el bot tú mismo, y los reinicios automáticos volverían a conectarse a la cuenta restringida. Un `503` que dura minutos sin una alerta de `temporary_ban` suele ser una de las desconexiones silenciosas del Paso 4, así que apunta un monitor de disponibilidad a `/healthz` y alerta con eso. El `HEALTHCHECK` de Docker solo marca el contenedor como `unhealthy`; no lo reinicia.

## Paso 6: Cierre Elegante

Docker, systemd y Kubernetes envían `SIGTERM` antes de detener tu proceso. PM2 y Ctrl+C envían `SIGINT`. Maneja ambos: anuncia que te desconectas, cierra la conexión de WhatsApp con `disconnect()` y luego detén el proceso Go con `close()`.

```typescript
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("info", `Received ${signal}, shutting down`);

  // Never hang forever: the supervisor will SIGKILL us anyway
  setTimeout(() => process.exit(1), 10_000).unref();

  health.close();
  try {
    await client.sendPresence("unavailable");
  } catch {
    // not connected, nothing to announce
  }
  try {
    await client.disconnect();
  } catch (err) {
    log("warn", "Disconnect failed", { error: String(err) });
  }
  client.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
```

`disconnect()` es asíncrono y cierra la conexión con WhatsApp. `close()` es síncrono: envía `SIGTERM` al proceso Go, que termina de inmediato sin cerrar la conexión limpiamente, así que siempre haz `await disconnect()` antes de llamarlo. Si Node muere de forma abrupta, el binario Go detecta que su stdin se cerró y se apaga solo, así que no queda como proceso huérfano.

## Paso 7: Arrancar y Vincular en la Primera Ejecución

En un servidor sin pantalla, un código de vinculación es más práctico que un QR. Si el store está vacío y `PAIR_PHONE` está definido, pide un código. Si el store está vacío y `PAIR_PHONE` no está definido, termina con `78`.

```typescript
async function main() {
  const { jid } = await client.init();

  if (!jid) {
    if (!PAIR_PHONE) {
      await alert("Not paired. Start once with PAIR_PHONE=<number> to link this device.");
      client.close();
      process.exit(EXIT_NOT_PAIRED);
    }
    await client.connect();
    const code = await client.pairCode(PAIR_PHONE);
    log("info", "Pairing code issued", { code });
    console.log(`\n  Pairing code: ${code}\n  WhatsApp → Linked Devices → Link with phone number\n`);
  } else {
    log("info", "Session found", { jid });
    await client.connect();
  }

  health.listen(HEALTH_PORT, () => log("info", "Health check listening", { port: HEALTH_PORT }));
}

main().catch(async (err) => {
  await alert(`Startup failed: ${String(err)}`);
  client.close();
  process.exit(1);
});
```

¿Prefieres un código QR? Reemplaza la rama del código de vinculación por el flujo QR y escanea el QR desde los logs. Agrega `qrcode-terminal` a `dependencies` (no a `devDependencies`), porque la imagen de runtime omite las dependencias de desarrollo:

```typescript
import qrcode from "qrcode-terminal";

const { jid } = await client.init();
if (!jid) {
  client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
  await client.getQRChannel();
}
await client.connect();
```

Consulta [Cómo Vincular WhatsApp](pair-whatsapp) para ver ambos flujos en detalle.

## Paso 8: Empaquetar con Docker

whatsmeow-node distribuye su binario Go en paquetes por plataforma (`@whatsmeow-node/linux-x64`, `@whatsmeow-node/linux-arm64`, `@whatsmeow-node/linux-x64-musl`, …) declarados como `optionalDependencies`. npm omite los paquetes cuyo `os` y `cpu` no coinciden con la imagen. npm 11.11 y posteriores también filtran por libc; las versiones anteriores (incluido el npm 10 que trae Node 22) pueden instalar tanto el paquete Linux glibc como el musl, lo cual es inofensivo porque los binarios son estáticos y el cliente usa el que esté presente. **No uses `--omit=optional` ni `--no-optional`**, o el binario no estará.

### Dockerfile (Debian slim)

```dockerfile
# ── Build stage ──────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Runtime stage ────────────────────────────────────
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app

# --omit=dev keeps optionalDependencies, so the platform binary is installed
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

RUN mkdir -p /data && chown node:node /data
USER node

ENV WA_STORE=/data/session.db
ENV HEALTH_PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Exec form, so signals reach Node directly (not via npm or a shell)
CMD ["node", "dist/bot.js"]
```

La imagen slim funciona en hosts `amd64` y `arm64`. El health check usa el `fetch` integrado de Node, así que no necesitas instalar `curl`.

### Variante Alpine

En Alpine, el cliente usa `@whatsmeow-node/linux-x64-musl` (o el paquete glibc si npm también lo instaló; ambos binarios son estáticos). Solo cambian las imágenes base:

```dockerfile
FROM node:22-alpine AS build
# ... same build steps ...

FROM node:22-alpine
# ... same runtime steps ...
```

:::info
El paquete musl es solo x64, así que Alpine `arm64` no es una plataforma soportada. En hosts `arm64`, usa `node:22-slim`. En Apple Silicon, construye las imágenes Alpine con `docker build --platform linux/amd64`.
:::

### .dockerignore

```text
node_modules
dist
*.db
*.db-wal
*.db-shm
.env
```

Esto mantiene un `session.db` local fuera de la imagen.

### docker-compose.yml

```yaml
services:
  bot:
    build: .
    restart: unless-stopped
    init: true                 # tini as PID 1: forwards SIGTERM, reaps zombies
    stop_grace_period: 30s     # time for disconnect() before SIGKILL
    environment:
      WA_STORE: /data/session.db
      ALERT_WEBHOOK_URL: ${ALERT_WEBHOOK_URL:-}
    volumes:
      - wa-data:/data          # the session survives rebuilds and restarts
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  wa-data:
```

¿Usas PostgreSQL? Apunta `WA_STORE` a la base de datos y quita el volumen del bot:

```yaml
services:
  bot:
    build: .
    restart: unless-stopped
    init: true
    stop_grace_period: 30s
    environment:
      WA_STORE: postgres://wabot:${POSTGRES_PASSWORD}@db:5432/whatsmeow
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: wabot
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: whatsmeow
    volumes:
      - pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wabot -d whatsmeow"]
      interval: 5s
      retries: 10

volumes:
  pg-data:
```

## Paso 9: Vincular Dentro del Contenedor

Vincula una sola vez con un contenedor temporal que use el mismo volumen, y después inicia el servicio normalmente:

```bash
docker compose build

# 1. One-off run with PAIR_PHONE set (country code, no +)
docker compose run --rm -e PAIR_PHONE=5512345678 bot
#    → prints "Pairing code: ABCD-EFGH"
#    → WhatsApp → Linked Devices → Link with phone number → enter the code
#    → wait for the "Connected" log line, then press Ctrl+C

# 2. Start the service in the background
docker compose up -d
docker compose logs -f bot
```

La sesión ahora vive en el volumen `wa-data`, así que se conserva entre rebuilds, reinicios y `docker compose down` (sin `-v`). Los códigos de vinculación expiran rápido — si se te pasa, repite el paso 1.

Las políticas de reinicio de Docker no pueden ignorar un código de salida específico. Si el bot termina con `78` (no vinculado o deslogueado), `unless-stopped` lo sigue reiniciando con un retraso creciente, y cada intento registra "Not paired" y vuelve a enviar la alerta. Es la señal de que tienes que repetir la vinculación (o hacer `docker compose stop bot` hasta que puedas). Si registra "Session found" y luego vuelve a desloguearse, borra el store viejo (`docker compose run --rm bot sh -c 'rm -f /data/session.db*'`) antes de vincular.

## Paso 10: Ejecutar Sin Docker (systemd o PM2)

Compila en el servidor en `/opt/wabot` (o copia `dist/` allí y ejecuta `npm ci --omit=dev`). Crea el usuario del servicio y el directorio del store, vincula una vez en primer plano con ese usuario y luego entrega el proceso a un supervisor.

```bash
sudo useradd --system --home /opt/wabot --shell /usr/sbin/nologin wabot
sudo install -d -o wabot -g wabot /var/lib/wabot
cd /opt/wabot
sudo -u wabot env WA_STORE=/var/lib/wabot/session.db PAIR_PHONE=5512345678 node dist/bot.js
# enter the code, wait for "Connected", then Ctrl+C
```

Ejecutarlo como `wabot` hace que ese usuario sea el dueño del archivo del store.

### systemd

```ini
# /etc/systemd/system/wabot.service
[Unit]
Description=WhatsApp bot (whatsmeow-node)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=wabot
WorkingDirectory=/opt/wabot
ExecStart=/usr/bin/node dist/bot.js
Environment=NODE_ENV=production
Environment=WA_STORE=/var/lib/wabot/session.db
EnvironmentFile=-/etc/wabot.env
# Creates /var/lib/wabot owned by User=
StateDirectory=wabot

Restart=on-failure
RestartSec=5
# 78 = not paired / logged out: restarting won't help
RestartPreventExitStatus=78

# SIGTERM goes to Node only; Node stops the Go child itself
KillMode=mixed
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now wabot
journalctl -u wabot -f
```

`KillMode=mixed` es importante: con el valor por defecto (`control-group`), systemd envía `SIGTERM` al binario Go al mismo tiempo que a Node, y este muere antes de que `disconnect()` pueda ejecutarse.

### PM2

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "wabot",
      script: "dist/bot.js",
      exec_mode: "fork",
      instances: 1,          // never cluster: one process per WhatsApp session
      autorestart: true,
      stop_exit_codes: [78], // not paired / logged out: don't restart
      kill_timeout: 15000,   // time for disconnect() before SIGKILL
      treekill: false,       // signal Node only; Node stops the Go child itself
      env: {
        NODE_ENV: "production",
        WA_STORE: "/var/lib/wabot/session.db",
      },
    },
  ],
};
```

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # prints the command that starts PM2 on boot
pm2 logs wabot
```

## Ejemplo Completo

`src/bot.ts` — todo lo anterior en un solo archivo, con un handler `!ping` en lugar de la lógica de tu bot:

```typescript
import { createServer } from "node:http";
import { createClient } from "@whatsmeow-node/whatsmeow-node";

// ── Config ───────────────────────────────────────────
const STORE = process.env.WA_STORE ?? "session.db";
const HEALTH_PORT = Number(process.env.HEALTH_PORT ?? 3000);
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;
const PAIR_PHONE = process.env.PAIR_PHONE;
const EXIT_NOT_PAIRED = 78; // "configuration error": the supervisor should not restart

// ── Logging & alerts ─────────────────────────────────
function log(level: string, msg: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ time: new Date().toISOString(), level, msg, ...extra }));
}

async function alert(text: string) {
  log("error", text, { alert: true });
  if (!ALERT_WEBHOOK_URL) return;
  try {
    await fetch(ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `[whatsapp-bot] ${text}` }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (err) {
    log("error", "Failed to deliver alert", { error: String(err) });
  }
}

// ── Client ───────────────────────────────────────────
const client = createClient({ store: STORE });
let shuttingDown = false;

client.on("log", ({ level, msg, ...rest }) => {
  log(level === "raw" ? "error" : level, `[go] ${msg}`, rest);
});

client.on("error", (err) => {
  log("error", "Client error", { error: err.message });
});

client.on("connected", ({ jid }) => log("info", "Connected", { jid }));
client.on("disconnected", () => log("warn", "Disconnected, auto-reconnecting"));
client.on("stream_error", ({ code }) => log("warn", "Stream error", { code }));
client.on("keep_alive_timeout", ({ errorCount }) =>
  log("warn", "Keep-alive timeout", { errorCount }),
);

client.on("logged_out", async ({ reason }) => {
  await alert(`Logged out (${reason}). The session is gone, re-pair this device.`);
  client.close();
  process.exit(EXIT_NOT_PAIRED);
});

client.on("temporary_ban", async ({ code, expire }) => {
  await alert(`Temporarily banned (code ${code}), expires in ${expire}. Not reconnecting.`);
});

client.on("exit", async ({ code }) => {
  if (shuttingDown) return;
  await alert(`Go process exited unexpectedly (code ${code}). Restarting.`);
  process.exit(1);
});

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;
  const text =
    (message.conversation as string | undefined) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (text?.trim().toLowerCase() === "!ping") {
    await client.sendMessage(info.chat, { conversation: "pong" });
  }
});

// ── Health check ─────────────────────────────────────
const health = createServer(async (req, res) => {
  if (req.url !== "/healthz") {
    res.writeHead(404).end();
    return;
  }
  let connected = false;
  try {
    connected = !shuttingDown && (await client.isConnected());
  } catch {
    connected = false; // Go process gone or command timed out
  }
  res
    .writeHead(connected ? 200 : 503, { "content-type": "application/json" })
    .end(JSON.stringify({ connected }));
});

// ── Graceful shutdown ────────────────────────────────
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("info", `Received ${signal}, shutting down`);

  // Never hang forever: the supervisor will SIGKILL us anyway
  setTimeout(() => process.exit(1), 10_000).unref();

  health.close();
  try {
    await client.sendPresence("unavailable");
  } catch {
    // not connected, nothing to announce
  }
  try {
    await client.disconnect();
  } catch (err) {
    log("warn", "Disconnect failed", { error: String(err) });
  }
  client.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// ── Startup ──────────────────────────────────────────
async function main() {
  const { jid } = await client.init();

  if (!jid) {
    if (!PAIR_PHONE) {
      await alert("Not paired. Start once with PAIR_PHONE=<number> to link this device.");
      client.close();
      process.exit(EXIT_NOT_PAIRED);
    }
    await client.connect();
    const code = await client.pairCode(PAIR_PHONE);
    log("info", "Pairing code issued", { code });
    console.log(`\n  Pairing code: ${code}\n  WhatsApp → Linked Devices → Link with phone number\n`);
  } else {
    log("info", "Session found", { jid });
    await client.connect();
  }

  health.listen(HEALTH_PORT, () => log("info", "Health check listening", { port: HEALTH_PORT }));
}

main().catch(async (err) => {
  await alert(`Startup failed: ${String(err)}`);
  client.close();
  process.exit(1);
});
```

## Ejecutar Varias Cuentas

Cada store contiene una sola cuenta de WhatsApp: en `init()`, el binario Go abre el primer dispositivo del store. Para ejecutar varias cuentas, ejecuta **un proceso por cuenta**, cada uno con su propio store — un archivo SQLite distinto o una base de datos Postgres distinta. Con Docker eso significa un servicio por cuenta, cada uno con su propio volumen. Con systemd, una unidad plantilla (`wabot@.service` con `Environment=WA_STORE=/var/lib/wabot/%i.db`) te da `wabot@ventas`, `wabot@soporte`, etc. Tener procesos por cuenta también evita que la caída o el bloqueo de una cuenta afecte a las demás.

## Errores Comunes

:::warning "Could not find whatsmeow-node binary"
El paquete de plataforma no se instaló. Quita `--omit=optional` / `--no-optional` de tu comando de instalación y asegúrate de no copiar a la imagen una carpeta `node_modules` de otro sistema operativo (agrégala a `.dockerignore`). Si `npm ci` sigue omitiéndolo, regenera `package-lock.json` con una versión actual de npm. Como último recurso, apunta `binaryPath` en `createClient()` al binario.
:::

:::warning Perder la sesión al redesplegar
Si el bot pide vincular de nuevo después de cada despliegue, el store no está en almacenamiento persistente. Verifica que el volumen esté montado en la ruta de `WA_STORE` y nunca ejecutes `docker compose down -v` en un stack de producción.
:::

:::warning Ejecutar dos instancias
No escales el bot horizontalmente, no uses el modo cluster de PM2 ni hagas despliegues blue/green que solapen dos procesos sobre la misma sesión. Ejecuta exactamente un proceso por store; detén el anterior antes de iniciar el nuevo.
:::

:::warning Señales que no llegan a Node
`CMD npm start` o la forma shell de `CMD` pueden tragarse `SIGTERM`, así que el contenedor se mata sin un `disconnect()` limpio. Usa la forma exec (`CMD ["node", "dist/bot.js"]`) e `init: true`.
:::

:::warning Bucles de reinicio tras un bloqueo
Reiniciar en bucle después de un `temporary_ban` significa conectarse una y otra vez a una cuenta que WhatsApp acaba de restringir. Alerta, espera a que pase `expire` y corrige primero la causa (normalmente la velocidad de envío). Consulta [Límites de Tasa](/docs/rate-limiting).
:::

<RelatedGuides slugs={["build-a-bot", "pair-whatsapp", "send-notifications", "whatsmeow-in-node"]} />
