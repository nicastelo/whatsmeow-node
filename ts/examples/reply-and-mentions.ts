/**
 * Reply to messages (quoted) and send @mentions.
 *
 * Demonstrates three messaging patterns:
 *   1. Quoting/replying to a specific message
 *   2. @mentioning users in a message
 *   3. Combining both — reply with mentions
 *
 * Both features use extendedTextMessage with contextInfo.
 * Quoting requires the original message's stanzaId + participant.
 * Mentions require listing mentioned JIDs in the mentionedJid array.
 *
 * Usage:
 *   npx tsx examples/reply-and-mentions.ts
 *
 * Then send a message to the paired account — it will reply with a quote.
 * In a group, it will also demonstrate @mentions.
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
  // Skip messages sent by us
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;

  if (!text) return; // Only handle text messages in this example

  console.log(`[${info.isGroup ? "group" : "dm"}] ${info.pushName}: ${text}`);

  // ── Pattern 1: Reply with a quote ────────────────
  //
  // To quote a message, set contextInfo.stanzaId to the original message ID
  // and contextInfo.participant to the original sender's JID.
  // The quotedMessage field contains the original message content for display.

  if (text.toLowerCase() === "!quote") {
    await client.sendRawMessage(info.chat, {
      extendedTextMessage: {
        text: "This is a reply to your message!",
        contextInfo: {
          stanzaId: info.id, // ID of the message we're replying to
          participant: info.sender, // Who sent the original message
          quotedMessage: {
            // The original message — shown in the quote bubble
            conversation: text,
          },
        },
      },
    });
    console.log("  → Sent quoted reply");
    return;
  }

  // ── Pattern 2: @mention users ────────────────────
  //
  // To @mention someone, include their JID in the mentionedJid array
  // inside contextInfo, and put @<number> in the text body.
  // WhatsApp renders the mention as a clickable name.

  if (text.toLowerCase() === "!mention" && info.isGroup) {
    await client.sendRawMessage(info.chat, {
      extendedTextMessage: {
        // Use @<number> in the text — WhatsApp replaces it with the contact name
        text: `Hey @${info.sender.split("@")[0]}, you were mentioned!`,
        contextInfo: {
          mentionedJid: [info.sender], // Array of JIDs being mentioned
        },
      },
    });
    console.log("  → Sent mention");
    return;
  }

  // ── Pattern 3: Reply with mentions (combined) ────
  //
  // You can combine quoting and mentioning in a single message.

  if (text.toLowerCase() === "!both" && info.isGroup) {
    await client.sendRawMessage(info.chat, {
      extendedTextMessage: {
        text: `Replying to @${info.sender.split("@")[0]} with a quote!`,
        contextInfo: {
          stanzaId: info.id,
          participant: info.sender,
          quotedMessage: { conversation: text },
          mentionedJid: [info.sender],
        },
      },
    });
    console.log("  → Sent quoted reply with mention");
    return;
  }

  // ── Pattern 4: Mention multiple users ────────────
  //
  // You can mention multiple users in a single message.

  if (text.toLowerCase() === "!mentionall" && info.isGroup) {
    try {
      const group = await client.getGroupInfo(info.chat);
      const participantJids = group.participants.map((p) => p.jid);

      // Build the text with @<number> for each participant
      const mentions = participantJids.map((jid) => `@${jid.split("@")[0]}`).join(" ");

      await client.sendRawMessage(info.chat, {
        extendedTextMessage: {
          text: `Mentioning everyone: ${mentions}`,
          contextInfo: {
            mentionedJid: participantJids,
          },
        },
      });
      console.log(`  → Mentioned ${participantJids.length} participants`);
    } catch (err) {
      console.error("  → Failed to get group info:", err);
    }
    return;
  }

  // Default: show available commands
  if (text.startsWith("!")) {
    const commands = [
      "!quote   — Reply to your message with a quote",
      "!mention — @mention you (groups only)",
      "!both    — Quote + mention combined (groups only)",
      "!mentionall — Mention all group members (groups only)",
    ];
    await client.sendMessage(info.chat, {
      conversation: `Available commands:\n${commands.join("\n")}`,
    });
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
  console.log("Listening for messages...");
  console.log("Send !quote, !mention, !both, or !mentionall to test.");
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
