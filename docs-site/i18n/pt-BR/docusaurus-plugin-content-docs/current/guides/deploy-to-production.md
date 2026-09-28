---
title: "Como Fazer Deploy de um Bot de WhatsApp em Produção"
sidebar_label: Deploy em Produção
sidebar_position: 27
description: "Faça deploy de um bot de WhatsApp com whatsmeow-node em produção com Docker, systemd ou PM2 — store de sessão persistente, pareamento inicial, encerramento gracioso, health checks e alertas."
keywords: [deploy bot whatsapp, bot whatsapp docker, bot whatsapp produção nodejs, bot whatsapp systemd pm2, hospedar bot whatsapp servidor]
---

import Head from '@docusaurus/Head';
import {RelatedGuides} from '@site/src/components/RelatedGuides';

<Head>
  <meta property="og:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/deploy-to-production.png" />
  <meta name="twitter:image" content="https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/deploy-to-production.png" />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Como Fazer Deploy de um Bot de WhatsApp em Produção",
      "description": "Faça deploy de um bot de WhatsApp com whatsmeow-node em produção com Docker, systemd ou PM2 — store de sessão persistente, pareamento inicial, encerramento gracioso, health checks e alertas.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/deploy-to-production.png",
      "step": [
        {"@type": "HowToStep", "name": "Escolher um Host de Longa Duração", "text": "Rode o bot em uma VPS ou plataforma de containers que mantenha um processo rodando. Plataformas serverless como Vercel, Lambda ou Cloudflare Workers não conseguem manter a conexão aberta; para apenas enviar, chame a partir delas um serviço emissor sempre ativo."},
        {"@type": "HowToStep", "name": "Persistir o Store de Sessão", "text": "Aponte a opção store para um arquivo SQLite em um volume persistente ou para uma connection string do PostgreSQL, e faça backup."},
        {"@type": "HowToStep", "name": "Escrever um Entrypoint de Produção", "text": "Leia o store, a porta do health check e o telefone de pareamento de variáveis de ambiente e emita logs JSON estruturados, incluindo os eventos log do binário Go."},
        {"@type": "HowToStep", "name": "Tratar Eventos Fatais", "text": "Alerte e encerre em logged_out e em eventos exit inesperados; alerte em temporary_ban sem reconectar. Algumas desconexões permanentes não emitem nenhum evento, então monitore também o health check."},
        {"@type": "HowToStep", "name": "Adicionar um Health Check", "text": "Exponha um endpoint HTTP que retorne 200 apenas quando isConnected() for true. Use-o para readiness e monitoramento, não como liveness probe que reinicia o bot."},
        {"@type": "HowToStep", "name": "Encerramento Gracioso", "text": "Em SIGTERM e SIGINT, defina a presença como unavailable, chame disconnect() e depois close() para parar o processo Go."},
        {"@type": "HowToStep", "name": "Inicializar e Parear na Primeira Execução", "text": "Chame init(); se não houver JID salvo e PAIR_PHONE estiver definido, chame connect() e peça um pairCode(); caso contrário, encerre com um código que o supervisor não reinicie."},
        {"@type": "HowToStep", "name": "Empacotar com Docker", "text": "Faça o build sobre node:22-slim ou node:22-alpine sem omitir as dependências opcionais e monte o store em um volume nomeado."},
        {"@type": "HowToStep", "name": "Parear Dentro do Container", "text": "Rode o container uma vez com PAIR_PHONE definido e digite o código no WhatsApp; depois inicie o serviço normalmente."},
        {"@type": "HowToStep", "name": "Rodar Sem Docker", "text": "Crie um usuário de serviço e o diretório do store, pareie uma vez em primeiro plano com esse usuário e depois rode o bot com uma unit do systemd ou um arquivo ecosystem do PM2 com uma única instância e uma política de restart."}
      ]
    })}
  </script>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Como Fazer Deploy de um Bot de WhatsApp em Produção",
      "description": "Faça deploy de um bot de WhatsApp com whatsmeow-node em produção com Docker, systemd ou PM2 — store de sessão persistente, pareamento inicial, encerramento gracioso, health checks e alertas.",
      "image": "https://nicastelo.github.io/whatsmeow-node/img/guides/pt-BR/deploy-to-production.png",
      "author": {"@type": "Organization", "name": "whatsmeow-node", "url": "https://nicastelo.github.io/whatsmeow-node/"},
      "publisher": {"@type": "Organization", "name": "whatsmeow-node", "logo": {"@type": "ImageObject", "url": "https://nicastelo.github.io/whatsmeow-node/img/image.png"}}
    })}
  </script>
