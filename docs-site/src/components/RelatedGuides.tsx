import {GuideCard, GuideSection} from './GuideCard';

const GUIDES: Record<string, {title: string; description: string}> = {
  'whatsmeow-in-node': {
    title: 'Use whatsmeow in Node.js',
    description:
      'Install the npm package, connect to WhatsApp, and start using whatsmeow from TypeScript.',
  },
  'build-a-bot': {
    title: 'Build a Bot',
    description:
      'Create a WhatsApp bot from scratch — receive messages, handle commands, send replies.',
  },
  'pair-whatsapp': {
    title: 'Pair WhatsApp',
    description: 'Link a WhatsApp account via QR code or phone number code.',
  },
  'send-messages-typescript': {
    title: 'Send Messages from TypeScript',
    description:
      'Text, replies, mentions, media, polls, and reactions — all with full type safety.',
  },
  'automate-group-messages': {
    title: 'Automate Group Messages',
    description:
      'Send to groups, mention members, broadcast to multiple groups, and manage participants.',
  },
  'send-stickers': {
    title: 'Send Stickers',
    description: 'Upload and send WebP stickers, download incoming stickers.',
  },
  'typing-indicators': {
    title: 'Typing Indicators',
    description:
      "Show 'typing...' and 'recording audio...' indicators, subscribe to others' presence.",
  },
  'download-media': {
    title: 'Download Media',
    description:
      'Save incoming images, videos, audio, and documents to disk.',
  },
  'migrate-from-baileys': {
    title: 'Migrate from Baileys',
    description:
      'Side-by-side API comparison and step-by-step migration from Baileys.',
  },
  'migrate-from-whatsapp-web-js': {
    title: 'Migrate from whatsapp-web.js',
    description:
      'Drop Puppeteer, cut memory from 500 MB to 20 MB, and get a typed async API.',
  },
  'connect-to-ai': {
    title: 'Connect to Claude AI',
    description:
      'Build an AI-powered WhatsApp chatbot with Claude and the Anthropic SDK.',
  },
  'connect-to-chatgpt': {
    title: 'Connect to ChatGPT',
    description:
      'Build a WhatsApp chatbot powered by GPT-4.1 with the OpenAI SDK.',
  },
  'connect-to-gemini': {
    title: 'Connect to Gemini',
    description:
      'Build a WhatsApp chatbot powered by Gemini with the Google GenAI SDK.',
  },
  'connect-to-deepseek': {
    title: 'Connect to DeepSeek',
    description:
      'Build a WhatsApp chatbot with DeepSeek using the OpenAI-compatible API.',
  },
  'connect-to-ollama': {
    title: 'Connect to Ollama',
    description:
      'Run a local AI model — no API key, no cloud costs, full privacy.',
  },
  'send-notifications': {
    title: 'Send Notifications',
    description:
      'Send alerts, reminders, and updates to WhatsApp from any Node.js app.',
  },
  'schedule-messages': {
    title: 'Schedule Messages',
    description:
      'Delayed sends, recurring reminders, and cron-based scheduling.',
  },
  'poll-bot': {
    title: 'Poll Bot',
    description:
      'Create polls, decrypt votes, tally results, and announce winners.',
  },
  'forward-messages': {
    title: 'Forward Messages',
    description:
      'Relay messages between chats — text, media, and any message type.',
  },
  'integrate-whaticket': {
    title: 'Whaticket Integration',
    description:
      'Replace whatsapp-web.js in Whaticket — drop Puppeteer, cut memory, get stability.',
  },
  'integrate-n8n': {
    title: 'n8n Integration',
    description:
      'Connect whatsmeow-node to n8n for WhatsApp workflow automation.',
  },
  'integrate-chatwoot': {
    title: 'Chatwoot Integration',
    description:
      'Use whatsmeow-node as a WhatsApp channel in Chatwoot — no Cloud API needed.',
  },
  'integrate-typebot': {
    title: 'Typebot Integration',
    description:
      'Connect Typebot flows to WhatsApp via whatsmeow-node — replace Evolution API.',
  },
};

export function RelatedGuides({slugs}: {slugs: string[]}) {
  const items = slugs
    .map((slug) => {
      const guide = GUIDES[slug];
      if (!guide) return null;
      return {slug, ...guide};
    })
    .filter(Boolean) as Array<{slug: string; title: string; description: string}>;

  if (items.length === 0) return null;

  return (
    <div className="related-guides">
      <GuideSection title="Related Guides">
        {items.map((item) => (
          <GuideCard
            key={item.slug}
            title={item.title}
            description={item.description}
            to={item.slug}
            image={`/img/guides/${item.slug}.png`}
          />
        ))}
      </GuideSection>
    </div>
  );
}
