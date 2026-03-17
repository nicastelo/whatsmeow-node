/**
 * Privacy settings and blocklist management.
 *
 * Demonstrates:
 *   - getPrivacySettings()    — view all privacy settings
 *   - setPrivacySetting()     — update a specific setting
 *   - getStatusPrivacy()      — who can see your status updates
 *   - getBlocklist()          — view blocked contacts
 *   - updateBlocklist()       — block/unblock contacts
 *
 * Privacy setting names use wire values (NOT camelCase):
 *   "groupadd"      — who can add you to groups
 *   "last"          — who can see your last seen
 *   "status"        — who can see your status
 *   "profile"       — who can see your profile photo
 *   "readreceipts"  — blue ticks on/off
 *   "calladd"       — who can call you
 *   "online"        — who can see you're online
 *   "messages"      — who can message you
 *   "defense"       — advanced privacy protection
 *   "stickers"      — who can see your sticker gallery
 *
 * Usage:
 *   npx tsx examples/privacy-settings.ts
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

  // ── View current privacy settings ─────────────────

  console.log("\n── Privacy Settings ───────────────────────");
  const privacy = await client.getPrivacySettings();
  console.log(`  Group add:       ${privacy.groupAdd}`);
  console.log(`  Last seen:       ${privacy.lastSeen}`);
  console.log(`  Status:          ${privacy.status}`);
  console.log(`  Profile photo:   ${privacy.profile}`);
  console.log(`  Read receipts:   ${privacy.readReceipts}`);
  console.log(`  Calls:           ${privacy.callAdd}`);
  console.log(`  Online:          ${privacy.online}`);
  console.log(`  Messages:        ${privacy.messages}`);
  console.log(`  Defense:         ${privacy.defense}`);
  console.log(`  Stickers:        ${privacy.stickers}`);

  // ── View status privacy rules ─────────────────────

  console.log("\n── Status Privacy ─────────────────────────");
  const statusPrivacy = await client.getStatusPrivacy();
  for (const rule of statusPrivacy) {
    console.log(`  Type: ${rule.type} | Default: ${rule.isDefault} | List: ${rule.list.length} JIDs`);
  }

  // ── View blocklist ────────────────────────────────

  console.log("\n── Blocklist ──────────────────────────────");
  const blocklist = await client.getBlocklist();
  if (blocklist.jids.length === 0) {
    console.log("  No blocked contacts.");
  } else {
    for (const jid of blocklist.jids) {
      console.log(`  ${jid}`);
    }
  }

  // ── Modify settings ───────────────────────────────
  // Uncomment below to test write operations.

  // CHANGE a privacy setting:
  // setPrivacySetting returns the full updated settings object.
  //
  // // Hide last seen from everyone:
  // const updated = await client.setPrivacySetting("last", "none");
  // console.log(`Last seen: ${updated.lastSeen}`);
  //
  // // Only contacts can see your profile photo:
  // await client.setPrivacySetting("profile", "contacts");
  //
  // // Disable read receipts (no blue ticks):
  // await client.setPrivacySetting("readreceipts", "none");
  //
  // // Only known contacts can call you:
  // await client.setPrivacySetting("calladd", "known");

  // BLOCK / UNBLOCK:
  //
  // const updated = await client.updateBlocklist("5989XXXXXXXX@s.whatsapp.net", "block");
  // console.log(`Blocked. Total blocked: ${updated.jids.length}`);
  //
  // const unblocked = await client.updateBlocklist("5989XXXXXXXX@s.whatsapp.net", "unblock");
  // console.log(`Unblocked. Total blocked: ${unblocked.jids.length}`);

  await client.disconnect();
  client.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