</Head>

![Como Fazer Deploy de um Bot de WhatsApp em Produção](/img/guides/pt-BR/deploy-to-production.png)
![Como Fazer Deploy de um Bot de WhatsApp em Produção](/img/guides/pt-BR/deploy-to-production-light.png)

# Como Fazer Deploy de um Bot de WhatsApp em Produção

Um bot que funciona no seu notebook precisa de mais algumas coisas antes de rodar sem supervisão: um host que o mantenha rodando, um store de sessão que sobreviva a reinícios, uma forma de pareá-lo em um servidor sem tela, um encerramento limpo e alertas para as falhas das quais ele não consegue se recuperar sozinho. Este guia cobre tudo isso, com Docker, systemd e PM2.

## Pré-requisitos

- Um bot funcionando ([Como Criar um Bot de WhatsApp](build-a-bot))
- Um projeto TypeScript que compile para `dist/` (`npm run build`) com um `package-lock.json`
- Um servidor ou plataforma de containers onde você possa rodar um processo de longa duração com armazenamento persistente

## Passo 1: Escolher um Host de Longa Duração

O whatsmeow-node inicia um binário Go que mantém uma conexão WebSocket com o WhatsApp enquanto o seu bot estiver online. As mensagens recebidas chegam por essa conexão, então algo precisa mantê-la aberta o tempo todo.

Isso descarta plataformas serverless:

- **Funções da Vercel, AWS Lambda, Google Cloud Functions** — o processo é congelado ou encerrado entre as requisições, então a conexão cai e você perde mensagens.
- **Cloudflare Workers e outros runtimes edge** — eles nem conseguem iniciar um processo filho.

