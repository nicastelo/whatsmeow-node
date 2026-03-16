/**
 * Group management examples.
 *
 * Demonstrates creating, configuring, and managing WhatsApp groups:
 *   - createGroup()              — create a new group
 *   - getGroupInfo()             — get group metadata and participants
 *   - setGroupName()             — rename a group
 *   - setGroupDescription()      — set group description
 *   - setGroupAnnounce()         — toggle "only admins can send" mode
 *   - setGroupLocked()           — toggle "only admins can edit info" mode
 *   - updateGroupParticipants()  — add, remove, promote, demote members
 *   - getGroupInviteLink()       — get/reset the group invite link
 *   - getJoinedGroups()          — list all groups you're in
 *   - leaveGroup()               — leave a group
 *
 * Usage:
 *   npx tsx examples/groups.ts
 *
 * This is a read-only demo by default — it lists your groups and shows
 * group info. Uncomment the write operations to test them.
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

// ── Listen for group events ─────────────────────────

client.on("group:info", (event) => {
  console.log(`\n[group:info] ${event.jid}`);
  if (event.name) console.log(`  Name changed to: ${event.name}`);
  if (event.description) console.log(`  Description changed`);
  if (event.join) console.log(`  Joined: ${event.join.join(", ")}`);
  if (event.leave) console.log(`  Left: ${event.leave.join(", ")}`);
  if (event.promote) console.log(`  Promoted: ${event.promote.join(", ")}`);
  if (event.demote) console.log(`  Demoted: ${event.demote.join(", ")}`);
});

client.on("group:joined", ({ jid, name }) => {
  console.log(`\n[group:joined] ${name} (${jid})`);
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

  // ── List all joined groups ────────────────────────

  console.log("\n── Joined Groups ──────────────────────────");
  const groups = await client.getJoinedGroups();
  console.log(`Found ${groups.length} groups:\n`);
  for (const g of groups) {
    const adminCount = g.participants.filter((p) => p.isAdmin).length;
    console.log(`  ${g.name}`);
    console.log(`    JID: ${g.jid}`);
    console.log(`    Members: ${g.participants.length} (${adminCount} admins)`);
    console.log(`    Announce-only: ${g.announce} | Locked: ${g.locked}`);
    console.log();
  }

  // ── Get detailed info for the first group ─────────

  if (groups.length > 0) {
    const first = groups[0];
    console.log(`── Details for "${first.name}" ───────────────`);
    const info = await client.getGroupInfo(first.jid);
    console.log(`  Description: ${info.description ?? "(none)"}`);
    console.log(`  Owner: ${info.owner ?? "(unknown)"}`);
    console.log(`  Participants:`);
    for (const p of info.participants) {
      const role = p.isSuperAdmin ? "super-admin" : p.isAdmin ? "admin" : "member";
      console.log(`    ${p.jid} [${role}]`);
    }
  }

  // ── Group management operations ───────────────────
  // Uncomment below to test write operations.

  // CREATE a group:
  //
  // const newGroup = await client.createGroup("My Test Group", [
  //   "5989XXXXXXXX@s.whatsapp.net",
  //   "5989YYYYYYYY@s.whatsapp.net",
  // ]);
  // console.log(`Created group: ${newGroup.name} (${newGroup.jid})`);

  // UPDATE group settings:
  //
  // await client.setGroupName(groupJid, "New Group Name");
  // await client.setGroupDescription(groupJid, "Updated description");
  // await client.setGroupAnnounce(groupJid, true);  // Only admins can send
  // await client.setGroupLocked(groupJid, true);     // Only admins can edit info

  // MANAGE participants:
  //
  // const memberJid = "5989XXXXXXXX@s.whatsapp.net";
  // await client.updateGroupParticipants(groupJid, [memberJid], "add");
  // await client.updateGroupParticipants(groupJid, [memberJid], "promote");
  // await client.updateGroupParticipants(groupJid, [memberJid], "demote");
  // await client.updateGroupParticipants(groupJid, [memberJid], "remove");

  // GET invite link:
  //
  // const link = await client.getGroupInviteLink(groupJid);
  // console.log(`Invite link: ${link}`);
  //
  // Reset invite link (invalidates the old one):
  // const newLink = await client.getGroupInviteLink(groupJid, true);

  // LEAVE a group:
  //
  // await client.leaveGroup(groupJid);

  await client.disconnect();
  client.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
