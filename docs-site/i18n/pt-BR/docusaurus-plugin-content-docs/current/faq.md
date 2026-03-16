---
title: Perguntas Frequentes
sidebar_label: Perguntas Frequentes
sidebar_position: 6
description: "Perguntas frequentes sobre o whatsmeow-node — requisitos, tipos de conta WhatsApp, deploy, multi-device, serverless e mais."
keywords: [whatsmeow-node faq, perguntas bot whatsapp, faq whatsapp nodejs, requisitos whatsmeow-node, como criar bot whatsapp]
---

# Perguntas Frequentes

## Geral

### O que e o whatsmeow-node?

whatsmeow-node e um cliente TypeScript/Node.js para WhatsApp Web. Ele encapsula o [whatsmeow](https://github.com/tulir/whatsmeow), uma biblioteca Go que implementa o protocolo multi-device do WhatsApp Web. Voce obtem a confiabilidade do whatsmeow com a experiencia de desenvolvimento do TypeScript — 100 metodos async tipados, eventos tipados e erros tipados.

### Como funciona por baixo dos panos?

Um binario Go pre-compilado roda como subprocesso. Seu codigo TypeScript se comunica com ele via stdin/stdout usando JSON-line IPC. A classe `WhatsmeowClient` gerencia o ciclo de vida do processo, serializacao e reconexao. Do ponto de vista do seu codigo, sao apenas chamadas de metodos assincronos.

### Esta e a API oficial do WhatsApp?

Nao. whatsmeow-node e um cliente nao oficial que se conecta como um dispositivo vinculado (como o WhatsApp Web). A unica API oficial e a [WhatsApp Business Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) da Meta, que requer verificacao empresarial e tem preco por conversa.

### Minha conta pode ser banida?

Sim. Usar clientes nao oficiais viola os Termos de Servico do WhatsApp, e sua conta pode ser banida. Esse risco se aplica a todas as bibliotecas nao oficiais (Baileys, whatsapp-web.js, etc.), nao apenas ao whatsmeow-node. Evite envio em massa, spam ou comportamento suspeito para minimizar o risco.

### O whatsmeow-node e gratuito?

Sim. whatsmeow-node e licenciado sob MIT e gratuito para uso. A biblioteca upstream whatsmeow e licenciada sob MPL-2.0.

## Requisitos

### Qual versao do Node.js eu preciso?

Node.js 18 ou superior.

### Preciso ter Go instalado?

Nao. Binarios Go pre-compilados sao incluidos para todas as plataformas suportadas (macOS, Linux, Windows — x64 e arm64). O binario correto e instalado automaticamente via `optionalDependencies` do npm.

### Quais plataformas sao suportadas?

macOS (x64, arm64), Linux (x64, arm64, x64-musl para Alpine) e Windows (x64, arm64).

### Funciona no Alpine Linux / Docker?

Sim. O pacote `linux-x64-musl` fornece um binario estaticamente linkado para sistemas baseados em musl como o Alpine.

## Conta WhatsApp

### Preciso de uma conta WhatsApp Business?

Nao. whatsmeow-node funciona com qualquer conta WhatsApp regular. Ele se conecta como um dispositivo vinculado, da mesma forma que o WhatsApp Web ou Desktop.

### Posso usar multiplas contas WhatsApp?

Sim. Crie uma instancia de client separada para cada conta, cada uma com seu proprio caminho de store:

```typescript
const client1 = createClient({ store: "account1.db" });
const client2 = createClient({ store: "account2.db" });
```

Cada client inicia seu proprio processo Go.

### O celular precisa ficar online?

Nao. O protocolo multi-device do WhatsApp permite que dispositivos vinculados operem de forma independente. Seu celular pode estar offline, desligado ou desconectado — a sessao do dispositivo vinculado permanece ativa.

### Quantos dispositivos vinculados posso ter?

O WhatsApp permite ate 4 dispositivos vinculados por conta (alem do celular principal). O whatsmeow-node usa um desses slots.

### O que acontece se eu desvincular o dispositivo pelo celular?

O evento `logged_out` e disparado com o motivo. A sessao e permanentemente revogada — voce precisara apagar o banco de dados da sessao e parear novamente.

## Funcionalidades

### O que o whatsmeow-node pode fazer?

100 de 126 metodos upstream do whatsmeow estao encapsulados. As principais funcionalidades incluem:

- Enviar e receber texto, imagens, video, audio, documentos, stickers, contatos e localizacoes
- Criar, gerenciar e interagir com grupos e comunidades
- Enviar enquetes, reacoes e edicoes de mensagens
- Gerenciar newsletters (canais)
- Gerenciar presenca (online/offline, indicadores de digitacao)
- Baixar e enviar midia
- Gerenciar configuracoes de privacidade e lista de bloqueio
- Receber e processar dados de sincronizacao de historico
- Gerenciar chamadas (receber ofertas, rejeitar chamadas)
- Gerenciar mensagens temporarias

### Posso enviar mensagens para grupos?

Sim. Use o JID do grupo (formato: `<id>@g.us`) com qualquer metodo de envio. Voce tambem pode criar grupos, gerenciar participantes, alterar configuracoes e mais.

### Posso receber imagens e videos?

Sim. Escute o evento `"message"` e verifique os campos `imageMessage`, `videoMessage`, `audioMessage`, `documentMessage` ou `stickerMessage`. Baixe com `downloadAny(message)`.

### Posso fazer ou receber chamadas?

E possivel receber ofertas de chamada (evento `call:offer`) e rejeita-las (`rejectCall`). Nao e possivel iniciar ou aceitar chamadas de voz/video.

### Suporta botoes ou listas de mensagens?

O WhatsApp restringiu mensagens interativas (botoes, listas, catalogos de produtos) a API oficial Business. Envia-las por clientes nao oficiais pode nao funcionar ou resultar em restricoes na conta.

### Posso ler o historico de mensagens?

O whatsmeow-node recebe dados de sincronizacao de historico quando um dispositivo e pareado pela primeira vez. Escute eventos `history_sync` para capturar mensagens anteriores. Voce nao pode solicitar historico sob demanda — ele e enviado pelo WhatsApp durante a sincronizacao inicial.

## Deploy

### Posso rodar em um servidor (headless)?

Sim. whatsmeow-node e projetado para ambientes headless. Use pareamento por numero de telefone (`pairCode()`) se voce nao pode exibir QR codes, ou renderize QR codes por outros meios (interface web, endpoint de API, etc.).

### Funciona com serverless (AWS Lambda, Vercel)?

Depende do caso de uso. Para tarefas do tipo fire-and-forget como enviar um OTP ou uma notificacao unica, serverless funciona — init, connect, send, disconnect em uma unica invocacao. Para bots de longa duracao que escutam mensagens recebidas, serverless nao e ideal porque o whatsmeow-node mantem uma conexao WebSocket persistente e inicia um subprocesso Go. Para bots que precisam estar sempre ativos, um servidor persistente (VPS, container, EC2) tende a funcionar melhor. Se voce optar pelo serverless para envios unicos, considere usar um store PostgreSQL para que a sessao persista entre invocacoes.

### Funciona com Docker?

Sim. Use uma imagem base Node.js (nao Alpine a menos que voce especificamente precise de musl). O binario Go esta incluido no pacote npm — nenhuma configuracao adicional necessaria. Exemplo:

```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "bot.js"]
```

### Funciona com Next.js?

Sim, mas voce deve adicionar todos os pacotes `@whatsmeow-node` ao `serverExternalPackages` na sua configuracao Next.js para evitar que o bundler tente interpretar o binario Go. Veja o [Guia de Instalacao](/docs/installation#usage-with-nextjs).

### Qual banco de dados devo usar em producao?

PostgreSQL. Ele suporta acesso concorrente e e adequado para deploys com multiplas instancias. SQLite e suficiente para desenvolvimento e producao com instancia unica.

### Quanta memoria ele usa?

O binario Go usa ~10-20 MB de RAM. A memoria total do processo (Node.js + Go) e tipicamente 50-80 MB, comparado a 200-500 MB de solucoes baseadas em navegador.

## Comparacao

### Qual a diferenca para o Baileys?

Baileys implementa o protocolo WhatsApp em JavaScript puro. whatsmeow-node encapsula uma implementacao Go (whatsmeow) que e a base da Mautrix WhatsApp bridge, usada por milhares de usuarios Matrix. O principal trade-off: whatsmeow-node inicia um processo externo, mas herda a confiabilidade e manutencao do whatsmeow.

### Qual a diferenca para o whatsapp-web.js?

whatsapp-web.js automatiza um navegador Chrome headless, exigindo 200-500 MB de RAM e quebrando quando o WhatsApp atualiza o cliente web. whatsmeow-node implementa o protocolo diretamente com ~10-20 MB de RAM e sem dependencia de navegador.

### Devo usar isto ou a API oficial WhatsApp Business?

A API oficial e a unica escolha segura se voce precisa de uptime garantido, conformidade e sem risco de banimento de conta. whatsmeow-node e melhor para projetos pessoais, prototipagem, ferramentas internas, ou casos onde o custo ou processo de aprovacao da API oficial e proibitivo.

## Solucao de Problemas

### Por que meu QR code nao aparece?

Chame `getQRChannel()` **antes** de `connect()`, e somente quando `init()` retorna sem JID (significando que o dispositivo ainda nao esta pareado). Certifique-se de estar escutando o evento `"qr"`.

### Por que minhas mensagens falham silenciosamente?

A causa mais comum e o casing errado dos campos. Campos proto usam o casing exato do protobuf: `URL`, `fileSHA256`, `fileEncSHA256` — nao `url`, `fileSha256`, `fileEncSha256`. Veja [Solucao de Problemas](/docs/troubleshooting/common-issues#proto-field-naming).

### Por que recebo `ERR_TIMEOUT`?

O timeout padrao de comando e 30 segundos. Durante a sincronizacao inicial ou sob carga pesada, operacoes podem demorar mais. Aumente com `createClient({ store: "session.db", commandTimeout: 60000 })`.

### Como depuro problemas?

Escute o evento `"log"` para ver a saida do binario Go:

```typescript
client.on("log", (log) => {
  console.log(`[${log.level}] ${log.msg}`);
});
```

Isso frequentemente revela a causa raiz de problemas de conexao ou protocolo.
