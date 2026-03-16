/**
 * Create polls and handle poll vote events.
 *
 * Demonstrates:
 *   - sendPollCreation() — create a new poll
 *   - Listening for poll vote events via the "message" event
 *   - decryptPollVote() — decrypt incoming poll votes
 *
 * Polls are end-to-end encrypted. When someone votes, you receive a
 * pollUpdateMessage which must be decrypted to see the selected options.
 *
 * Usage:
 *   npx tsx examples/polls.ts <phone-or-group-jid>
 *   e.g. npx tsx examples/polls.ts 59897756343
 *   e.g. npx tsx examples/polls.ts 120363012345678901@g.us
 *
 * The script creates a poll, then listens for votes.
 * Press Ctrl+C to exit.
 */
import { createClient } from "../src/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const target = process.argv[2];
if (!target) {
  console.error("Usage: npx tsx examples/polls.ts <phone-or-group-jid>");
  console.error("  e.g. npx tsx examples/polls.ts 59897756343");
  console.error("  e.g. npx tsx examples/polls.ts 120363012345678901@g.us");
  process.exit(1);
}

// If it looks like a phone number, convert to JID. Otherwise use as-is (group JID).
const jid = target.includes("@") ? target : `${target.replace(/^\+/, "")}@s.whatsapp.net`;

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

// ── Listen for poll vote updates ────────────────────

client.on("message", async ({ info, message }) => {
  // Poll votes arrive as pollUpdateMessage
  const pollUpdate = message.pollUpdateMessage as
    | { pollCreationMessageKey?: Record<string, unknown>; vote?: Record<string, unknown> }
    | undefined;

  if (!pollUpdate) return;

  console.log(`\n[poll vote] From ${info.pushName} (${info.sender})`);

  // Decrypt the poll vote to see which options were selected.
  // The decrypted result contains the selected option hashes.
  try {
    const decrypted = await client.decryptPollVote(info as unknown as Record<string, unknown>, message);
    console.log("  Decrypted vote:", JSON.stringify(decrypted, null, 2));
  } catch (err) {
    console.error("  Failed to decrypt vote:", err);
  }
});

// ── Startup ─────────────────────────────────────────

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

  // ── Create a poll ─────────────────────────────────
  //
  // sendPollCreation(jid, question, options, selectableCount)
  //   - jid:             where to send the poll
  //   - question:        the poll question
  //   - options:         array of option strings (2-12 options)
  //   - selectableCount: how many options a user can select
  //                      0 = unlimited, 1 = single choice, N = multi-choice up to N

  console.log(`\nCreating poll in ${jid}...`);

  const poll = await client.sendPollCreation(
    jid,
    "What's your favorite programming language?", // question
    ["TypeScript", "Go", "Rust", "Python"], // options
    1, // single choice
  );
  console.log(`Poll created (id: ${poll.id})`);

  // You could also create a multi-choice poll:
  //
  // await client.sendPollCreation(
  //   jid,
  //   "Which features do you want? (select up to 3)",
  //   ["Dark mode", "Notifications", "Offline support", "Export data", "API access"],
  //   3,    // allow selecting up to 3
  // );
  //
  // Or an unlimited-choice poll:
  //
  // await client.sendPollCreation(
  //   jid,
  //   "Select all that apply:",
  //   ["Option A", "Option B", "Option C"],
  //   0,    // 0 = unlimited selections
  // );

  console.log("\nListening for poll votes...");
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
