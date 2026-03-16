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
  trailingSlash: false,
  onBrokenLinks: 'throw',
  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'google-site-verification',
        content: 'sI3nw3-Hgxfuhcf6qt7z47BgAVtgqGbekxcrMk_yXuI',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:title',
        content: 'whatsmeow-node — WhatsApp API for Node.js',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:description',
        content:
          'TypeScript/Node.js bindings for whatsmeow, the most battle-tested WhatsApp Web library. No Puppeteer, no browser — just npm install.',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:image',
        content: 'https://nicastelo.github.io/whatsmeow-node/img/image.png',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:type',
        content: 'website',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:card',
        content: 'summary',
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
  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            from: '/docs/examples',
            to: '/docs/examples/overview',
          },
          {
            from: '/docs/guides',
            to: '/docs/guides/overview',
          },
        ],
      },
    ],
  ],
  themeConfig: {
    metadata: [
      {
        name: 'description',
        content:
          'TypeScript/Node.js bindings for whatsmeow, the most battle-tested WhatsApp Web library. No Puppeteer, no browser — just npm install.',
      },
    ],
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'whatsmeow-node',
      logo: {
        alt: 'whatsmeow-node',
        src: 'img/image.png',
        width: 32,
        height: 32,
      },
      items: [
        {
          type: 'dropdown',
          label: 'Docs',
          position: 'left',
          items: [
            {label: 'Getting Started', to: '/docs/getting-started'},
            {label: 'Installation', to: '/docs/installation'},
            {label: 'Connection Lifecycle', to: '/docs/connection-lifecycle'},
            {label: 'Comparison', to: '/docs/comparison'},
            {label: 'Troubleshooting', to: '/docs/troubleshooting/common-issues'},
          ],
        },
        {
          label: 'Guides',
          to: '/docs/guides/overview',
          position: 'left',
        },
        {
          label: 'API',
          to: '/docs/api/overview',
          position: 'left',
        },
        {
          label: 'Examples',
          to: '/docs/examples/overview',
          position: 'left',
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
              label: 'Guides',
              to: '/docs/guides/overview',
            },
            {
              label: 'FAQ',
              to: '/docs/faq',
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
