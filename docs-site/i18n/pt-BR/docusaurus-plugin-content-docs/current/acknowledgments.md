---
title: Agradecimentos
sidebar_position: 10
description: "Creditos e agradecimentos do whatsmeow-node — a biblioteca Go whatsmeow por tulir, links de patrocinio e licenciamento do projeto."
---

# Agradecimentos

## whatsmeow

Este projeto nao existiria sem o [whatsmeow](https://github.com/tulir/whatsmeow), construido e mantido por [@tulir](https://github.com/tulir) (Tulir Asokan) e [contribuidores](https://github.com/tulir/whatsmeow/graphs/contributors).

O whatsmeow e uma biblioteca Go que implementa diretamente o protocolo multidevice do WhatsApp Web. Ele e a base da [Mautrix WhatsApp bridge](https://github.com/mautrix/whatsapp) e de muitos outros projetos. E possivelmente a implementacao open-source mais confiavel e bem mantida do WhatsApp disponivel.

whatsmeow-node e um wrapper fino — todo o trabalho pesado de implementacao de protocolo, criptografia, gerenciamento de sessao e conformidade com o WhatsApp acontece no whatsmeow. Nos apenas fazemos a ponte com o Node.js.

### Relacionamento

**whatsmeow-node e um projeto independente.** Nao e afiliado, endossado ou conectado ao whatsmeow ou seus mantenedores de nenhuma forma. Os mantenedores do whatsmeow-node nao tem nenhum relacionamento com a equipe do whatsmeow — somos apenas usuarios de sua excelente biblioteca que construiram uma ponte Node.js por cima dela.

### Recursos do whatsmeow

- [Repositorio GitHub](https://github.com/tulir/whatsmeow)
- [Documentacao Go](https://pkg.go.dev/go.mau.fi/whatsmeow)
- [Chat Matrix: #whatsmeow:maunium.net](https://matrix.to/#/#whatsmeow:maunium.net)
- [Perguntas e Respostas sobre o Protocolo WhatsApp](https://github.com/tulir/whatsmeow/discussions/categories/whatsapp-protocol-q-a)

## Apoiando o projeto

Se voce acha o whatsmeow-node util e quer apoiar seu desenvolvimento financeiramente, **por favor doe para o whatsmeow**. Eles fazem todo o trabalho pesado — engenharia reversa do protocolo, gerenciamento de criptografia, acompanhando as mudancas do WhatsApp. Sem o whatsmeow, este projeto nao existiria.

**Patrocine o mantenedor do whatsmeow:**

- [GitHub Sponsors — @tulir](https://github.com/sponsors/tulir)

A melhor forma de garantir que o whatsmeow-node continue funcionando e garantir que o whatsmeow permaneca saudavel e mantido.

## Licenca

whatsmeow-node e licenciado sob [MIT](https://github.com/nicastelo/whatsmeow-node/blob/main/LICENSE).

whatsmeow e licenciado sob [MPL-2.0](https://github.com/tulir/whatsmeow/blob/main/LICENSE).
