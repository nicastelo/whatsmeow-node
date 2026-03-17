/**
 * Send video, audio, and document messages.
 *
 * Demonstrates the upload + send flow for every media type:
 *   - Video:    uploadMedia(path, "video")    → videoMessage
 *   - Audio:    uploadMedia(path, "audio")    → audioMessage
 *   - Document: uploadMedia(path, "document") → documentMessage
 *
 * Each media type uses the same two-step pattern:
 *   1. uploadMedia() encrypts and uploads the file, returning metadata
 *   2. sendRawMessage() sends the proto message with that metadata
 *
 * The proto field names must match exact protobuf casing:
 *   URL, fileSHA256, fileEncSHA256 (NOT fileSha256)
 *
 * Usage:
 *   npx tsx examples/media-send-all.ts <phone> <type> <file-path>
 *   e.g. npx tsx examples/media-send-all.ts 59897756343 video ./clip.mp4
 *   e.g. npx tsx examples/media-send-all.ts 59897756343 audio ./voice.ogg
 *   e.g. npx tsx examples/media-send-all.ts 59897756343 document ./report.pdf
 */
import { createClient, type MediaType } from "../src/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const phone = process.argv[2];
const mediaTypeArg = process.argv[3];
const filePath = process.argv[4];

const validTypes = ["video", "audio", "document"];
if (!phone || !mediaTypeArg || !filePath || !validTypes.includes(mediaTypeArg)) {
  console.error("Usage: npx tsx examples/media-send-all.ts <phone> <type> <file-path>");
  console.error("  type: video | audio | document");
  console.error("");
  console.error("  e.g. npx tsx examples/media-send-all.ts 59897756343 video ./clip.mp4");
  console.error("  e.g. npx tsx examples/media-send-all.ts 59897756343 audio ./voice.ogg");
  console.error("  e.g. npx tsx examples/media-send-all.ts 59897756343 document ./report.pdf");
  process.exit(1);
}

const mediaType = mediaTypeArg as MediaType;
const jid = `${phone.replace(/^\+/, "")}@s.whatsapp.net`;
const absolutePath = path.resolve(filePath);

// Common mimetypes for reference — adjust to match your actual file.
const MIMETYPES: Record<string, string> = {
  // Video
  ".mp4": "video/mp4",
  ".avi": "video/avi",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  // Audio
  ".ogg": "audio/ogg; codecs=opus",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  // Document
  ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".zip": "application/zip",
  ".txt": "text/plain",
};

const ext = path.extname(filePath).toLowerCase();
const mimetype = MIMETYPES[ext] ?? "application/octet-stream";
const fileName = path.basename(filePath);

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

  // Step 1: Upload
  console.log(`\nUploading ${fileName} as ${mediaType}...`);
  const media = await client.uploadMedia(absolutePath, mediaType);
  console.log("Uploaded:", {
    url: media.URL.slice(0, 60) + "...",
    fileLength: media.fileLength,
  });

  // Step 2: Build and send the proto message
  // Each media type uses a different proto field with slightly different shapes.
  console.log(`Sending ${mediaType} to ${jid}...`);

  // Shared fields used by all media types
  const sharedFields = {
    URL: media.URL,
    directPath: media.directPath,
    mediaKey: media.mediaKey,
    fileEncSHA256: media.fileEncSHA256,
    fileSHA256: media.fileSHA256,
    fileLength: String(media.fileLength),
    mimetype,
  };

  let message: Record<string, unknown>;

  switch (mediaType) {
    // ── Video ───────────────────────────────────────
    case "video":
      message = {
        videoMessage: {
          ...sharedFields,
          caption: "Sent from whatsmeow-node",
          // Optional video-specific fields:
          // seconds: 30,                    // duration in seconds
          // gifPlayback: true,              // play as GIF (loops, no audio)
          // width: 1920,
          // height: 1080,
          // gifAttribution: 1,              // 0=none, 1=giphy, 2=tenor
        },
      };
      break;

    // ── Audio ───────────────────────────────────────
    case "audio":
      message = {
        audioMessage: {
          ...sharedFields,
          // Set ptt=true to send as a voice note (push-to-talk).
          // Voice notes appear with the blue microphone icon and play inline.
          // Set ptt=false (or omit) to send as a regular audio file.
          ptt: true,
          // Optional audio-specific fields:
          // seconds: 15,                    // duration in seconds
        },
      };
      break;

    // ── Document ────────────────────────────────────
    case "document":
      message = {
        documentMessage: {
          ...sharedFields,
          // fileName is displayed in the chat as the document title.
          fileName,
          // Optional: a short caption shown below the document
          caption: "Sent from whatsmeow-node",
          // Optional: page count for PDFs
          // pageCount: 42,
        },
      };
      break;

    default:
      throw new Error(`Unknown media type: ${mediaType}`);
  }

  const resp = await client.sendRawMessage(jid, message);
  console.log("Sent!", resp);

  await client.disconnect();
  client.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
