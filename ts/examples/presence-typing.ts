/**
 * Presence and typing indicators.
 *
 * Demonstrates:
 *   - sendPresence()      — set your online/offline status
 *   - sendChatPresence()  — show "typing..." or "recording audio..." indicators
 *   - subscribePresence() — subscribe to another user's online status
 *   - Listening for "presence" and "chat_presence" events
 *
 * Usage:
 *   npx tsx examples/presence-typing.ts [phone-to-watch]
 *   e.g. npx tsx examples/presence-typing.ts 59897756343
 *
 * If a phone number is given, the script subscribes to their presence
 * and logs when they come online or go offline.
 * Press Ctrl+C to exit.
 */
import { createClient } from "../src/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const watchPhone = process.argv[2];

const client = createClient({
  store: `file:${storePath}`,
  binaryPath,
});

client.on("error", (err) => {
  console.error("Error:", err);
});

// ── Presence events ─────────────────────────────────
//
// These fire when a user you've subscribed to changes their online status.
// Note: the user's privacy settings may hide their last seen / online status.

client.on("presence", ({ jid, presence, lastSeen }) => {
  const lastSeenStr = lastSeen ? new Date(lastSeen * 1000).toLocaleTimeString() : "unknown";
  console.log(`[presence] ${jid}: ${presence} (last seen: ${lastSeenStr})`);
});

// ── Chat presence events ────────────────────────────
//
// These fire when someone is typing or recording audio in a chat.
// state: "composing" (typing) or "paused" (stopped typing)
// media: "audio" (recording voice) or "" (typing text)

client.on("chat_presence", ({ chat, sender, state, media }) => {
  const action =
    state === "composing" ? (media === "audio" ? "recording audio" : "typing") : "stopped typing";
  console.log(`[typing] ${sender} is ${action} in ${chat}`);
});

// ── Handle messages with typing simulation ──────────

client.on("message", async ({ info, message }) => {
  if (info.isFromMe) return;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as { text?: string } | undefined)?.text;
  if (!text) return;

  console.log(`[message] ${info.pushName}: ${text}`);

  if (text.toLowerCase() === "!typing") {
    // Simulate a realistic typing flow:
    //   1. Show "composing" indicator
    //   2. Wait a moment (simulating typing)
    //   3. Send the message (indicator clears automatically)

    // Show "typing..." in the chat
    await client.sendChatPresence(info.chat, "composing");
    console.log("  → Showing typing indicator...");

    // Simulate typing for 3 seconds
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Send the response — the typing indicator clears when the message is sent
    await client.sendMessage(info.chat, {
      conversation: "I was typing for 3 seconds before sending this!",
    });
    console.log("  → Message sent (typing indicator cleared)");
    return;
  }

  if (text.toLowerCase() === "!audio") {
    // Show "recording audio..." indicator
    // The second parameter "audio" makes it display as "recording audio..."
    // instead of "typing..."
    await client.sendChatPresence(info.chat, "composing", "audio");
    console.log("  → Showing recording indicator...");

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Clear the indicator by sending "paused"
    await client.sendChatPresence(info.chat, "paused");

    await client.sendMessage(info.chat, {
      conversation: "(Just kidding, it was a fake recording indicator!)",
    });
    console.log("  → Indicator cleared");
    return;
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

  // Set ourselves as "available" (online)
  // Use "unavailable" to appear offline.
  await client.sendPresence("available");
  console.log("Set presence: available (online)");

  // Subscribe to a specific user's presence if a phone was given
  if (watchPhone) {
    const watchJid = `${watchPhone.replace(/^\+/, "")}@s.whatsapp.net`;
    await client.subscribePresence(watchJid);
    console.log(`Subscribed to presence of ${watchJid}`);
  }

  console.log("\nSend !typing or !audio to see typing indicators.");
  console.log("Press Ctrl+C to exit.\n");

  process.on("SIGINT", async () => {
    // Set offline before disconnecting
    await client.sendPresence("unavailable");
    console.log("\nSet presence: unavailable (offline)");
    await client.disconnect();
    client.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
