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
      title="WhatsApp para Node.js"
      description="Crea integraciones de WhatsApp en TypeScript con whatsmeow-node — powered by the most battle-tested Go WhatsApp library. Sin navegador."
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
          WhatsApp para Node.js
        </Heading>
        <p style={{fontSize: '1.25rem', color: 'var(--ifm-color-emphasis-700)', maxWidth: 600}}>
          Crea integraciones de WhatsApp en TypeScript. Envía mensajes, gestiona
          grupos, maneja archivos multimedia, automatiza flujos de trabajo — con una API tipada y{' '}
          <code>npm&nbsp;install</code>.
        </p>

        <pre style={{padding: '1rem', borderRadius: '8px', margin: '1.5rem 0', overflowX: 'auto', maxWidth: 'calc(100vw - 3rem)'}}>
          <code>npm install @whatsmeow-node/whatsmeow-node</code>
        </pre>

        <div style={{display: 'flex', gap: '0.75rem', margin: '2rem 0', flexWrap: 'wrap'}}>
          <Link className="button button--primary button--lg" to="/docs/getting-started">
            Primeros Pasos
          </Link>
          <Link className="button button--outline button--lg" to="/docs/api/overview">
            Referencia de la API
          </Link>
        </div>

        <CodeBlock language="typescript" title="5 líneas para conectar">
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
            title="Upstream probado en batalla"
            description="Powered by whatsmeow, la biblioteca Go detrás del Mautrix WhatsApp bridge — funcionando 24/7 para miles de usuarios."
          />
          <Feature
            title="Ligero"
            description="~10-20 MB de memoria. Sin navegador headless, sin Puppeteer, sin reimplementación de WebSocket. Solo un único binario."
          />
          <Feature
            title="Completamente tipado"
            description="100 de 126 métodos del upstream con wrapper, eventos tipados, errores tipados. Mensajes, grupos, newsletters, multimedia, encuestas, privacidad, cifrado y más."
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
          <strong>Aviso Legal</strong>
          <p style={{margin: '0.5rem 0 0', fontSize: '0.9rem'}}>
            Este proyecto no está afiliado, asociado, autorizado, respaldado ni de ninguna manera
            conectado oficialmente con WhatsApp o cualquiera de sus subsidiarias o afiliadas. El
            sitio web oficial de WhatsApp se encuentra en{' '}
            <a href="https://whatsapp.com">whatsapp.com</a>. "WhatsApp" así como nombres, marcas,
            emblemas e imágenes relacionados son marcas registradas de sus respectivos propietarios.
            El uso de esta biblioteca puede violar los Términos de Servicio de WhatsApp. Úsalo bajo
            tu propio riesgo. No lo uses para spam, stalkerware ni envío masivo de mensajes no
            solicitados.
          </p>
        </div>
      </main>
    </Layout>
  );
}
