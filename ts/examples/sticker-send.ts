/**
 * Upload and send a sticker message.
 *
 * Stickers are sent as raw protobuf messages with a `stickerMessage` field.
 * The flow is the same as sending an image:
 *   1. Upload the file with uploadMedia() (type "image")
 *   2. Send a raw message with the sticker proto shape
 *
 * Sticker requirements:
 *   - Must be a WebP image (512x512 px recommended)
 *   - Animated stickers also use WebP format
 *   - The mimetype should be "image/webp"
 *
 * Usage:
 *   npx tsx examples/sticker-send.ts <phone> <sticker.webp>
 *   e.g. npx tsx examples/sticker-send.ts 59897756343 ./sticker.webp
 */
import { createClient } from "../src/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const phone = process.argv[2];
const stickerPath = process.argv[3];
if (!phone || !stickerPath) {
  console.error("Usage: npx tsx examples/sticker-send.ts <phone> <sticker.webp>");
  console.error("  e.g. npx tsx examples/sticker-send.ts 59897756343 ./sticker.webp");
  process.exit(1);
}

const jid = `${phone.replace(/^\+/, "")}@s.whatsapp.net`;
const absoluteStickerPath = path.resolve(stickerPath);

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

  // Step 1: Upload the sticker file
  // We use mediaType "image" — whatsmeow handles encryption the same way.
  console.log(`Uploading sticker ${absoluteStickerPath}...`);
  const media = await client.uploadMedia(absoluteStickerPath, "image");
  console.log("Uploaded:", {
    url: media.URL.slice(0, 60) + "...",
    fileLength: media.fileLength,
  });

  // Step 2: Send the sticker using sendRawMessage
  // The stickerMessage shape follows the waE2E.Message protobuf schema.
  // Note: field names match proto casing (URL, fileSHA256, fileEncSHA256).
  //
  // Important: width and height are required for WhatsApp to render stickers
  // correctly. Without them, the sticker may display as a generic file.
  // Standard sticker size is 512x512.
  console.log(`Sending sticker to ${jid}...`);
  const resp = await client.sendRawMessage(jid, {
    stickerMessage: {
      URL: media.URL,
      directPath: media.directPath,
      mediaKey: media.mediaKey,
      fileEncSHA256: media.fileEncSHA256,
      fileSHA256: media.fileSHA256,
      fileLength: String(media.fileLength),
      mimetype: "image/webp",
      width: 512,
      height: 512,
      // Optional: set to true for animated stickers
      // isAnimated: true,
    },
  });
  console.log("Sent!", resp);

  await client.disconnect();
  client.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
