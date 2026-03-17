/**
 * Pair a new device using a phone number code (instead of QR).
 *
 * This is an alternative to QR pairing (see pair.ts). Instead of scanning
 * a QR code, the user enters an 8-digit code in their WhatsApp app:
 *   WhatsApp → Linked Devices → Link a Device → Link with phone number
 *
 * Flow:
 *   1. init() — start the Go process
 *   2. connect() — connect to WhatsApp servers
 *   3. pairCode(phone) — request a pairing code
 *   4. The user enters the code in their WhatsApp app
 *   5. "connected" event fires when pairing succeeds
 *
 * Usage:
 *   npx tsx examples/pair-code.ts <your-phone-number>
 *   e.g. npx tsx examples/pair-code.ts 59897756343
 *
 * The phone number should be the number of the WhatsApp account to pair WITH
 * (i.e. the phone that will scan/enter the code).
 */
import { createClient } from "../src/index.js";
import path from "node:path";

const binaryPath = path.resolve(import.meta.dirname, "../../whatsmeow-node");
const storePath = path.resolve(import.meta.dirname, "../session.db");

const phone = process.argv[2];
if (!phone) {
  console.error("Usage: npx tsx examples/pair-code.ts <your-phone-number>");
  console.error("  e.g. npx tsx examples/pair-code.ts 59897756343");
  console.error("");
  console.error("The phone number is the WhatsApp account you want to link.");
  process.exit(1);
}

const cleanPhone = phone.replace(/^\+/, "");

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
  // Step 1: Initialize — if already paired, skip pairing
  const initResult = await client.init();
  if (initResult.jid) {
    console.log(`Already paired as ${initResult.jid}`);
    console.log("Delete session.db to re-pair, or use this session.");
    await client.connect();
    client.once("connected", ({ jid }) => {
      console.log(`Connected as ${jid}`);
      // Session is ready — you can start sending messages here.
      // For this example, we just disconnect.
      client.disconnect().then(() => {
        client.close();
        console.log("Done.");
      });
    });
    return;
  }

  // Step 2: Connect first — pairCode() requires an active connection
  console.log("Connecting to WhatsApp...");
  await client.connect();

  // Step 3: Request a pairing code
  // pairCode() returns the 8-digit code as a string (e.g. "1A2B-3C4D").
  console.log(`Requesting pairing code for +${cleanPhone}...`);
  const code = await client.pairCode(cleanPhone);

  console.log("");
  console.log("╔══════════════════════════════════════════╗");
  console.log(`║  Pairing code: ${code}                    ║`);
  console.log("╠══════════════════════════════════════════╣");
  console.log("║  On your phone, go to:                   ║");
  console.log("║  WhatsApp → Linked Devices → Link a      ║");
  console.log("║  Device → Link with phone number         ║");
  console.log("║  Then enter the code above.               ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log("");

  // Step 4: Wait for the user to enter the code on their phone
  const timeout = setTimeout(() => {
    console.error("Pairing timeout (60s). Try again.");
    client.close();
    process.exit(1);
  }, 60_000);

  client.once("connected", ({ jid }) => {
    clearTimeout(timeout);
    console.log(`Paired and connected as ${jid}!`);
    console.log("Session saved to session.db — future connections will auto-login.");

    // Disconnect after successful pairing
    client.disconnect().then(() => {
      client.close();
      console.log("Done.");
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
