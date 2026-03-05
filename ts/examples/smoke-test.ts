/**
 * Smoke test for new methods. Requires an already-paired session.db.
 *
 * Usage:
 *   npx tsx examples/smoke-test.ts [phone]
 *
 * If a phone number is provided, messaging tests will target that JID.
 * Otherwise only read-only/self methods are tested.
 */
import { createClient } from "../dist/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const phone = process.argv[2];
const targetJid = phone ? `${phone.replace(/^\+/, "")}@s.whatsapp.net` : null;

const client = createClient({
  store: `file:${storePath}`,
  binaryPath,
  commandTimeout: 15_000,
});

client.on("error", (err) => console.error("Client error:", err));
client.on("log", (log) => {
  if (log.level === "info") console.log(`[go] ${log.msg}`);
});

// Debug: log all events
for (const evt of [
  "connected",
  "disconnected",
  "logged_out",
  "stream_error",
  "qr",
  "qr:timeout",
] as const) {
  client.on(evt, (d) => console.log(`[event] ${evt}:`, d));
}

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

async function main() {
  const initResult = await client.init();
  if (!initResult.jid) {
    console.error("Not paired! Run: npx tsx examples/pair.ts");
    process.exit(1);
  }
  console.log(`Paired as ${initResult.jid}\n`);

  // Wait for full connection before running tests
  const connected = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Connection timeout (15s)")), 15_000);
    client.once("connected", () => {
      clearTimeout(timeout);
      // Give it a moment after connected event for full readiness
      setTimeout(resolve, 1000);
    });
  });
  await client.connect();
  console.log("Waiting for connection...");
  await connected;
  console.log("Connected!\n");

  console.log("── Connection ──");
  await test("isConnected", async () => {
    const connected = await client.isConnected();
    assert(connected === true, "expected true");
  });

  await test("isLoggedIn", async () => {
    const loggedIn = await client.isLoggedIn();
    assert(loggedIn === true, "expected true");
  });

  console.log("\n── Privacy & Settings ──");
  await test("getPrivacySettings", async () => {
    const settings = await client.getPrivacySettings();
    assert(typeof settings.groupAdd === "string", "groupAdd should be string");
    assert(typeof settings.lastSeen === "string", "lastSeen should be string");
    console.log(`    settings: groupAdd=${settings.groupAdd}, lastSeen=${settings.lastSeen}`);
  });

  console.log("\n── Blocklist ──");
  await test("getBlocklist", async () => {
    const blocklist = await client.getBlocklist();
    assert(Array.isArray(blocklist.jids), "jids should be array");
    console.log(`    blocked: ${blocklist.jids.length} contacts`);
  });

  console.log("\n── Groups ──");
  await test("getJoinedGroups", async () => {
    const groups = await client.getJoinedGroups();
    assert(Array.isArray(groups), "should be array");
    console.log(`    joined: ${groups.length} groups`);
    if (groups.length > 0) {
      console.log(`    first: "${groups[0].name}" (${groups[0].jid})`);
    }
  });

  console.log("\n── Newsletters ──");
  await test("getSubscribedNewsletters", async () => {
    const newsletters = await client.getSubscribedNewsletters();
    assert(Array.isArray(newsletters), "should be array");
    console.log(`    subscribed: ${newsletters.length} newsletters`);
  });

  console.log("\n── Contacts ──");
  await test("getProfilePicture (self)", async () => {
    const pic = await client.getProfilePicture(initResult.jid!);
    console.log(`    url: ${pic.url ? pic.url.slice(0, 60) + "..." : "(none)"}`);
  });

  await test("getUserDevices (self)", async () => {
    const devices = await client.getUserDevices([initResult.jid!]);
    assert(Array.isArray(devices), "should be array");
    console.log(`    devices: ${devices.length}`);
  });

  console.log("\n── QR & Links ──");
  await test("getContactQRLink", async () => {
    const link = await client.getContactQRLink();
    assert(typeof link === "string" && link.length > 0, "should return a link");
    console.log(`    link: ${link.slice(0, 60)}...`);
  });

  console.log("\n── Configuration ──");
  await test("setForceActiveDeliveryReceipts", async () => {
    await client.setForceActiveDeliveryReceipts(true);
    // reset
    await client.setForceActiveDeliveryReceipts(false);
  });

  // ── Messaging tests (only if phone provided) ──
  if (targetJid) {
    console.log(`\n── Messaging (target: ${targetJid}) ──`);

    await test("isOnWhatsApp", async () => {
      const results = await client.isOnWhatsApp([phone!]);
      assert(results.length > 0, "should return results");
      console.log(`    ${phone}: isIn=${results[0].isIn}`);
    });

    let sentMsgId: string | null = null;

    await test("sendMessage", async () => {
      const resp = await client.sendMessage(targetJid, {
        conversation: "Smoke test from whatsmeow-node 🏎️",
      });
      assert(resp.id, "should return message id");
      sentMsgId = resp.id;
      console.log(`    sent: ${resp.id}`);
    });

    if (sentMsgId) {
      await test("sendReaction", async () => {
        const resp = await client.sendReaction(targetJid, initResult.jid!, sentMsgId!, "🔥");
        assert(resp.id, "should return reaction id");
        console.log(`    reacted: ${resp.id}`);
      });

      await test("editMessage", async () => {
        const resp = await client.editMessage(targetJid, sentMsgId!, {
          conversation: "Smoke test from whatsmeow-node 🏎️ (edited!)",
        });
        assert(resp.id, "should return edit id");
        console.log(`    edited: ${resp.id}`);
      });

      await test("sendReaction (remove)", async () => {
        const resp = await client.sendReaction(targetJid, initResult.jid!, sentMsgId!, "");
        assert(resp.id, "should return id");
      });
    }

    await test("sendPollCreation", async () => {
      const resp = await client.sendPollCreation(targetJid, "Smoke test poll", ["Yes", "No", "Maybe"], 1);
      assert(resp.id, "should return poll id");
      console.log(`    poll: ${resp.id}`);
    });

    await test("getBusinessProfile", async () => {
      try {
        const profile = await client.getBusinessProfile(targetJid);
        console.log(`    biz: ${profile.jid}`);
      } catch (err: any) {
        if (err.code === "ERR_BUSINESS_PROFILE") {
          console.log("    (not a business account — expected)");
        } else {
          throw err;
        }
      }
    });
  } else {
    console.log("\n  (skipping messaging tests — no phone provided)");
  }

  // Done
  console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);

  await client.disconnect();
  client.close();
  process.exit(failed > 0 ? 1 : 0);
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
