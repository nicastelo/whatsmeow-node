/**
 * Listen for incoming stickers and download them to disk.
 *
 * Uses downloadAny() which auto-detects the media type from the message.
 * The file is saved to a temp path and the location is printed.
 *
 * This pattern works for any media type (images, videos, audio, documents).
 * Just check the appropriate message field:
 *   - message.imageMessage
 *   - message.videoMessage
 *   - message.audioMessage
 *   - message.documentMessage
 *   - message.stickerMessage
 *
 * Usage:
 *   npx tsx examples/sticker-download.ts
 *
 * Then send a sticker to the paired WhatsApp account.
 * Press Ctrl+C to exit.
 */
import { createClient } from "../src/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const client = createClient({
  store: `file:${storePath}`,
  binaryPath,
});

client.on("error", (err) => {
  console.error("Error:", err);
});

// ── Handle incoming messages ────────────────────────

client.on("message", async ({ info, message }) => {
  // Check if the message contains a sticker
  const sticker = message.stickerMessage as
    | { URL?: string; mimetype?: string; isAnimated?: boolean }
    | undefined;

  if (!sticker) return; // Not a sticker — skip

  console.log(`\n[sticker] From ${info.pushName} (${info.sender})`);
  console.log(`  Animated: ${sticker.isAnimated ?? false}`);
  console.log(`  Mimetype: ${sticker.mimetype ?? "unknown"}`);

  try {
    // downloadAny() detects the media type from the message automatically.
    // It downloads to a temp file and returns the file path.
    const filePath = await client.downloadAny(message);
    console.log(`  Downloaded to: ${filePath}`);
  } catch (err) {
    console.error(`  Download failed:`, err);
  }
});

// Also show text messages so you know it's working
client.on("message", ({ info, message }) => {
  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (text) {
    console.log(`[text] ${info.pushName}: ${text}`);
  }
});

// ── Startup ─────────────────────────────────────────

async function main() {
  const { jid } = await client.init();
  if (!jid) {
    console.error("Not paired! Run: npx tsx examples/pair.ts");
    process.exit(1);
  }

  console.log(`Paired as ${jid}, connecting...`);
  await client.connect();
  console.log("Listening for stickers... (send a sticker to this account)");
  console.log("Press Ctrl+C to exit.\n");

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
