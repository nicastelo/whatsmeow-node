/**
 * Disappearing messages (ephemeral messages).
 *
 * Demonstrates:
 *   - setDefaultDisappearingTimer() — set the default timer for new chats
 *   - setDisappearingTimer()        — set/clear timer for a specific chat
 *
 * Timer values (in seconds):
 *   0        — disabled (messages don't disappear)
 *   86400    — 24 hours
 *   604800   — 7 days
 *   7776000  — 90 days
 *
 * Note: WhatsApp only supports the specific timer values listed above.
 * Other values may be silently rounded or rejected.
 *
 * Caveat: whatsmeow connects as a linked device (not the primary phone).
 * Some recipients may see "This message will not disappear" warnings
 * for the first message after a timer change — this is a WhatsApp
 * protocol-level behavior for linked devices, not a library bug.
 *
 * Usage:
 *   npx tsx examples/disappearing-messages.ts <phone>
 *   e.g. npx tsx examples/disappearing-messages.ts 59897756343
 */
import { createClient } from "../src/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const phone = process.argv[2];
if (!phone) {
  console.error("Usage: npx tsx examples/disappearing-messages.ts <phone>");
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

// Timer values as readable constants
const TIMER = {
  OFF: 0,
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
  QUARTER: 7776000, // 90 days
};

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

  // ── Set default timer for all new chats ───────────
  //
  // This only affects NEW conversations you start after setting it.
  // Existing chats keep their current timer.

  console.log("\n1. Setting default disappearing timer to 24 hours...");
  await client.setDefaultDisappearingTimer(TIMER.DAY);
  console.log("   Default timer set to 24 hours for new chats.");

  // ── Set timer for a specific chat ─────────────────
  //
  // This overrides the default for this specific conversation.
  // Works for both DMs and groups (if you're an admin).

  console.log(`\n2. Setting disappearing timer for ${jid} to 7 days...`);
  await client.setDisappearingTimer(jid, TIMER.WEEK);
  console.log("   Timer set! Messages will disappear after 7 days.");

  // Wait a moment for the timer change to propagate before sending.
  // Messages sent immediately after setting the timer may not inherit it.
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Send a message that will disappear
  await client.sendMessage(jid, {
    conversation: "This message will disappear in 7 days!",
  });
  console.log("   Sent a test message (will disappear in 7 days).");

  // ── Disable disappearing messages ─────────────────
  //
  // Set the timer to 0 to disable disappearing messages.

  // Uncomment to disable:
  // console.log(`\n3. Disabling disappearing messages for ${jid}...`);
  // await client.setDisappearingTimer(jid, TIMER.OFF);
  // console.log("   Disappearing messages disabled.");

  // Reset default timer:
  // await client.setDefaultDisappearingTimer(TIMER.OFF);

  await client.disconnect();
  client.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
