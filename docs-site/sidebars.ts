import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'comparison',
    'installation',
    'getting-started',
    'connection-lifecycle',
    'rate-limiting',
    'examples',
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
