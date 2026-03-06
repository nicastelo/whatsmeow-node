/**
 * Send a test message. Requires an already-paired session.db.
 *
 * Usage:
 *   npx tsx examples/send-test.ts <phone>
 *   e.g. npx tsx examples/send-test.ts 59897756343
 */
import { createClient } from "../src/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const phone = process.argv[2];
if (!phone) {
  console.error("Usage: npx tsx examples/send-test.ts <phone>");
  console.error("  e.g. npx tsx examples/send-test.ts 59897756343");
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

client.on("error", (err) => {
  console.error("Error:", err);
});

async function main() {
  const initResult = await client.init();
  if (!initResult.jid) {
    console.error("Not paired! Run: npx tsx examples/pair.ts");
    process.exit(1);
  }
  console.log(`Paired as ${initResult.jid}`);

  // Wait for the connected event before sending
  const connected = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Connection timeout (15s)")), 15_000);
    client.once("connected", ({ jid }) => {
      clearTimeout(timeout);
      console.log(`Connected as ${jid}`);
      resolve();
    });
  });

  await client.connect();
  await connected;

  console.log(`Sending message to ${jid}...`);
  const resp = await client.sendMessage(jid, {
    conversation: "Hello from whatsmeow-node!",
  });
  console.log("Sent!", resp);

  console.log("Sending a second message...");
  const resp2 = await client.sendMessage(jid, {
    conversation: "This is a test of the TypeScript > Go > WhatsApp pipeline.",
  });
  console.log("Sent!", resp2);

  await client.disconnect();
  client.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
