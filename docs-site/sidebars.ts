import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'comparison',
    'installation',
    'getting-started',
    'connection-lifecycle',
    'rate-limiting',
    'faq',
    {
      type: 'category',
      label: 'Guides',
      link: {type: 'doc', id: 'guides/overview'},
      items: [
        'guides/build-a-bot',
        'guides/send-stickers',
        'guides/download-media',
        'guides/typing-indicators',
        'guides/pair-whatsapp',
        'guides/connect-to-ai',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      link: {type: 'doc', id: 'examples/overview'},
      items: [
        'examples/pairing',
        'examples/messaging',
        'examples/media',
        'examples/groups-and-communities',
        'examples/presence-and-status',
        'examples/advanced',
        'examples/bots-and-resilience',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: ['api/overview', 'api/events', 'api/errors'],
    },
    {
      type: 'category',
      label: 'Troubleshooting',
      items: ['troubleshooting/common-issues'],
    },
    'acknowledgments',
  ],
};

export default sidebars;
