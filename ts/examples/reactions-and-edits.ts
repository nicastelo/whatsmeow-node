/**
 * React to messages, edit sent messages, and revoke (delete) messages.
 *
 * Demonstrates:
 *   - sendReaction()  — add or remove emoji reactions
 *   - editMessage()   — edit a previously sent message
 *   - revokeMessage() — delete a message for everyone
 *
 * Usage:
 *   npx tsx examples/reactions-and-edits.ts <phone>
 *   e.g. npx tsx examples/reactions-and-edits.ts 59897756343
 *
 * The script sends a message, reacts to it, edits it, and then revokes it.
 */
import { createClient } from "../src/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const phone = process.argv[2];
if (!phone) {
  console.error("Usage: npx tsx examples/reactions-and-edits.ts <phone>");
  console.error("  e.g. npx tsx examples/reactions-and-edits.ts 59897756343");
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const initResult = await client.init();
  if (!initResult.jid) {
    console.error("Not paired! Run: npx tsx examples/pair.ts");
    process.exit(1);
  }
  const myJid = initResult.jid;
  console.log(`Paired as ${myJid}`);

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

  // ── Step 1: Send a message ──────────────────────
  console.log(`\n1. Sending message to ${jid}...`);
  const sent = await client.sendMessage(jid, {
    conversation: "This message will be reacted to, edited, and then deleted.",
  });
  console.log(`   Message sent (id: ${sent.id})`);

  await sleep(2000);

  // ── Step 2: React to it ─────────────────────────
  // sendReaction(chat, sender, messageId, reaction)
  //   - chat:     the conversation JID
  //   - sender:   who sent the message we're reacting to (our own JID here)
  //   - id:       the message ID to react to
  //   - reaction: any emoji string, or "" to remove the reaction
  console.log("2. Reacting with 👍...");
  await client.sendReaction(jid, myJid, sent.id, "👍");
  console.log("   Reaction sent!");

  await sleep(2000);

  // ── Step 3: Change the reaction ─────────────────
  // Sending a new reaction replaces the previous one.
  console.log("3. Changing reaction to 🚀...");
  await client.sendReaction(jid, myJid, sent.id, "🚀");
  console.log("   Reaction updated!");

  await sleep(2000);

  // ── Step 4: Remove the reaction ─────────────────
  // Send an empty string to remove the reaction.
  console.log("4. Removing reaction...");
  await client.sendReaction(jid, myJid, sent.id, "");
  console.log("   Reaction removed!");

  await sleep(2000);

  // ── Step 5: Edit the message ────────────────────
  // editMessage(chat, messageId, newContent)
  // Only works on messages sent by you.
  console.log("5. Editing message...");
  await client.editMessage(jid, sent.id, {
    conversation: "This message was edited! ✏️ (it will be deleted next)",
  });
  console.log("   Message edited!");

  await sleep(2000);

  // ── Step 6: Revoke (delete) the message ─────────
  // revokeMessage(chat, sender, messageId)
  // Deletes the message for everyone in the chat.
  // Only works on your own messages within the time limit.
  console.log("6. Revoking message...");
  await client.revokeMessage(jid, myJid, sent.id);
  console.log("   Message revoked (deleted for everyone)!");

  await client.disconnect();
  client.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
