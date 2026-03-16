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
      description="Crie integrações com o WhatsApp em TypeScript usando whatsmeow-node — powered by the most battle-tested Go WhatsApp library. Sem navegador."
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
          Crie integrações com o WhatsApp em TypeScript. Envie mensagens, gerencie
          grupos, manipule mídia, automatize fluxos de trabalho — com uma API tipada e{' '}
          <code>npm&nbsp;install</code>.
        </p>

        <pre style={{padding: '1rem', borderRadius: '8px', margin: '1.5rem 0', overflowX: 'auto', maxWidth: 'calc(100vw - 3rem)'}}>
          <code>npm install @whatsmeow-node/whatsmeow-node</code>
        </pre>

        <div style={{display: 'flex', gap: '0.75rem', margin: '2rem 0', flexWrap: 'wrap'}}>
          <Link className="button button--primary button--lg" to="/docs/getting-started">
            Primeiros Passos
          </Link>
          <Link className="button button--outline button--lg" to="/docs/api/overview">
            Referência da API
          </Link>
        </div>

        <CodeBlock language="typescript" title="5 linhas para conectar">
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
            title="Upstream testado em batalha"
            description="Powered by whatsmeow, a biblioteca Go por trás do Mautrix WhatsApp bridge — rodando 24/7 para milhares de usuários."
          />
          <Feature
            title="Leve"
            description="~10-20 MB de memória. Sem navegador headless, sem Puppeteer, sem reimplementação de WebSocket. Apenas um único binário."
          />
          <Feature
            title="Totalmente tipado"
            description="100 de 126 métodos do upstream com wrapper, eventos tipados, erros tipados. Mensagens, grupos, newsletters, mídia, enquetes, privacidade, criptografia e mais."
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
            Este projeto não é afiliado, associado, autorizado, endossado ou de qualquer forma
            oficialmente conectado ao WhatsApp ou a qualquer de suas subsidiárias ou afiliadas. O
            site oficial do WhatsApp pode ser encontrado em{' '}
            <a href="https://whatsapp.com">whatsapp.com</a>. "WhatsApp" bem como nomes, marcas,
            emblemas e imagens relacionados são marcas registradas de seus respectivos proprietários.
            O uso desta biblioteca pode violar os Termos de Serviço do WhatsApp. Use por sua conta
            e risco. Não use para spam, stalkerware ou envio de mensagens em massa não solicitadas.
          </p>
        </div>
      </main>
    </Layout>
  );
}
