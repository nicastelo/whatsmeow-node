import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

export default function Home(): JSX.Element {
  return (
    <Layout title="Docs" description="whatsmeow-node documentation">
      <main style={{maxWidth: 720, margin: '0 auto', padding: '4rem 1rem'}}>
        <Heading as="h1">whatsmeow-node</Heading>
        <p style={{fontSize: '1.2rem', color: 'var(--ifm-color-emphasis-700)'}}>
          TypeScript/Node.js bindings for{' '}
          <a href="https://github.com/tulir/whatsmeow">whatsmeow</a>, the Go
          WhatsApp Web multidevice API library.
        </p>
        <p>
          No CGo, no native addons, no WebSocket reimplementation — just a
          subprocess communicating over stdin/stdout JSON-line IPC.
        </p>
        <div style={{display: 'flex', gap: '0.75rem', marginTop: '2rem'}}>
          <Link className="button button--primary button--lg" to="/docs/intro">
            Get Started
          </Link>
          <Link
            className="button button--outline button--lg"
            to="/docs/api/overview"
          >
            API Reference
          </Link>
        </div>
        <pre style={{marginTop: '2.5rem', padding: '1rem', borderRadius: '8px'}}>
          <code>npm install @whatsmeow-node/whatsmeow-node</code>
        </pre>
      </main>
    </Layout>
  );
}
