---
title: Guía de Instalación
sidebar_label: Instalación
sidebar_position: 2
description: "Instala whatsmeow-node con npm. Binarios de Go precompilados para macOS, Linux y Windows. Soporta stores de SQLite y PostgreSQL."
keywords: [instalar whatsmeow-node, npm whatsapp, configurar whatsapp nodejs, binario go precompilado, sqlite postgresql whatsapp]
---

# Instalación

## Requisitos

- Node.js >= 18

## Instalar

```bash
npm install @whatsmeow-node/whatsmeow-node
```

El binario de Go correcto para tu plataforma se instala automáticamente vía `optionalDependencies`.

### Plataformas soportadas

| SO      | x64 | arm64 | musl (Alpine) |
|---------|-----|-------|---------------|
| macOS   | ✅  | ✅    | -             |
| Linux   | ✅  | ✅    | solo x64      |
| Windows | ✅  | ✅    | -             |

## Opciones de store

La opción `store` acepta:

- **SQLite**: `session.db` o `./data/wa.db` — Crea un archivo de base de datos local. Las rutas simples se prefijan automáticamente con `file:`.
- **PostgreSQL**: `postgresql://miusuario:mipassword@localhost:5432/whatsmeow` — Para despliegues multi-instancia o serverless.

SQLite se configura automáticamente con modo WAL, claves foráneas y busy timeout.

## Uso con Next.js {#usage-with-nextjs}

Next.js empaqueta el código del servidor por defecto e intentará interpretar el binario de Go como JavaScript. Agrega todos los paquetes `@whatsmeow-node` a `serverExternalPackages`:

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

Solo se instalará el paquete de tu plataforma de despliegue (npm resuelve por `os`/`cpu`), pero listarlos todos asegura que funcione en cualquier entorno.
