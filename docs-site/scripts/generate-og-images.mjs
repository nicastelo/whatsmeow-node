#!/usr/bin/env node

import satori from 'satori';
import sharp from 'sharp';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
} from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DOCS_ROOT = join(__dirname, '..');
const OUTPUT_ROOT = join(DOCS_ROOT, 'static/img/guides');

const LOCALES = [
  {
    code: 'en',
    dir: join(DOCS_ROOT, 'docs/guides'),
    output: OUTPUT_ROOT,
    tagline: 'WhatsApp for Node.js',
  },
  {
    code: 'pt-BR',
    dir: join(
      DOCS_ROOT,
      'i18n/pt-BR/docusaurus-plugin-content-docs/current/guides',
    ),
    output: join(OUTPUT_ROOT, 'pt-BR'),
    tagline: 'WhatsApp para Node.js',
  },
  {
    code: 'es',
    dir: join(
      DOCS_ROOT,
      'i18n/es/docusaurus-plugin-content-docs/current/guides',
    ),
    output: join(OUTPUT_ROOT, 'es'),
    tagline: 'WhatsApp para Node.js',
  },
];

// Translations for guides that don't have i18n .md files yet.
// The image generator uses these as fallbacks so every card gets a localized image.
const FALLBACK_TRANSLATIONS = {
  'pt-BR': {
    'whatsmeow-in-node': {
      title: 'Como Usar whatsmeow no Node.js',
      description: 'Instale o pacote npm, conecte ao WhatsApp e comece a usar whatsmeow no TypeScript — sem configurar Go.',
    },
    'send-messages-typescript': {
      title: 'Como Enviar Mensagens no WhatsApp pelo TypeScript',
      description: 'Texto, respostas, menções, mídia, enquetes e reações — tudo com tipagem segura.',
    },
    'automate-group-messages': {
      title: 'Como Automatizar Mensagens em Grupos no WhatsApp',
      description: 'Envie para grupos, mencione membros, transmita para vários grupos e gerencie participantes.',
    },
    'migrate-from-baileys': {
      title: 'Como Substituir o Baileys pelo whatsmeow-node',
      description: 'Comparação lado a lado de APIs e guia passo a passo para migrar do Baileys para whatsmeow-node.',
    },
    'migrate-from-whatsapp-web-js': {
      title: 'Como Substituir o whatsapp-web.js pelo whatsmeow-node',
      description: 'Remova o Puppeteer, reduza a memória de 500 MB para 20 MB e ganhe uma API async tipada.',
    },
  },
  es: {
    'whatsmeow-in-node': {
      title: 'Cómo Usar whatsmeow en Node.js',
      description: 'Instala el paquete npm, conéctate a WhatsApp y empieza a usar whatsmeow desde TypeScript — sin configurar Go.',
    },
    'send-messages-typescript': {
      title: 'Cómo Enviar Mensajes de WhatsApp desde TypeScript',
      description: 'Texto, respuestas, menciones, multimedia, encuestas y reacciones — todo con tipos seguros.',
    },
    'automate-group-messages': {
      title: 'Cómo Automatizar Mensajes de Grupo en WhatsApp',
      description: 'Envía a grupos, menciona miembros, transmite a múltiples grupos y gestiona participantes.',
    },
    'migrate-from-baileys': {
      title: 'Cómo Reemplazar Baileys con whatsmeow-node',
      description: 'Comparación lado a lado de APIs y guía paso a paso para migrar de Baileys a whatsmeow-node.',
    },
    'migrate-from-whatsapp-web-js': {
      title: 'Cómo Reemplazar whatsapp-web.js con whatsmeow-node',
      description: 'Elimina Puppeteer, reduce la memoria de 500 MB a 20 MB y obtén una API async tipada.',
    },
  },
};

const THEMES = {
  dark: {
    bg: '#0f1419',
    title: '#f9fafb',
    desc: '#9ca3af',
    accent: '#38b97e',
    muted: '#6b7280',
    footer: '#4b5563',
    suffix: '',
  },
  light: {
    bg: '#ffffff',
    title: '#111827',
    desc: '#4b5563',
    accent: '#25855a',
    muted: '#9ca3af',
    footer: '#9ca3af',
    suffix: '-light',
  },
};

