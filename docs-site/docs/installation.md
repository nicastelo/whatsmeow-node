---
title: Installation Guide
sidebar_label: Installation
sidebar_position: 2
description: "Install whatsmeow-node with npm. Prebuilt Go binaries for macOS, Linux, and Windows. Supports SQLite and PostgreSQL stores."
keywords: [whatsmeow-node install, npm whatsapp, whatsapp nodejs setup, prebuilt go binary, sqlite postgresql whatsapp]
---

# Installation

## Requirements

- Node.js >= 18

## Install

```bash
npm install @whatsmeow-node/whatsmeow-node
```

The correct Go binary for your platform is installed automatically via `optionalDependencies`.

### Supported Platforms

| OS      | x64 | arm64 | musl (Alpine) |
|---------|-----|-------|---------------|
| macOS   | ✅  | ✅    | -             |
| Linux   | ✅  | ✅    | x64 only      |
| Windows | ✅  | ✅    | -             |

## Store Options

The `store` option accepts:

- **SQLite**: `session.db` or `./data/wa.db` — Creates a local database file. Plain paths are auto-prefixed with `file:`.
- **PostgreSQL**: `postgresql://myuser:mypassword@localhost:5432/whatsmeow` — For multi-instance deployments or serverless.

SQLite is configured automatically with WAL mode, foreign keys, and busy timeout.

## Usage with Next.js

Next.js bundles server code by default and will try to parse the Go binary as JavaScript. Add all `@whatsmeow-node` packages to `serverExternalPackages`:

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

Only your deployment platform's package will be installed (npm resolves by `os`/`cpu`), but listing all of them ensures it works in any environment.
