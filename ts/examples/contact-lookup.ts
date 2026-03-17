/**
 * Contact lookup and user information.
 *
 * Demonstrates:
 *   - isOnWhatsApp()      — check if phone numbers are registered on WhatsApp
 *   - getUserInfo()        — get status text, picture ID, and verified name
 *   - getProfilePicture()  — get a user's profile picture URL
 *   - getUserDevices()     — list all linked devices for a user
 *
 * Usage:
 *   npx tsx examples/contact-lookup.ts <phone> [phone2] [phone3] ...
 *   e.g. npx tsx examples/contact-lookup.ts 59897756343 14155551234
 */
import { createClient } from "../src/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const phones = process.argv.slice(2);
if (phones.length === 0) {
  console.error("Usage: npx tsx examples/contact-lookup.ts <phone> [phone2] ...");
  console.error("  e.g. npx tsx examples/contact-lookup.ts 59897756343 14155551234");
  process.exit(1);
}

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

  // ── Step 1: Check which numbers are on WhatsApp ───
  //
  // isOnWhatsApp() accepts an array of phone numbers (with or without +).
  // Returns whether each number is registered and its JID.

  console.log("\n── WhatsApp Registration Check ────────────");
  const cleanPhones = phones.map((p) => p.replace(/^\+/, ""));
  const results = await client.isOnWhatsApp(cleanPhones);

  const registeredJids: string[] = [];

  for (const r of results) {
    const status = r.isIn ? `registered → ${r.jid}` : "NOT on WhatsApp";
    console.log(`  ${r.query}: ${status}`);
    if (r.isIn && r.jid) registeredJids.push(r.jid);
  }

  if (registeredJids.length === 0) {
    console.log("\nNo registered numbers found.");
    await client.disconnect();
    client.close();
    return;
  }

  // ── Step 2: Get user info (status, picture ID) ────
  //
  // getUserInfo() returns a map of JID → { status, pictureID, verifiedName }.
  // Note: returns data for all requested JIDs at once (batch request).

  console.log("\n── User Info ──────────────────────────────");
  const userInfoMap = await client.getUserInfo(registeredJids);

  for (const [jid, info] of Object.entries(userInfoMap)) {
    console.log(`  ${jid}:`);
    console.log(`    Status:        ${info.status || "(empty)"}`);
    console.log(`    Picture ID:    ${info.pictureID || "(none)"}`);
    console.log(`    Verified name: ${info.verifiedName || "(not a business)"}`);
  }

  // ── Step 3: Get profile pictures ──────────────────
  //
  // getProfilePicture() returns the URL of the full-size profile picture.
  // May fail if the user has hidden their photo from you.

  console.log("\n── Profile Pictures ───────────────────────");
  for (const jid of registeredJids) {
    try {
      const pic = await client.getProfilePicture(jid);
      console.log(`  ${jid}:`);
      console.log(`    URL: ${pic.url}`);
      console.log(`    ID:  ${pic.id}`);
    } catch {
      console.log(`  ${jid}: (no profile picture or hidden)`);
    }
  }

  // ── Step 4: Get linked devices ────────────────────
  //
  // getUserDevices() returns all device JIDs linked to the given accounts.
  // Each linked device (phone, web, desktop) has its own JID suffix.

  console.log("\n── Linked Devices ─────────────────────────");
  const devices = await client.getUserDevices(registeredJids);
  if (devices.length === 0) {
    console.log("  No device info returned.");
  } else {
    for (const d of devices) {
      console.log(`  ${d}`);
    }
  }

  await client.disconnect();
  client.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
