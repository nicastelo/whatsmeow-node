---
title: Agradecimientos
sidebar_label: Agradecimientos
sidebar_position: 10
description: "Créditos y agradecimientos de whatsmeow-node — la librería de Go whatsmeow de tulir, enlaces de patrocinio y licencia del proyecto."
---

# Agradecimientos

## whatsmeow

Este proyecto no existiría sin [whatsmeow](https://github.com/tulir/whatsmeow), construido y mantenido por [@tulir](https://github.com/tulir) (Tulir Asokan) y [contribuidores](https://github.com/tulir/whatsmeow/graphs/contributors).

whatsmeow es una librería de Go que implementa directamente el protocolo multidevice de WhatsApp Web. Potencia el [bridge Mautrix WhatsApp](https://github.com/mautrix/whatsapp) y muchos otros proyectos. Es probablemente la implementación open-source de WhatsApp más confiable y mejor mantenida disponible.

whatsmeow-node es un wrapper delgado — todo el trabajo pesado de implementación de protocolo, encriptación, gestión de sesiones y cumplimiento con WhatsApp ocurre en whatsmeow. Nosotros solo lo conectamos a Node.js.

### Relación

**whatsmeow-node es un proyecto independiente.** No está afiliado, respaldado ni conectado con whatsmeow ni con sus mantenedores de ninguna manera. Los mantenedores de whatsmeow-node no tienen relación con el equipo de whatsmeow — somos simplemente usuarios de su excelente librería que construimos un puente Node.js sobre ella.

### Recursos de whatsmeow

- [Repositorio en GitHub](https://github.com/tulir/whatsmeow)
- [Documentación Go](https://pkg.go.dev/go.mau.fi/whatsmeow)
- [Chat Matrix: #whatsmeow:maunium.net](https://matrix.to/#/#whatsmeow:maunium.net)
- [Q&A del Protocolo WhatsApp](https://github.com/tulir/whatsmeow/discussions/categories/whatsapp-protocol-q-a)

## Apoyar el proyecto

Si encuentras útil whatsmeow-node y quieres apoyar su desarrollo económicamente, **por favor dona a whatsmeow en su lugar**. Ellos hacen todo el trabajo pesado — ingeniería inversa del protocolo, manejo de encriptación, mantenerse al día con los cambios de WhatsApp. Sin whatsmeow, este proyecto no existiría.

**Patrocinar al mantenedor de whatsmeow:**

- [GitHub Sponsors — @tulir](https://github.com/sponsors/tulir)

La mejor forma de asegurar que whatsmeow-node siga funcionando es asegurar que whatsmeow se mantenga saludable y mantenido.

## Licencia

whatsmeow-node tiene [licencia MIT](https://github.com/nicastelo/whatsmeow-node/blob/main/LICENSE).

whatsmeow tiene [licencia MPL-2.0](https://github.com/tulir/whatsmeow/blob/main/LICENSE).
