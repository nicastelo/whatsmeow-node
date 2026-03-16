import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';

const quickStart = `import { createClient } from "@whatsmeow-node/whatsmeow-node";

const client = createClient({ store: "session.db" });

client.on("message", ({ info, message }) => {
  console.log(\`\${info.pushName}: \${message.conversation ?? "(media or other)"}\`);
});

async function main() {
  const { jid } = await client.init();
  if (!jid) await client.getQRChannel();
  await client.connect();
}
main();`;

function Feature({title, description}: {title: string; description: string}) {
  return (
    <div style={{flex: 1, minWidth: 220}}>
      <h2 style={{marginBottom: '0.5rem', fontSize: '1.25rem'}}>{title}</h2>
      <p style={{color: 'var(--ifm-color-emphasis-700)', margin: 0}}>{description}</p>
    </div>
  );
}

export default function Home() {
  return (
    <Layout
      title="WhatsApp for Node.js"
      description="Build WhatsApp integrations in TypeScript with whatsmeow-node — powered by the most battle-tested Go WhatsApp library. No browser needed."
    >
      <main style={{maxWidth: 800, margin: '0 auto', padding: '4rem 1.5rem'}}>
        <img
          src={useBaseUrl('/img/image.png')}
          alt="whatsmeow-node logo"
          width={120}
          height={120}
          style={{width: 120, height: 120, marginBottom: '1.5rem'}}
        />
        <Heading as="h1" style={{fontSize: '2.5rem'}}>
          WhatsApp for Node.js
        </Heading>
        <p style={{fontSize: '1.25rem', color: 'var(--ifm-color-emphasis-700)', maxWidth: 600}}>
          Build WhatsApp integrations in TypeScript. Send messages, manage
          groups, handle media, automate workflows — with a typed API and{' '}
          <code>npm&nbsp;install</code>.
        </p>

        <pre style={{padding: '1rem', borderRadius: '8px', margin: '1.5rem 0', overflowX: 'auto', maxWidth: 'calc(100vw - 3rem)'}}>
          <code>npm install @whatsmeow-node/whatsmeow-node</code>
        </pre>

        <div style={{display: 'flex', gap: '0.75rem', margin: '2rem 0', flexWrap: 'wrap'}}>
          <Link className="button button--primary button--lg" to="/docs/getting-started">
            Get Started
          </Link>
          <Link className="button button--outline button--lg" to="/docs/api/overview">
            API Reference
          </Link>
        </div>

        <CodeBlock language="typescript" title="5 lines to connect">
          {quickStart}
        </CodeBlock>

        <div
          style={{
            display: 'flex',
            gap: '2rem',
            flexWrap: 'wrap',
            margin: '3rem 0',
          }}
        >
          <Feature
            title="Battle-tested upstream"
            description="Powered by whatsmeow, the Go library behind the Mautrix WhatsApp bridge — running 24/7 for thousands of users."
          />
          <Feature
            title="Lightweight"
            description="~10-20 MB memory. No headless browser, no Puppeteer, no WebSocket reimplementation. Just a single binary."
          />
          <Feature
            title="Fully typed"
            description="100 of 126 upstream methods wrapped, typed events, typed errors. Messages, groups, newsletters, media, polls, privacy, encryption, and more."
          />
        </div>

        <div
          style={{
            marginTop: '2rem',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid var(--ifm-color-warning-dark)',
            background: 'var(--ifm-color-warning-contrast-background)',
          }}
        >
          <strong>Disclaimer</strong>
          <p style={{margin: '0.5rem 0 0', fontSize: '0.9rem'}}>
            This project is not affiliated, associated, authorized, endorsed by, or in any way
            officially connected with WhatsApp or any of its subsidiaries or affiliates. The
            official WhatsApp website can be found at{' '}
            <a href="https://whatsapp.com">whatsapp.com</a>. "WhatsApp" as well as related
            names, marks, emblems and images are registered trademarks of their respective
            owners. Use of this library may violate WhatsApp's Terms of Service. Use at your
            own risk. Do not use this for spamming, stalkerware, or bulk unsolicited messaging.
          </p>
        </div>
      </main>
    </Layout>
  );
}
