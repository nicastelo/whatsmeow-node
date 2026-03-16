/**
 * A full-featured echo bot — great starting point for building WhatsApp bots.
 *
 * Features demonstrated:
 *   - Receiving and replying to text messages
 *   - Downloading and re-sending received images
 *   - Sending read receipts (blue ticks)
 *   - Showing typing indicators before replying
 *   - Handling both DMs and group messages
 *   - Graceful shutdown
 *
 * The bot echoes text messages back, re-sends images with a caption,
 * and responds to a few commands:
 *   !ping     — replies with "pong"
 *   !info     — shows message metadata
 *   !whoami   — shows your JID and push name
 *   !groups   — lists all groups the bot is in
 *
 * Usage:
 *   npx tsx examples/echo-bot.ts
 *
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

let myJid = "";

// ── Message handler ─────────────────────────────────

client.on("message", async ({ info, message }) => {
  // Skip our own messages to avoid echo loops
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  const hasImage = !!message.imageMessage;

  // Log every incoming message
  const prefix = info.isGroup ? `[${info.chat}]` : "[dm]";
  if (text) {
    console.log(`${prefix} ${info.pushName}: ${text}`);
  } else if (hasImage) {
    console.log(`${prefix} ${info.pushName}: (image)`);
  } else {
    return; // Ignore other message types
  }

  // Mark the message as read (sends blue ticks)
  await client.markRead([info.id], info.chat, info.sender);

  // Show typing indicator for a moment
  await client.sendChatPresence(info.chat, "composing");
  await new Promise((resolve) => setTimeout(resolve, 500));

  // ── Handle commands ──────────────────────────────

  if (text?.toLowerCase() === "!ping") {
    await client.sendMessage(info.chat, { conversation: "pong 🏓" });
    return;
  }

  if (text?.toLowerCase() === "!info") {
    const details = [
      `Message ID: ${info.id}`,
      `Chat: ${info.chat}`,
      `Sender: ${info.sender}`,
      `Push Name: ${info.pushName}`,
      `Is Group: ${info.isGroup}`,
      `Timestamp: ${new Date(info.timestamp * 1000).toISOString()}`,
    ].join("\n");
    await client.sendMessage(info.chat, { conversation: details });
    return;
  }

  if (text?.toLowerCase() === "!whoami") {
    await client.sendMessage(info.chat, {
      conversation: `You are ${info.pushName}\nJID: ${info.sender}`,
    });
    return;
  }

  if (text?.toLowerCase() === "!groups") {
    const groups = await client.getJoinedGroups();
    if (groups.length === 0) {
      await client.sendMessage(info.chat, { conversation: "Not in any groups." });
    } else {
      const list = groups.map((g) => `• ${g.name} (${g.participants.length} members)`).join("\n");
      await client.sendMessage(info.chat, {
        conversation: `Groups (${groups.length}):\n${list}`,
      });
    }
    return;
  }

  // ── Echo image back ──────────────────────────────

  if (hasImage) {
    try {
      // Download the received image
      const filePath = await client.downloadAny(message);

      // Re-upload and send it back with a caption
      const media = await client.uploadMedia(filePath, "image");
      await client.sendRawMessage(info.chat, {
        imageMessage: {
          URL: media.URL,
          directPath: media.directPath,
          mediaKey: media.mediaKey,
          fileEncSHA256: media.fileEncSHA256,
          fileSHA256: media.fileSHA256,
          fileLength: String(media.fileLength),
          mimetype: "image/png",
          caption: `Echo from ${info.pushName}!`,
        },
      });
      console.log("  → Echoed image back");
    } catch (err) {
      console.error("  → Failed to echo image:", err);
      await client.sendMessage(info.chat, {
        conversation: "Sorry, I couldn't process that image.",
      });
    }
    return;
  }

  // ── Echo text back ───────────────────────────────

  if (text) {
    // Reply with a quote of the original message
    await client.sendRawMessage(info.chat, {
      extendedTextMessage: {
        text: text,
        contextInfo: {
          stanzaId: info.id,
          participant: info.sender,
          quotedMessage: { conversation: text },
        },
      },
    });
  }
});

// ── Call rejection ──────────────────────────────────

client.on("call:offer", async ({ from, callId }) => {
  console.log(`[call] Rejecting call from ${from}`);
  await client.rejectCall(from, callId);
});

// ── Startup ─────────────────────────────────────────

async function main() {
  const initResult = await client.init();
  if (!initResult.jid) {
    console.error("Not paired! Run: npx tsx examples/pair.ts");
    process.exit(1);
  }
  myJid = initResult.jid;

  console.log(`Paired as ${myJid}, connecting...`);
  await client.connect();
  await client.sendPresence("available");
  console.log("Bot is online! Commands: !ping, !info, !whoami, !groups");
  console.log("Press Ctrl+C to exit.\n");

  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    await client.sendPresence("unavailable");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
