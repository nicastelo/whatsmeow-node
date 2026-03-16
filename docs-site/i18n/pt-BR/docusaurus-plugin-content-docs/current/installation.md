---
title: Guia de Instalacao
sidebar_label: Instalacao
sidebar_position: 2
description: "Instale o whatsmeow-node com npm. Binarios Go pre-compilados para macOS, Linux e Windows. Suporte a SQLite e PostgreSQL."
---

# Instalacao

## Requisitos

- Node.js >= 18

## Instalar

```bash
npm install @whatsmeow-node/whatsmeow-node
```

O binario Go correto para sua plataforma e instalado automaticamente via `optionalDependencies`.

### Plataformas Suportadas

| SO      | x64 | arm64 | musl (Alpine) |
|---------|-----|-------|---------------|
| macOS   | ✅  | ✅    | -             |
| Linux   | ✅  | ✅    | apenas x64    |
| Windows | ✅  | ✅    | -             |

## Opcoes de Store

A opcao `store` aceita:

- **SQLite**: `session.db` ou `./data/wa.db` — Cria um arquivo de banco de dados local. Caminhos simples recebem o prefixo `file:` automaticamente.
- **PostgreSQL**: `postgresql://myuser:mypassword@localhost:5432/whatsmeow` — Para deploys com multiplas instancias ou serverless.

O SQLite e configurado automaticamente com modo WAL, foreign keys e busy timeout.

## Uso com Next.js {#usage-with-nextjs}

O Next.js empacota o codigo do servidor por padrao e tentara interpretar o binario Go como JavaScript. Adicione todos os pacotes `@whatsmeow-node` ao `serverExternalPackages`:

```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@whatsmeow-node/whatsmeow-node",
    "@whatsmeow-node/darwin-arm64",
    "@whatsmeow-node/darwin-x64",
    "@whatsmeow-node/linux-arm64",
    "@whatsmeow-node/linux-x64",
    "@whatsmeow-node/linux-x64-musl",
    "@whatsmeow-node/win32-arm64",
    "@whatsmeow-node/win32-x64",
  ],
};
```

Apenas o pacote da sua plataforma de deploy sera instalado (o npm resolve por `os`/`cpu`), mas listar todos garante que funcione em qualquer ambiente.
