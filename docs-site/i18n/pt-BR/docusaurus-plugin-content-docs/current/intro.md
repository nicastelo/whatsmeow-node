---
title: Por que whatsmeow-node
sidebar_position: 1
slug: /intro
description: "O que e whatsmeow-node e por que ele existe — bindings leves em TypeScript para a biblioteca Go whatsmeow de WhatsApp Web."
---

# Por que whatsmeow-node

:::danger Aviso Legal
Este projeto nao e afiliado, associado, autorizado, endossado ou de qualquer forma oficialmente conectado ao WhatsApp ou a qualquer uma de suas subsidiarias ou afiliadas. "WhatsApp", bem como nomes, marcas, emblemas e imagens relacionados, sao marcas registradas de seus respectivos proprietarios.

**O uso desta biblioteca pode violar os Termos de Servico do WhatsApp.** O WhatsApp nao permite clientes nao oficiais ou mensagens automatizadas em sua plataforma. Sua conta pode ser banida. Use por sua conta e risco.

Nao use isto para spam, stalkerware, envio de mensagens em massa ou qualquer finalidade que viole os Termos de Servico do WhatsApp. Os mantenedores nao apoiam tal uso e nao assumem responsabilidade por uso indevido.
:::

Existem muitas formas de se conectar ao WhatsApp a partir do Node.js. Veja por que esta existe.

## O problema

A maioria das bibliotecas WhatsApp para Node.js se divide em dois grupos:

**Automacao de navegador** (whatsapp-web.js, WPPConnect, OpenWA) — iniciam um Chrome headless, usam 200-500 MB de RAM e quebram quando o WhatsApp atualiza seu cliente web.

**Protocolo JS puro** (Baileys) — mais leve que um navegador, mas passou por multiplos forks, breaking changes e trocas de mantenedores.

## A abordagem

whatsmeow-node encapsula o [whatsmeow](https://github.com/tulir/whatsmeow), uma biblioteca Go que implementa diretamente o protocolo WhatsApp Web. O whatsmeow e a base da [Mautrix WhatsApp bridge](https://github.com/mautrix/whatsapp) — rodando 24/7 para milhares de usuarios em servidores Matrix. E possivelmente a implementacao open-source mais confiavel do WhatsApp.

Fazemos a ponte com o Node.js atraves de uma camada fina de IPC: um binario Go pre-compilado que se comunica com seu codigo TypeScript via stdin/stdout. Voce obtem a confiabilidade do whatsmeow com a experiencia de desenvolvimento do TypeScript.

## O que isso significa para voce

- **`npm install` e pronto** — binarios pre-compilados para macOS, Linux e Windows. Nenhuma toolchain Go necessaria.
- **~10-20 MB de memoria** — um unico binario Go, nao um navegador ou um processo Node.js pesado.
- **Tipagem completa** — 100 metodos, eventos tipados, erros tipados. Seu editor conhece a API.
- **Ampla cobertura da API** — 100 de 126 metodos upstream encapsulados: mensagens, grupos, newsletters, midia, enquetes, presenca, privacidade, criptografia, bots e mais.
- **Confiavel** — quando o WhatsApp muda algo, o whatsmeow se adapta. Voce herda essa estabilidade.

## Como funciona

```
Your TypeScript code → stdin JSON → Go binary → whatsmeow → WhatsApp
                     ← stdout JSON ←
```

Voce nunca interage diretamente com o binario Go. A classe `WhatsmeowClient` cuida do IPC, serializacao e ciclo de vida do processo. Do seu ponto de vista, sao apenas metodos assincronos que retornam dados tipados.

## Comparacao

| | whatsmeow-node | Baileys | whatsapp-web.js |
|---|---|---|---|
| Upstream | whatsmeow (Go) | Custom (JS) | Puppeteer |
| Memoria | ~10-20 MB | ~50 MB | ~200-500 MB |
| Confiabilidade | Nivel Mautrix | Comunidade | Depende do navegador |
| Estilo da API | Metodos tipados | Metodos tipados | Injecao no navegador |
| Setup | `npm install` | `npm install` | Chrome + `npm install` |

## Filosofia de design

Isto e um **binding**, nao um framework. Expomos a API do whatsmeow da forma mais fiel possivel — sem abstracoes inventadas, sem helpers magicos, sem opinioes sobre a estrutura do seu app.

Se voce quer wrappers de conveniencia como `sendText()` ou um framework de bot com roteamento de comandos, construa por cima. whatsmeow-node fornece a base.

## Proximos passos

- [Instalar](./installation)
- [Enviar sua primeira mensagem](./getting-started)
- [Explorar a API](./api/overview)
