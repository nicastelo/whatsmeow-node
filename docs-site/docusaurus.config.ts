import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'whatsmeow-node',
  tagline: 'WhatsApp for Node.js — powered by the most battle-tested WhatsApp Web library',
  favicon: 'img/favicon.ico',
  future: {
    v4: true,
  },
  url: 'https://nicastelo.github.io',
  baseUrl: '/whatsmeow-node/',
  organizationName: 'nicastelo',
  projectName: 'whatsmeow-node',
  onBrokenLinks: 'throw',
  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'google-site-verification',
        content: 'sI3nw3-Hgxfuhcf6qt7z47BgAVtgqGbekxcrMk_yXuI',
      },
    },
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/nicastelo/whatsmeow-node/tree/main/docs-site/',
        },
        blog: false,
        gtag: {
          trackingID: 'G-65NY6175QQ',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'whatsmeow-node',
      logo: {
        alt: 'whatsmeow-node',
        src: 'img/image.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://www.npmjs.com/package/@whatsmeow-node/whatsmeow-node',
          label: 'npm',
          position: 'right',
        },
        {
          href: 'https://github.com/nicastelo/whatsmeow-node',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intro',
            },
            {
              label: 'API Reference',
              to: '/docs/api/overview',
            },
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/nicastelo/whatsmeow-node',
            },
            {
              label: 'npm',
              href: 'https://www.npmjs.com/package/@whatsmeow-node/whatsmeow-node',
            },
          ],
        },
        {
          title: 'whatsmeow (upstream)',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/tulir/whatsmeow',
            },
            {
              label: 'Go Docs',
              href: 'https://pkg.go.dev/go.mau.fi/whatsmeow',
            },
            {
              label: 'Matrix Chat',
              href: 'https://matrix.to/#/#whatsmeow:maunium.net',
            },
            {
              label: 'Sponsor @tulir',
              href: 'https://github.com/sponsors/tulir',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} whatsmeow-node contributors. Not affiliated with WhatsApp or whatsmeow.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
