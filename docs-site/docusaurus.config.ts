import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'whatsmeow-node Docs',
  tagline: 'TypeScript bindings for whatsmeow via subprocess IPC',
  favicon: 'img/favicon.ico',
  future: {
    v4: true,
  },
  url: 'https://nicastelo.github.io',
  baseUrl: '/whatsmeow-node/',
  organizationName: 'nicastelo',
  projectName: 'whatsmeow-node',
  onBrokenLinks: 'throw',
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
              label: 'API Overview',
              to: '/docs/api/overview',
            },
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'Repository',
              href: 'https://github.com/nicastelo/whatsmeow-node',
            },
            {
              label: 'npm Package',
              href: 'https://www.npmjs.com/package/@whatsmeow-node/whatsmeow-node',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} whatsmeow-node contributors.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
