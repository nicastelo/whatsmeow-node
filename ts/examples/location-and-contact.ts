/**
 * Send location messages and contact cards (vCards).
 *
 * Demonstrates two useful raw message types:
 *   - locationMessage  — share a GPS coordinate with optional name/address
 *   - contactMessage   — share a contact card (vCard format)
 *
 * Both use sendRawMessage() since they're proto message shapes
 * not covered by the typed sendMessage() helper.
 *
 * Usage:
 *   npx tsx examples/location-and-contact.ts <phone>
 *   e.g. npx tsx examples/location-and-contact.ts 59897756343
 */
import { createClient } from "../src/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const phone = process.argv[2];
if (!phone) {
  console.error("Usage: npx tsx examples/location-and-contact.ts <phone>");
  console.error("  e.g. npx tsx examples/location-and-contact.ts 59897756343");
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

  // ── Send a location ───────────────────────────────
  //
  // locationMessage shares a GPS pin that opens in the recipient's map app.
  //
  // Fields:
  //   degreesLatitude  — GPS latitude (required)
  //   degreesLongitude — GPS longitude (required)
  //   name             — location name shown in the chat bubble
  //   address          — address text shown below the name
  //   comment          — optional caption
  //   url              — optional link (e.g. Google Maps URL)

  console.log(`\n1. Sending location to ${jid}...`);
  const locationResp = await client.sendRawMessage(jid, {
    locationMessage: {
      degreesLatitude: 40.7128,
      degreesLongitude: -74.006,
      name: "New York City",
      address: "Manhattan, NY, USA",
      comment: "Sent from whatsmeow-node",
    },
  });
  console.log("   Location sent!", locationResp);

  // ── Send a live location (snapshot) ───────────────
  //
  // liveLocationMessage shows a real-time location pin.
  // Note: this sends a snapshot — continuous updates require
  // sending new liveLocationMessage messages periodically.

  // Uncomment to send:
  //
  // await client.sendRawMessage(jid, {
  //   liveLocationMessage: {
  //     degreesLatitude: 40.7128,
  //     degreesLongitude: -74.0060,
  //     caption: "I'm here!",
  //     sequenceNumber: 1,
  //     // accuracyInMeters: 10,
  //     // speedInMps: 0,
  //     // degreesClockwiseFromMagneticNorth: 0,
  //   },
  // });

  // ── Send a contact card (vCard) ───────────────────
  //
  // contactMessage shares a single contact. The vCard field must be a
  // valid vCard 3.0 string. WhatsApp renders it as a tappable contact card
  // with an "Add to contacts" button.

  console.log(`\n2. Sending contact card to ${jid}...`);
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Jane Doe",
    "TEL;TYPE=CELL:+1-555-123-4567",
    "EMAIL:jane@example.com",
    "ORG:Example Corp",
    "END:VCARD",
  ].join("\n");

  const contactResp = await client.sendRawMessage(jid, {
    contactMessage: {
      displayName: "Jane Doe",
      vcard,
    },
  });
  console.log("   Contact card sent!", contactResp);

  // ── Send multiple contacts at once ────────────────
  //
  // contactsArrayMessage shares multiple contacts in a single message.
  // Each entry has its own displayName and vcard.

  console.log(`\n3. Sending multiple contacts to ${jid}...`);
  const multiContactResp = await client.sendRawMessage(jid, {
    contactsArrayMessage: {
      displayName: "Team Contacts",
      contacts: [
        {
          displayName: "Jane Doe",
          vcard: [
            "BEGIN:VCARD",
            "VERSION:3.0",
            "FN:Jane Doe",
            "TEL;TYPE=CELL:+1-555-123-4567",
            "END:VCARD",
          ].join("\n"),
        },
        {
          displayName: "John Smith",
          vcard: [
            "BEGIN:VCARD",
            "VERSION:3.0",
            "FN:John Smith",
            "TEL;TYPE=CELL:+1-555-987-6543",
            "END:VCARD",
          ].join("\n"),
        },
      ],
    },
  });
  console.log("   Multiple contacts sent!", multiContactResp);

  await client.disconnect();
  client.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
