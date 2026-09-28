---
title: "How to Deploy a WhatsApp Bot to Production"
sidebar_label: Deploy to Production
sidebar_position: 27
description: "Deploy a whatsmeow-node WhatsApp bot to production with Docker, systemd, or PM2 — persistent session store, first-time pairing, graceful shutdown, health checks, and alerts."
keywords: [deploy whatsapp bot, whatsapp bot docker, whatsapp bot production nodejs, whatsapp bot systemd pm2, host whatsapp bot server]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/deploy-to-production.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/deploy-to-production.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Deploy a WhatsApp Bot to Production",
      "description": "Deploy a whatsmeow-node WhatsApp bot to production with Docker, systemd, or PM2 — persistent session store, first-time pairing, graceful shutdown, health checks, and alerts.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/deploy-to-production.png",
      "step": [
        {"@type": "HowToStep", "name": "Pick a Long-Lived Host", "text": "Run the bot on a VPS or container platform that keeps one process running. Serverless platforms such as Vercel, Lambda, or Cloudflare Workers can't keep the connection open; for send-only use, call an always-on sender service from them instead."},
        {"@type": "HowToStep", "name": "Persist the Session Store", "text": "Point the store option at a SQLite file on a persistent volume or at a PostgreSQL connection string, and back it up."},
        {"@type": "HowToStep", "name": "Write a Production Entrypoint", "text": "Read the store, health port, and pairing phone from environment variables and emit structured JSON logs, including the Go binary's log events."},
        {"@type": "HowToStep", "name": "Handle Fatal Events", "text": "Alert and exit on logged_out and unexpected exit events, and alert on temporary_ban without reconnecting. Some permanent disconnects emit no event, so also watch the health check."},
        {"@type": "HowToStep", "name": "Add a Health Check", "text": "Expose an HTTP endpoint that returns 200 only when isConnected() is true. Use it for readiness and monitoring, not as a liveness probe that restarts the bot."},
        {"@type": "HowToStep", "name": "Shut Down Gracefully", "text": "On SIGTERM and SIGINT, set presence unavailable, call disconnect(), then close() the Go process."},
        {"@type": "HowToStep", "name": "Start Up and Pair on First Run", "text": "Call init(); if no JID is stored and PAIR_PHONE is set, connect() and request a pairCode(), otherwise exit with a code the supervisor won't restart."},
        {"@type": "HowToStep", "name": "Package with Docker", "text": "Build on node:22-slim or node:22-alpine without omitting optional dependencies, and mount the store on a named volume."},
        {"@type": "HowToStep", "name": "Pair Inside the Container", "text": "Run the container once with PAIR_PHONE set and enter the pairing code in WhatsApp, then start the service normally."},
        {"@type": "HowToStep", "name": "Run Without Docker", "text": "Create a service user and the store directory, pair once in the foreground as that user, then run the bot with a systemd unit or a PM2 ecosystem file with a single instance and a restart policy."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Deploy a WhatsApp Bot to Production",
      "description": "Deploy a whatsmeow-node WhatsApp bot to production with Docker, systemd, or PM2 — persistent session store, first-time pairing, graceful shutdown, health checks, and alerts.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/deploy-to-production.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![How to Deploy a WhatsApp Bot to Production](/img/guides/deploy-to-production.png)
![How to Deploy a WhatsApp Bot to Production](/img/guides/deploy-to-production-light.png)

# How to Deploy a WhatsApp Bot to Production

A bot that works on your laptop needs a few more things before it can run unattended: a host that keeps it running, a session store that survives restarts, a way to pair it on a headless server, a clean shutdown, and alerts for the failures it can't recover from on its own. This guide covers all of them, with Docker, systemd, and PM2.

## Prerequisites

- A working bot ([How to Build a WhatsApp Bot](build-a-bot))
- A TypeScript project that compiles to `dist/` (`npm run build`) with a `package-lock.json`
- A server or container platform where you can run a long-lived process with persistent storage

## Step 1: Pick a Long-Lived Host

whatsmeow-node spawns a Go binary that holds a WebSocket connection to WhatsApp for as long as your bot is online. Incoming messages arrive over that connection, so something has to keep it open all the time.

That rules out serverless platforms:

- **Vercel functions, AWS Lambda, Google Cloud Functions** — the process is frozen or killed between requests, so the connection drops and you miss messages.
- **Cloudflare Workers and other edge runtimes** — they can't spawn a child process at all.

Use anything that runs one process continuously: a VPS, a dedicated server, or a container platform with persistent volumes (Docker on a VM, Fly.io, Railway, Render background workers, Kubernetes, etc.). If you use Next.js, a self-hosted `next start` server works; see [Installation](/docs/installation#usage-with-nextjs) for the bundler config.

### What about send-only?

Serverless isn't supported, even if you only *send* messages. A Node.js serverless function (Vercel, Lambda) can technically do `init()` → `connect()` → `sendMessage()` → `disconnect()` per request, but it breaks in ways that are hard to see:

- **The session must live in PostgreSQL.** The function's filesystem is temporary, so a SQLite store is lost and you have to pair again.
- **Concurrent invocations can break the session.** Two requests at once means two processes connecting as the same linked device: WhatsApp disconnects one, and both write encryption state to the same store. You'd have to limit the function to a single concurrent instance or add a lock.
- **Every send pays for a full connection handshake**, and messages that arrived while offline are delivered to a process that immediately exits.
- **Constant connect/disconnect cycles** don't look like a normal linked device and may increase ban risk.

The reliable pattern is one always-on process that owns the WhatsApp connection and exposes a small HTTP endpoint or reads from a queue. Your serverless app calls that service instead of talking to WhatsApp directly.

## Step 2: Persist the Session Store

The `store` option is where whatsmeow keeps the device identity and encryption keys created during pairing. **If you lose the store, you must pair again.** Treat it like a database, not a cache.

| Store | `store` value | Notes |
|-------|---------------|-------|
| SQLite | `/data/session.db` or `file:/data/session.db` | Plain paths are prefixed with `file:` automatically. WAL mode, foreign keys, and a busy timeout are enabled for you. Put it on a persistent volume. |
| PostgreSQL | `postgres://user:pass@host:5432/whatsmeow` | Also accepts `postgresql://`. Use it when you already run Postgres or your platform has no persistent disk. |

Rules for production:

- **Put SQLite on persistent storage.** A container's writable layer is wiped when the container is recreated. Mount a volume and point the store at it.
- **Never bake the store into an image** or commit it to git. It contains the keys to the WhatsApp account.
- **Back it up.** SQLite runs in WAL mode, so copy `session.db` together with its `-wal` and `-shm` files while the bot is stopped (or use `sqlite3 session.db ".backup backup.db"`). For Postgres, use `pg_dump`. Store backups as secrets.
- **One process per store.** Two processes using the same session will fight over the connection.

## Step 3: Write a Production Entrypoint

Read configuration from environment variables and log structured JSON to stdout, so Docker, journald, and PM2 can collect it.

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

`alert()` posts `{ "text": "..." }`, the format Slack incoming webhooks expect. Swap in whatever your team uses.

### Forward the Go binary's logs

The Go process writes JSON log lines to stderr, and the client re-emits each one as a `log` event. Lines that aren't JSON — such as a Go panic stack trace — arrive with `level: "raw"`. Forward them into the same log stream:

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

Always attach an `error` listener: like any `EventEmitter`, the client throws if an `error` event has no listener (for example, when the binary can't be spawned).

## Step 4: Handle Fatal Events and Alert

`disconnected` is routine — whatsmeow reconnects automatically. Three events tell you it won't recover on its own:

| Event | What happened | What to do |
|-------|---------------|------------|
| `logged_out` | The session was revoked (device unlinked, or WhatsApp rejected it). The stored credentials are no longer valid. | Alert, then exit. A human must re-pair (whatsmeow clears the device from the store; if the next start still logs "Session found" and is logged out again, delete the store first). |
| `temporary_ban` | WhatsApp refused the connection. `expire` is a duration string such as `"23h59m0s"`. whatsmeow does **not** auto-reconnect. | Alert and stop sending. Restart the bot after the ban expires. |
| `exit` | The Go process exited. Pending commands reject with `ProcessExitedError`. | If you didn't cause it, exit non-zero so the supervisor restarts you. |

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

Some permanent disconnects aren't forwarded as events at all: another process connecting with the same session (WhatsApp replaces this connection with the new one), or WhatsApp rejecting an outdated client version. whatsmeow doesn't reconnect after either, and whatsmeow-node emits nothing, not even `disconnected`. The bot keeps running but goes silent, and `isConnected()` stays `false`. The health check in Step 5 is how you notice. To avoid the first case, follow the one-process-per-store rule from Step 2, including during deploys.

The bot uses two exit codes on purpose:

- **`1`** — something transient went wrong. The supervisor should restart it.
- **`78`** — the bot isn't paired (or was logged out). Restarting won't help until someone pairs it, so configure systemd and PM2 not to restart on `78` (shown in Step 10).

A temporary ban is usually caused by sending too much, too fast. Read [Rate Limiting](/docs/rate-limiting) before you restart.

## Step 5: Add a Health Check

`isConnected()` asks the Go process whether the WhatsApp socket is up. Wrap it in a tiny HTTP endpoint that orchestrators can probe:

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

If the Go process has died, `isConnected()` rejects, so the probe fails too. Short disconnects during auto-reconnect also return `503`, so let the probe fail a few times in a row (for example, `retries: 3`) before you act on it.

Use it as a readiness check and for monitoring, not as a liveness check that restarts the process: during a `temporary_ban` it stays `503` until you restart the bot yourself, and automatic restarts would reconnect to the restricted account. A `503` that lasts for minutes with no `temporary_ban` alert usually means one of the silent disconnects from Step 4, so point an uptime monitor at `/healthz` and alert on it. Docker's `HEALTHCHECK` only marks the container `unhealthy`; it doesn't restart it.

## Step 6: Shut Down Gracefully

Docker, systemd, and Kubernetes send `SIGTERM` before stopping your process. PM2 and Ctrl+C send `SIGINT`. Handle both: announce that you're going offline, close the WhatsApp connection with `disconnect()`, then stop the Go process with `close()`.

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

`disconnect()` is async and closes the WhatsApp connection. `close()` is synchronous: it sends `SIGTERM` to the Go process, which exits right away without closing the connection cleanly, so always `await disconnect()` before calling it. If Node itself is killed hard, the Go binary sees its stdin close and shuts down on its own, so it isn't left behind as an orphan.

## Step 7: Start Up and Pair on First Run

On a headless server, a pairing code is easier than a QR code. If the store is empty and `PAIR_PHONE` is set, request a code. If the store is empty and `PAIR_PHONE` isn't set, exit with `78`.

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

Prefer a QR code? Replace the pairing-code branch with the QR flow and scan the QR from the logs. Add `qrcode-terminal` to `dependencies` (not `devDependencies`), because the runtime image skips dev dependencies:

```typescript
import qrcode from "qrcode-terminal";

const { jid } = await client.init();
if (!jid) {
  client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
  await client.getQRChannel();
}
await client.connect();
```

See [How to Pair WhatsApp](pair-whatsapp) for both flows in detail.

## Step 8: Package with Docker

whatsmeow-node ships its Go binary in platform packages (`@whatsmeow-node/linux-x64`, `@whatsmeow-node/linux-arm64`, `@whatsmeow-node/linux-x64-musl`, …) listed as `optionalDependencies`. npm skips packages whose `os` and `cpu` don't match the image. npm 11.11 and newer also filter by libc; older npm (including the npm 10 bundled with Node 22) may install both the glibc and musl Linux packages, which is harmless because the binaries are static and the client uses whichever is present. **Don't pass `--omit=optional` or `--no-optional`**, or the binary won't be there.

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

The slim image works on both `amd64` and `arm64` hosts. The health check uses Node's built-in `fetch`, so you don't need to install `curl`.

### Alpine variant

On Alpine, the client uses `@whatsmeow-node/linux-x64-musl` (or the glibc package if npm installed that too; both binaries are static). Only the base images change:

```dockerfile
FROM node:22-alpine AS build
# ... same build steps ...

FROM node:22-alpine
# ... same runtime steps ...
```

:::info
The musl package is x64 only, so `arm64` Alpine is not a supported target. On `arm64` hosts, use `node:22-slim`. On Apple Silicon, build Alpine images with `docker build --platform linux/amd64`.
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

This keeps a local `session.db` out of the image.

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

Using PostgreSQL instead? Point `WA_STORE` at it and drop the volume from the bot:

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

## Step 9: Pair Inside the Container

Pair once with a one-off container that uses the same volume, then start the service normally:

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

The session is now on the `wa-data` volume, so rebuilds, restarts, and `docker compose down` (without `-v`) keep it. Pairing codes expire quickly — if you miss it, run step 1 again.

Docker's restart policies can't skip a specific exit code. If the bot exits with `78` (not paired, or logged out), `unless-stopped` keeps restarting it with a growing back-off delay, and every attempt logs "Not paired" and sends the alert again. That's your cue to run the pairing step (or `docker compose stop bot` until you can). If it logs "Session found" and then logs out again, remove the stale store (`docker compose run --rm bot sh -c 'rm -f /data/session.db*'`) before pairing.

## Step 10: Run Without Docker (systemd or PM2)

Build on the server in `/opt/wabot` (or copy `dist/` there and run `npm ci --omit=dev`). Create the service user and the store directory, pair once in the foreground as that user, then hand the process to a supervisor.

```bash
sudo useradd --system --home /opt/wabot --shell /usr/sbin/nologin wabot
sudo install -d -o wabot -g wabot /var/lib/wabot
cd /opt/wabot
sudo -u wabot env WA_STORE=/var/lib/wabot/session.db PAIR_PHONE=5512345678 node dist/bot.js
# enter the code, wait for "Connected", then Ctrl+C
```

Running it as `wabot` makes that user the owner of the store file.

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

`KillMode=mixed` matters: with the default (`control-group`), systemd sends `SIGTERM` to the Go binary at the same moment as Node, and it dies before `disconnect()` can run.

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

## Complete Example

`src/bot.ts` — everything above in one file, with a `!ping` handler standing in for your bot logic:

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

## Running Multiple Accounts

Each store holds one WhatsApp account: on `init()`, the Go binary opens the first device in the store. To run several accounts, run **one process per account**, each with its own store — a separate SQLite file or a separate Postgres database. With Docker that means one service per account, each with its own volume. With systemd, a template unit (`wabot@.service` with `Environment=WA_STORE=/var/lib/wabot/%i.db`) gives you `wabot@sales`, `wabot@support`, and so on. Per-account processes also keep one account's crash or ban from affecting the others.

## Common Pitfalls

:::warning "Could not find whatsmeow-node binary"
The platform package wasn't installed. Remove `--omit=optional` / `--no-optional` from your install command, and make sure you're not copying a `node_modules` folder from another OS into the image (`.dockerignore` it). If `npm ci` still skips it, regenerate `package-lock.json` with a current npm. As a last resort, point `binaryPath` in `createClient()` at the binary.
:::

:::warning Losing the session on redeploy
If the bot asks to pair again after every deploy, the store isn't on persistent storage. Check that the volume is mounted at the path in `WA_STORE`, and never run `docker compose down -v` on a production stack.
:::

:::warning Running two instances
Don't scale the bot horizontally, use PM2 cluster mode, or run a blue/green deploy that overlaps two processes on the same session. Run exactly one process per store; stop the old one before starting the new one.
:::

:::warning Signals not reaching Node
`CMD npm start` or the shell form of `CMD` can swallow `SIGTERM`, so the container is killed without a clean `disconnect()`. Use exec form (`CMD ["node", "dist/bot.js"]`) and `init: true`.
:::

:::warning Restart loops after a ban
Restarting in a loop after `temporary_ban` means repeatedly connecting to an account WhatsApp has just restricted. Alert, wait for `expire`, and fix whatever caused it (usually send rate) first. See [Rate Limiting](/docs/rate-limiting).
:::

<RelatedGuides slugs={["build-a-bot", "pair-whatsapp", "send-notifications", "whatsmeow-in-node"]} />
