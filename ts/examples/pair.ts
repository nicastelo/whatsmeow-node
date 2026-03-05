import { createClient } from "../dist/index.js";
import qrcode from "qrcode-terminal";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const client = createClient({
  store: storePath,
  binaryPath,
});

client.on("log", (log) => {
  if (log.level !== "info" || !log.msg) return;
  console.log(`[go] ${log.msg}`);
});

client.on("qr", ({ code }) => {
  console.log("\nScan this QR code in WhatsApp → Linked Devices:\n");
  qrcode.generate(code, { small: true });
});

client.on("connected", ({ jid }) => {
  console.log(`\nPaired successfully! JID: ${jid}`);
  console.log("Waiting 15s for initial sync to finish...");
  setTimeout(async () => {
    console.log("Sync wait done. Disconnecting.");
    await client.disconnect();
    client.close();
    process.exit(0);
  }, 15000);
});

client.on("error", (err) => {
  console.error("Error:", err);
});

async function main() {
  console.log("Connecting...");
  const result = await client.init();

  if (result.jid) {
    // Already paired — just connect
    console.log(`Already paired! JID: ${result.jid}`);
    await client.connect();
    await client.disconnect();
    client.close();
    process.exit(0);
  }

  // Not paired — set up QR channel, then connect
  await client.getQRChannel();
  await client.connect();
  console.log("Waiting for QR code...");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