Use qualquer coisa que rode um processo continuamente: uma VPS, um servidor dedicado ou uma plataforma de containers com volumes persistentes (Docker em uma VM, Fly.io, Railway, background workers do Render, Kubernetes etc.). Se você usa Next.js, um servidor `next start` auto-hospedado funciona; veja [Instalação](/docs/installation#usage-with-nextjs) para a configuração do bundler.

### E se eu só enviar mensagens?

Serverless não é suportado, nem mesmo se você só *envia* mensagens. Uma função serverless de Node.js (Vercel, Lambda) tecnicamente pode fazer `init()` → `connect()` → `sendMessage()` → `disconnect()` a cada requisição, mas falha de formas difíceis de perceber:

- **A sessão precisa ficar no PostgreSQL.** O sistema de arquivos da função é temporário, então um store SQLite se perde e você precisa parear de novo.
- **Invocações concorrentes podem quebrar a sessão.** Duas requisições ao mesmo tempo são dois processos conectando como o mesmo dispositivo vinculado: o WhatsApp desconecta um e os dois gravam o estado de criptografia no mesmo store. Você teria que limitar a função a uma única instância concorrente ou adicionar um lock.
- **Cada envio paga um handshake de conexão completo**, e as mensagens que chegaram enquanto estava offline são entregues a um processo que termina em seguida.
- **Ciclos constantes de conexão/desconexão** não parecem um dispositivo vinculado normal e podem aumentar o risco de banimento.

O padrão confiável é um processo sempre ativo que seja dono da conexão com o WhatsApp e exponha um pequeno endpoint HTTP ou leia de uma fila. Seu app serverless chama esse serviço em vez de falar diretamente com o WhatsApp.

## Passo 2: Persistir o Store de Sessão

A opção `store` é onde o whatsmeow guarda a identidade do dispositivo e as chaves de criptografia criadas durante o pareamento. **Se você perder o store, precisa parear de novo.** Trate-o como um banco de dados, não como um cache.

| Store | Valor de `store` | Observações |
|-------|------------------|-------------|
| SQLite | `/data/session.db` ou `file:/data/session.db` | Caminhos simples recebem o prefixo `file:` automaticamente. Modo WAL, foreign keys e busy timeout são ativados para você. Coloque-o em um volume persistente. |
| PostgreSQL | `postgres://user:pass@host:5432/whatsmeow` | Também aceita `postgresql://`. Use quando você já roda Postgres ou sua plataforma não tem disco persistente. |

Regras para produção:

- **Coloque o SQLite em armazenamento persistente.** A camada gravável de um container é apagada quando o container é recriado. Monte um volume e aponte o store para ele.
- **Nunca inclua o store em uma imagem** nem faça commit dele no git. Ele contém as chaves da conta de WhatsApp.
- **Faça backup.** O SQLite roda em modo WAL, então copie o `session.db` junto com os arquivos `-wal` e `-shm` com o bot parado (ou use `sqlite3 session.db ".backup backup.db"`). Para Postgres, use `pg_dump`. Guarde os backups como segredos.
- **Um processo por store.** Dois processos usando a mesma sessão vão disputar a conexão.

## Passo 3: Escrever um Entrypoint de Produção

Leia a configuração de variáveis de ambiente e escreva logs JSON estruturados no stdout, para que Docker, journald e PM2 possam coletá-los.

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

`alert()` envia `{ "text": "..." }`, o formato esperado pelos incoming webhooks do Slack. Troque pelo que o seu time usa.

### Encaminhar os logs do binário Go

O processo Go escreve linhas de log JSON no stderr, e o client reemite cada uma como um evento `log`. Linhas que não são JSON — como o stack trace de um panic do Go — chegam com `level: "raw"`. Encaminhe-as para o mesmo fluxo de logs:

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

Sempre registre um listener de `error`: como qualquer `EventEmitter`, o client lança uma exceção se um evento `error` não tiver listener (por exemplo, quando o binário não pode ser iniciado).

## Passo 4: Tratar Eventos Fatais e Alertar

`disconnected` é rotina — o whatsmeow reconecta automaticamente. Três eventos indicam que ele não vai se recuperar sozinho:

| Evento | O que aconteceu | O que fazer |
|--------|-----------------|-------------|
| `logged_out` | A sessão foi revogada (dispositivo desvinculado, ou o WhatsApp a rejeitou). As credenciais salvas não são mais válidas. | Alertar e encerrar. Uma pessoa precisa parear de novo (o whatsmeow remove o dispositivo do store; se a próxima inicialização ainda registrar "Session found" e deslogar de novo, apague o store antes). |
| `temporary_ban` | O WhatsApp recusou a conexão. `expire` é uma duração como `"23h59m0s"`. O whatsmeow **não** reconecta automaticamente. | Alertar e parar de enviar. Reiniciar o bot depois que o bloqueio expirar. |
| `exit` | O processo Go terminou. Comandos pendentes são rejeitados com `ProcessExitedError`. | Se não foi você que causou, encerre com código diferente de zero para o supervisor reiniciar. |

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

Algumas desconexões permanentes nem chegam como eventos: outro processo se conectando com a mesma sessão (o WhatsApp substitui esta conexão pela nova), ou o WhatsApp rejeitando uma versão de cliente desatualizada. O whatsmeow não reconecta depois de nenhuma das duas, e o whatsmeow-node não emite nada, nem mesmo `disconnected`. O bot continua rodando, mas fica em silêncio, e `isConnected()` continua `false`. O health check do Passo 5 é como você percebe. Para evitar o primeiro caso, siga a regra de um processo por store do Passo 2, inclusive durante deploys.

O bot usa dois códigos de saída de propósito:

- **`1`** — algo transitório deu errado. O supervisor deve reiniciá-lo.
- **`78`** — o bot não está pareado (ou foi deslogado). Reiniciar não adianta até alguém parear, então configure o systemd e o PM2 para não reiniciar com `78` (mostrado no Passo 10).

Um bloqueio temporário geralmente é causado por enviar demais, rápido demais. Leia [Rate Limiting](/docs/rate-limiting) antes de reiniciar.

## Passo 5: Adicionar um Health Check

`isConnected()` pergunta ao processo Go se o socket do WhatsApp está ativo. Envolva isso em um pequeno endpoint HTTP que os orquestradores possam consultar:

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

Se o processo Go morreu, `isConnected()` é rejeitado, então a verificação também falha. Desconexões curtas durante a reconexão automática também retornam `503`, então deixe a verificação falhar algumas vezes seguidas (por exemplo, `retries: 3`) antes de agir.

Use-o como readiness check e para monitoramento, não como liveness check que reinicia o processo: durante um `temporary_ban` ele fica em `503` até você mesmo reiniciar o bot, e reinícios automáticos reconectariam à conta restrita. Um `503` que dura minutos sem um alerta de `temporary_ban` geralmente é uma das desconexões silenciosas do Passo 4, então aponte um monitor de disponibilidade para `/healthz` e alerte com base nele. O `HEALTHCHECK` do Docker só marca o container como `unhealthy`; ele não o reinicia.

## Passo 6: Encerramento Gracioso

Docker, systemd e Kubernetes enviam `SIGTERM` antes de parar o seu processo. PM2 e Ctrl+C enviam `SIGINT`. Trate os dois: avise que está ficando offline, feche a conexão com o WhatsApp com `disconnect()` e depois pare o processo Go com `close()`.

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

`disconnect()` é assíncrono e fecha a conexão com o WhatsApp. `close()` é síncrono: envia `SIGTERM` ao processo Go, que encerra na hora sem fechar a conexão de forma limpa, então sempre faça `await disconnect()` antes de chamá-lo. Se o próprio Node for morto abruptamente, o binário Go percebe que o stdin foi fechado e encerra sozinho, então ele não fica órfão.

## Passo 7: Inicializar e Parear na Primeira Execução

Em um servidor sem tela, um código de pareamento é mais prático que um QR code. Se o store estiver vazio e `PAIR_PHONE` estiver definido, peça um código. Se o store estiver vazio e `PAIR_PHONE` não estiver definido, encerre com `78`.

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

Prefere QR code? Substitua o trecho do código de pareamento pelo fluxo de QR e escaneie o QR pelos logs. Adicione `qrcode-terminal` em `dependencies` (não em `devDependencies`), porque a imagem de runtime omite as dependências de desenvolvimento:

```typescript
import qrcode from "qrcode-terminal";

const { jid } = await client.init();
if (!jid) {
  client.on("qr", ({ code }) => qrcode.generate(code, { small: true }));
  await client.getQRChannel();
}
await client.connect();
```

Veja [Como Parear o WhatsApp](pair-whatsapp) para os dois fluxos em detalhe.

## Passo 8: Empacotar com Docker

O whatsmeow-node distribui o binário Go em pacotes por plataforma (`@whatsmeow-node/linux-x64`, `@whatsmeow-node/linux-arm64`, `@whatsmeow-node/linux-x64-musl`, …) listados como `optionalDependencies`. O npm ignora os pacotes cujo `os` e `cpu` não correspondem à imagem. O npm 11.11 e versões mais novas também filtram por libc; versões anteriores (incluindo o npm 10 que vem com o Node 22) podem instalar tanto o pacote Linux glibc quanto o musl, o que é inofensivo porque os binários são estáticos e o cliente usa o que estiver presente. **Não use `--omit=optional` nem `--no-optional`**, senão o binário não estará lá.

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

A imagem slim funciona em hosts `amd64` e `arm64`. O health check usa o `fetch` nativo do Node, então você não precisa instalar o `curl`.

### Variante Alpine

No Alpine, o cliente usa `@whatsmeow-node/linux-x64-musl` (ou o pacote glibc, se o npm também o instalou; ambos os binários são estáticos). Só mudam as imagens base:

```dockerfile
FROM node:22-alpine AS build
# ... same build steps ...

FROM node:22-alpine
# ... same runtime steps ...
```

:::info
O pacote musl é apenas x64, então Alpine `arm64` não é uma plataforma suportada. Em hosts `arm64`, use `node:22-slim`. No Apple Silicon, faça o build das imagens Alpine com `docker build --platform linux/amd64`.
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

Isso mantém um `session.db` local fora da imagem.

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

Vai usar PostgreSQL? Aponte `WA_STORE` para o banco e remova o volume do bot:

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

## Passo 9: Parear Dentro do Container

Pareie uma vez com um container temporário que usa o mesmo volume e depois inicie o serviço normalmente:

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

A sessão agora fica no volume `wa-data`, então rebuilds, reinícios e `docker compose down` (sem `-v`) a preservam. Códigos de pareamento expiram rápido — se perder o prazo, repita o passo 1.

As políticas de restart do Docker não conseguem ignorar um código de saída específico. Se o bot encerrar com `78` (não pareado ou deslogado), `unless-stopped` continua reiniciando com um atraso crescente, e cada tentativa registra "Not paired" e envia o alerta de novo. É o sinal de que você precisa repetir o pareamento (ou rodar `docker compose stop bot` até poder fazer isso). Se ele registrar "Session found" e depois deslogar de novo, remova o store antigo (`docker compose run --rm bot sh -c 'rm -f /data/session.db*'`) antes de parear.

## Passo 10: Rodar Sem Docker (systemd ou PM2)

Faça o build no servidor em `/opt/wabot` (ou copie o `dist/` para lá e rode `npm ci --omit=dev`). Crie o usuário do serviço e o diretório do store, pareie uma vez em primeiro plano com esse usuário e depois entregue o processo a um supervisor.

```bash
sudo useradd --system --home /opt/wabot --shell /usr/sbin/nologin wabot
sudo install -d -o wabot -g wabot /var/lib/wabot
cd /opt/wabot
sudo -u wabot env WA_STORE=/var/lib/wabot/session.db PAIR_PHONE=5512345678 node dist/bot.js
# enter the code, wait for "Connected", then Ctrl+C
```

Rodar como `wabot` faz com que esse usuário seja o dono do arquivo do store.

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

`KillMode=mixed` é importante: com o padrão (`control-group`), o systemd envia `SIGTERM` ao binário Go ao mesmo tempo que ao Node, e ele morre antes que `disconnect()` possa rodar.

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

## Exemplo Completo

`src/bot.ts` — tudo acima em um único arquivo, com um handler `!ping` no lugar da lógica do seu bot:

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

## Rodando Várias Contas

Cada store guarda uma única conta de WhatsApp: no `init()`, o binário Go abre o primeiro dispositivo do store. Para rodar várias contas, rode **um processo por conta**, cada um com seu próprio store — um arquivo SQLite separado ou um banco Postgres separado. Com Docker, isso significa um serviço por conta, cada um com seu próprio volume. Com systemd, uma unit template (`wabot@.service` com `Environment=WA_STORE=/var/lib/wabot/%i.db`) te dá `wabot@vendas`, `wabot@suporte` e assim por diante. Processos por conta também evitam que a queda ou o bloqueio de uma conta afete as outras.

## Erros Comuns

:::warning "Could not find whatsmeow-node binary"
O pacote da plataforma não foi instalado. Remova `--omit=optional` / `--no-optional` do comando de instalação e garanta que você não está copiando para a imagem uma pasta `node_modules` de outro sistema operacional (coloque-a no `.dockerignore`). Se o `npm ci` continuar pulando o pacote, gere o `package-lock.json` de novo com um npm atual. Como último recurso, aponte `binaryPath` no `createClient()` para o binário.
:::

:::warning Perder a sessão a cada deploy
Se o bot pede para parear de novo depois de cada deploy, o store não está em armazenamento persistente. Verifique se o volume está montado no caminho de `WA_STORE` e nunca rode `docker compose down -v` em um stack de produção.
:::

:::warning Rodar duas instâncias
Não escale o bot horizontalmente, não use o modo cluster do PM2 nem faça deploys blue/green que sobreponham dois processos na mesma sessão. Rode exatamente um processo por store; pare o antigo antes de iniciar o novo.
:::

:::warning Sinais que não chegam ao Node
`CMD npm start` ou a forma shell do `CMD` podem engolir o `SIGTERM`, então o container é morto sem um `disconnect()` limpo. Use a forma exec (`CMD ["node", "dist/bot.js"]`) e `init: true`.
:::

:::warning Loops de restart após um bloqueio
Reiniciar em loop depois de um `temporary_ban` significa conectar repetidamente em uma conta que o WhatsApp acabou de restringir. Alerte, espere o `expire` passar e corrija a causa primeiro (geralmente a taxa de envio). Veja [Rate Limiting](/docs/rate-limiting).
:::

<RelatedGuides slugs={["build-a-bot", "pair-whatsapp", "send-notifications", "whatsmeow-in-node"]} />
