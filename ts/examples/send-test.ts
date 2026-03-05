import { createClient } from "../dist/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const phone = process.argv[2];
if (!phone) {
  console.error("Usage: node --experimental-strip-types examples/send-test.ts <phone>");
  console.error("  e.g. node --experimental-strip-types examples/send-test.ts 59897756343");
  process.exit(1);
}

const jid = `${phone.replace(/^\+/, "")}@s.whatsapp.net`;

const client = createClient({
  store: `file:${storePath}`,
  binaryPath,
});

client.on("log", (log) => {
  if (log.level === "info") console.log(`[go] ${log.msg}`);
});

client.on("connected", ({ jid }) => {
  console.log(`Connected as ${jid}`);
});

client.on("error", (err) => {
  console.error("Error:", err);
});

async function main() {
  console.log("Connecting...");
  const result = await client.connect();
  if (!result.jid) {
    console.error("Not paired! Run the pair script first.");
    process.exit(1);
  }
  console.log(`Connected as ${result.jid}`);

  // Wait for WhatsApp connection to be fully established
  console.log("Waiting for connection...");
  await new Promise<void>((resolve) => {
    const status = async () => {
      const s = await client.status();
      if (s.loggedIn) {
        resolve();
      } else {
        setTimeout(status, 500);
      }
    };
    status();
  });

  console.log(`Sending message to ${jid}...`);
  const resp = await client.sendMessage(jid, {
    conversation: "Hello from whatsmeow-node! 🏎️",
  });
  console.log("Sent!", resp);

  console.log("Sending a second message...");
  const resp2 = await client.sendMessage(jid, {
    conversation: "This is a test of the TypeScript → Go → WhatsApp pipeline.",
  });
  console.log("Sent!", resp2);

  await client.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
