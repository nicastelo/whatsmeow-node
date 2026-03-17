/**
 * Newsletter (Channel) management.
 *
 * Demonstrates:
 *   - getSubscribedNewsletters()          — list your subscribed channels
 *   - createNewsletter()                  — create a new channel
 *   - getNewsletterInfo()                 — get channel metadata
 *   - followNewsletter() / unfollowNewsletter() — follow/unfollow
 *   - getNewsletterMessages()             — fetch channel messages
 *   - newsletterSendReaction()            — react to a channel message
 *   - newsletterToggleMute()              — mute/unmute notifications
 *   - newsletterSubscribeLiveUpdates()    — subscribe to live updates
 *
 * Usage:
 *   npx tsx examples/newsletters.ts
 */
import { createClient } from "../src/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

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

  // ── List subscribed newsletters ───────────────────

  console.log("\n── Subscribed Newsletters ─────────────────");
  const newsletters = await client.getSubscribedNewsletters();
  console.log(`Found ${newsletters.length} newsletters:\n`);
  for (const nl of newsletters) {
    console.log(`  ${nl.name} (${nl.id})`);
  }

  // ── Get detailed info for the first newsletter ────

  if (newsletters.length > 0) {
    const first = newsletters[0];
    console.log(`\n── Details for "${first.name}" ─────────────`);
    const info = await client.getNewsletterInfo(first.id);
    console.log(`  State: ${info.state}`);
    console.log(`  Role: ${info.role ?? "subscriber"}`);
    console.log(`  Muted: ${info.mute ?? "default"}`);
    if (info.description) console.log(`  Description: ${info.description}`);

    // Fetch the latest messages
    console.log("\n  Latest messages:");
    const messages = await client.getNewsletterMessages(first.id, 5);
    for (const msg of messages) {
      const date = new Date(msg.timestamp * 1000).toLocaleString();
      const views = msg.viewsCount;
      const text = msg.message?.conversation ?? msg.message?.extendedTextMessage ?? "(media)";
      console.log(`    [${date}] (${views} views) ${typeof text === "string" ? text : "(rich)"}`);
    }
  }

  // ── Newsletter operations ─────────────────────────
  // Uncomment below to test write operations.

  // CREATE a newsletter:
  //
  // const newChannel = await client.createNewsletter(
  //   "My Channel Name",
  //   "Channel description — visible to subscribers",
  //   // Optional: path to a picture file
  //   // "/path/to/channel-picture.jpg",
  // );
  // console.log(`Created: ${newChannel.name} (${newChannel.id})`);

  // FOLLOW / UNFOLLOW:
  //
  // await client.followNewsletter(channelJid);
  // await client.unfollowNewsletter(channelJid);

  // MUTE / UNMUTE notifications:
  //
  // await client.newsletterToggleMute(channelJid, true);   // mute
  // await client.newsletterToggleMute(channelJid, false);  // unmute

  // REACT to a channel message:
  //
  // newsletterSendReaction(jid, serverId, reaction, messageId)
  //   - serverId: the message's server-assigned ID (from getNewsletterMessages)
  //   - reaction: emoji string
  //   - messageId: unique message ID for deduplication
  //
  // const msgId = await client.generateMessageID();
  // await client.newsletterSendReaction(channelJid, 123, "🔥", msgId);

  // SUBSCRIBE to live updates (get real-time channel messages):
  //
  // const durationMs = await client.newsletterSubscribeLiveUpdates(channelJid);
  // console.log(`Subscribed for ${durationMs}ms`);

  await client.disconnect();
  client.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
