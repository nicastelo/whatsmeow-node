---
title: Por qué whatsmeow-node
sidebar_position: 1
slug: /intro
description: "Qué es whatsmeow-node y por qué existe — bindings ligeros de TypeScript para la librería de WhatsApp Web basada en Go, whatsmeow."
---

# Por qué whatsmeow-node

:::danger Aviso legal
Este proyecto no está afiliado, asociado, autorizado, respaldado ni de ninguna manera oficialmente conectado con WhatsApp ni con ninguna de sus subsidiarias o filiales. "WhatsApp" así como nombres, marcas, emblemas e imágenes relacionados son marcas registradas de sus respectivos propietarios.

**El uso de esta librería puede violar los Términos de Servicio de WhatsApp.** WhatsApp no permite clientes no oficiales ni mensajería automatizada en su plataforma. Tu cuenta puede ser baneada. Úsala bajo tu propio riesgo y responsabilidad.

No uses esto para spam, stalkerware, mensajes masivos ni ningún propósito que viole los Términos de Servicio de WhatsApp. Los mantenedores no aprueban dicho uso y no asumen responsabilidad por el mal uso.
:::

Hay muchas formas de conectarse a WhatsApp desde Node.js. Aquí te contamos por qué existe esta.

## El problema

La mayoría de las librerías de WhatsApp para Node.js caen en dos categorías:

**Automatización de navegador** (whatsapp-web.js, WPPConnect, OpenWA) — levantan un Chrome headless, usan 200-500 MB de RAM, y se rompen cuando WhatsApp actualiza su cliente web.

**Protocolo JS puro** (Baileys) — más ligero que un navegador, pero ha pasado por múltiples forks, cambios incompatibles y rotación de mantenedores.

## El enfoque

whatsmeow-node envuelve a [whatsmeow](https://github.com/tulir/whatsmeow), una librería de Go que implementa directamente el protocolo de WhatsApp Web. whatsmeow potencia el [bridge Mautrix WhatsApp](https://github.com/mautrix/whatsapp) — funcionando 24/7 para miles de usuarios en servidores Matrix. Es probablemente la implementación open-source de WhatsApp más confiable.

Lo conectamos a Node.js a través de una capa IPC delgada: un binario de Go precompilado que se comunica con tu código TypeScript por stdin/stdout. Obtienes la confiabilidad de whatsmeow con la experiencia de desarrollo de TypeScript.

## Qué significa esto para ti

- **`npm install` y listo** — binarios precompilados para macOS, Linux y Windows. No necesitas el toolchain de Go.
- **~10-20 MB de memoria** — un solo binario de Go, no un navegador ni un proceso pesado de Node.js.
- **Todo tipado** — 100 métodos, eventos tipados, errores tipados. Tu editor conoce la API.
- **Amplia cobertura de API** — 100 de 126 métodos upstream envueltos: mensajes, grupos, newsletters, media, encuestas, presencia, privacidad, encriptación, bots y más.
- **Confiable** — cuando WhatsApp cambia algo, whatsmeow se adapta. Heredas esa estabilidad.

## Cómo funciona

```
Tu código TypeScript → stdin JSON → Binario Go → whatsmeow → WhatsApp
                     ← stdout JSON ←
```

Nunca interactúas con el binario de Go directamente. La clase `WhatsmeowClient` maneja el IPC, la serialización y el ciclo de vida del proceso. Desde tu perspectiva, son solo métodos async que devuelven datos tipados.

## Comparación

| | whatsmeow-node | Baileys | whatsapp-web.js |
|---|---|---|---|
| Upstream | whatsmeow (Go) | Custom (JS) | Puppeteer |
| Memoria | ~10-20 MB | ~50 MB | ~200-500 MB |
| Confiabilidad | Nivel Mautrix | Comunidad | Depende del navegador |
| Estilo de API | Métodos tipados | Métodos tipados | Inyección en navegador |
| Setup | `npm install` | `npm install` | Chrome + `npm install` |

## Filosofía de diseño

Esto es un **binding**, no un framework. Exponemos la API de whatsmeow lo más fielmente posible — sin abstracciones inventadas, sin helpers mágicos, sin opiniones sobre la estructura de tu app.

Si quieres wrappers de conveniencia como `sendText()` o un framework de bot con enrutamiento de comandos, constrúyelos encima. whatsmeow-node te da la base.

## Próximos pasos

- [Instalar](./installation)
- [Enviar tu primer mensaje](./getting-started)
- [Explorar la API](./api/overview)
