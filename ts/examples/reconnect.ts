/**
 * Resilient connection example. Stays connected and logs all events.
 * Demonstrates handling disconnections, session revocations, and errors.
 *
 * Usage:
 *   npx tsx examples/reconnect.ts
 *
 * Press Ctrl+C to exit.
 */
import { createClient, WhatsmeowError } from "../src/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const client = createClient({
  store: `file:${storePath}`,
  binaryPath,
});

// ── Connection events ────────────────────────────────

client.on("connected", ({ jid }) => {
  console.log(`[connected] ${jid}`);
});

client.on("disconnected", () => {
  // Auto-reconnect is built-in — whatsmeow handles this internally.
  // No manual reconnection needed.
  console.log("[disconnected] Waiting for auto-reconnect...");
});

client.on("logged_out", ({ reason }) => {
  // Session was revoked (user unlinked device from WhatsApp).
  // The only recovery is to re-pair.
  console.error(`[logged_out] ${reason} — must re-pair. Exiting.`);
  client.close();
  process.exit(1);
});

client.on("stream_error", ({ code }) => {
  console.warn(`[stream_error] code=${code}`);
});

client.on("keep_alive_timeout", ({ errorCount }) => {
  console.warn(`[keep_alive_timeout] errors=${errorCount}`);
});

client.on("keep_alive_restored", () => {
  console.log("[keep_alive_restored]");
});

// ── Message events ───────────────────────────────────

client.on("message", ({ info, message }) => {
  const ext = message.extendedTextMessage as { text?: string } | undefined;
  const text = (message.conversation as string) ?? ext?.text ?? "(media/other)";
  console.log(`[message] ${info.pushName} (${info.sender}): ${text}`);
});

// ── Error handling ───────────────────────────────────

client.on("error", (err) => {
  if (err instanceof WhatsmeowError) {
    console.error(`[error] [${err.code}] ${err.message}`);
  } else {
    console.error("[error]", err);
  }
});

// ── Startup ──────────────────────────────────────────

async function main() {
  const { jid } = await client.init();

  if (!jid) {
    console.error("Not paired! Run: npx tsx examples/pair.ts");
    process.exit(1);
  }

  console.log(`Paired as ${jid}, connecting...`);
  await client.connect();

  // Keep the process alive
  process.on("SIGINT", async () => {
    console.log("\nDisconnecting...");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