const FONT_URLS = {
  regular:
    'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf',
  bold: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf',
};

async function loadFonts() {
  const [regular, bold] = await Promise.all([
    fetch(FONT_URLS.regular).then((r) => r.arrayBuffer()),
    fetch(FONT_URLS.bold).then((r) => r.arrayBuffer()),
  ]);
  return [
    { name: 'Inter', data: regular, weight: 400, style: 'normal' },
    { name: 'Inter', data: bold, weight: 700, style: 'normal' },
  ];
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  const titleMatch = match[1].match(/^title:\s*"(.+)"/m);
  const descMatch = match[1].match(/^description:\s*"(.+)"/m);
  if (titleMatch) fm.title = titleMatch[1];
  if (descMatch) fm.description = descMatch[1];
  return fm;
}

function createCard(title, description, tagline, theme) {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.bg,
        padding: '60px 70px',
        fontFamily: 'Inter',
      },
      children: [
        // Header: accent bar + project name
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              marginBottom: '40px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    width: '6px',
                    height: '36px',
                    backgroundColor: theme.accent,
                    borderRadius: '3px',
                    marginRight: '14px',
                  },
                },
              },
              {
                type: 'span',
                props: {
                  style: {
                    color: theme.muted,
                    fontSize: '26px',
                    fontWeight: 400,
                  },
                  children: 'whatsmeow-node',
                },
              },
            ],
          },
        },
        // Title
        {
          type: 'div',
          props: {
            style: {
              color: theme.title,
              fontSize: '50px',
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: '24px',
              maxWidth: '1000px',
            },
            children: title,
          },
        },
        // Description
        {
          type: 'div',
          props: {
            style: {
              color: theme.desc,
              fontSize: '24px',
              fontWeight: 400,
              lineHeight: 1.5,
              maxWidth: '900px',
              flex: 1,
            },
            children: description,
          },
        },
        // Footer
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
            children: [
              {
                type: 'span',
                props: {
                  style: {
                    color: theme.accent,
                    fontSize: '20px',
                    fontWeight: 400,
                  },
                  children: tagline,
                },
              },
              {
                type: 'span',
                props: {
                  style: {
                    color: theme.footer,
                    fontSize: '18px',
                    fontWeight: 400,
                  },
                  children: 'nicastelo.github.io/whatsmeow-node',
                },
              },
            ],
          },
        },
      ],
    },
  };
}

async function main() {
  console.log('Loading fonts...');
  const fonts = await loadFonts();

  for (const locale of LOCALES) {
    if (!existsSync(locale.dir)) {
      console.log(`\nSkipping ${locale.code} — directory not found`);
      continue;
    }

    mkdirSync(locale.output, { recursive: true });

    // Collect guides from .md files
    const guides = [];
    const files = readdirSync(locale.dir).filter((f) => f.endsWith('.md'));
    const coveredSlugs = new Set();

    for (const file of files) {
      const content = readFileSync(join(locale.dir, file), 'utf-8');
      const { title, description } = extractFrontmatter(content);
      if (!title) continue;
      const slug = basename(file, '.md');
      guides.push({ slug, title, description: description ?? '' });
      coveredSlugs.add(slug);
    }

    // Add fallback translations for guides without .md files
    const fallbacks = FALLBACK_TRANSLATIONS[locale.code] ?? {};
    for (const [slug, data] of Object.entries(fallbacks)) {
      if (!coveredSlugs.has(slug)) {
        guides.push({ slug, title: data.title, description: data.description });
      }
    }

    if (guides.length === 0) {
      console.log(`\n${locale.code}: no guides, skipping`);
      continue;
    }

    console.log(`\n${locale.code}: ${guides.length} guides`);

    for (const { slug, title, description } of guides) {
      for (const [, theme] of Object.entries(THEMES)) {
        const card = createCard(title, description, locale.tagline, theme);
        const svg = await satori(card, { width: 1200, height: 630, fonts });
        const png = await sharp(Buffer.from(svg)).png().toBuffer();
        const filename = `${slug}${theme.suffix}.png`;

        writeFileSync(join(locale.output, filename), png);
        console.log(`  ${filename} (${(png.length / 1024).toFixed(0)} KB)`);
      }
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
