---
title: Acknowledgments
sidebar_position: 10
description: "Credits and acknowledgments for whatsmeow-node — the whatsmeow Go library by tulir, sponsorship links, and project licensing."
---

# Acknowledgments

## whatsmeow

This project would not exist without [whatsmeow](https://github.com/tulir/whatsmeow), built and maintained by [@tulir](https://github.com/tulir) (Tulir Asokan) and [contributors](https://github.com/tulir/whatsmeow/graphs/contributors).

whatsmeow is a Go library that directly implements the WhatsApp Web multidevice protocol. It powers the [Mautrix WhatsApp bridge](https://github.com/mautrix/whatsapp) and many other projects. It is arguably the most reliable and well-maintained open-source WhatsApp implementation available.

whatsmeow-node is a thin wrapper — all the hard work of protocol implementation, encryption, session management, and WhatsApp compliance happens in whatsmeow. We just bridge it to Node.js.

### Relationship

**whatsmeow-node is an independent project.** It is not affiliated with, endorsed by, or connected to whatsmeow or its maintainers in any way. The whatsmeow-node maintainers have no relationship with the whatsmeow team — we're just users of their excellent library who built a Node.js bridge on top of it.

### whatsmeow Resources

- [GitHub Repository](https://github.com/tulir/whatsmeow)
- [Go Documentation](https://pkg.go.dev/go.mau.fi/whatsmeow)
- [Matrix Chat: #whatsmeow:maunium.net](https://matrix.to/#/#whatsmeow:maunium.net)
- [WhatsApp Protocol Q&A](https://github.com/tulir/whatsmeow/discussions/categories/whatsapp-protocol-q-a)

## Supporting the project

If you find whatsmeow-node useful and want to support its development financially, **please donate to whatsmeow instead**. They do all the heavy lifting — reverse engineering the protocol, handling encryption, keeping up with WhatsApp's changes. Without whatsmeow, this project wouldn't exist.

**Sponsor whatsmeow's maintainer:**

- [GitHub Sponsors — @tulir](https://github.com/sponsors/tulir)

The best way to ensure whatsmeow-node keeps working is to make sure whatsmeow stays healthy and maintained.

## License

whatsmeow-node is [MIT licensed](https://github.com/nicastelo/whatsmeow-node/blob/main/LICENSE).

whatsmeow is [MPL-2.0 licensed](https://github.com/tulir/whatsmeow/blob/main/LICENSE).
