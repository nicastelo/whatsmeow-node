/**
 * Upload and send an image message. Requires an already-paired session.db.
 *
 * Usage:
 *   npx tsx examples/media-send.ts <phone> <image-path>
 *   e.g. npx tsx examples/media-send.ts 59897756343 ./photo.jpg
 */
import { createClient } from "../src/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const phone = process.argv[2];
const imagePath = process.argv[3];
if (!phone || !imagePath) {
  console.error("Usage: npx tsx examples/media-send.ts <phone> <image-path>");
  console.error("  e.g. npx tsx examples/media-send.ts 59897756343 ./photo.jpg");
  process.exit(1);
}

const jid = `${phone.replace(/^\+/, "")}@s.whatsapp.net`;
const absoluteImagePath = path.resolve(imagePath);

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

  // Step 1: Upload the image — returns encrypted media metadata
  console.log(`Uploading ${absoluteImagePath}...`);
  const media = await client.uploadMedia(absoluteImagePath, "image");
  console.log("Uploaded:", {
    url: media.URL.slice(0, 60) + "...",
    fileLength: media.fileLength,
  });

  // Step 2: Send the image message using sendRawMessage
  // The message shape matches the waE2E.Message protobuf schema.
  // Upload response field names now match proto (URL, fileSHA256, fileEncSHA256).
  console.log(`Sending image to ${jid}...`);
  const resp = await client.sendRawMessage(jid, {
    imageMessage: {
      URL: media.URL,
      directPath: media.directPath,
      mediaKey: media.mediaKey,
      fileEncSHA256: media.fileEncSHA256,
      fileSHA256: media.fileSHA256,
      fileLength: String(media.fileLength),
      mimetype: "image/png",
      caption: "Sent from whatsmeow-node",
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
