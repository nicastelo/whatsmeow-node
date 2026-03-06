/**
 * E2E tests — run against a real WhatsApp session.
 *
 * Requires:
 *   - Go binary built at repo root (go build -o whatsmeow-node ./cmd/whatsmeow-node)
 *   - A paired session.db (set E2E_SESSION_DB path, defaults to ts/e2e-session.db)
 *
 * Run locally:
 *   go build -o whatsmeow-node ./cmd/whatsmeow-node
 *   E2E_SESSION_DB=./path/to/session.db npm run test:e2e
 *
 * These tests only perform read-only operations to minimize ban risk.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { existsSync, copyFileSync } from "node:fs";
import { createClient } from "../index.js";
import type { WhatsmeowClient } from "../client.js";

const SESSION_DB = process.env.E2E_SESSION_DB ?? resolve(__dirname, "../../e2e-session.db");
const BINARY_PATH = process.env.E2E_BINARY_PATH ?? resolve(__dirname, "../../../whatsmeow-node");
const CONNECT_TIMEOUT = 30_000;

describe.skipIf(!existsSync(SESSION_DB) || !existsSync(BINARY_PATH))(
  "E2E",
  () => {
    let client: WhatsmeowClient;
    let jid: string;

    // Use a copy so the original session.db isn't modified
    const testDb = resolve(__dirname, "../../.e2e-test-session.db");

    beforeAll(async () => {
      copyFileSync(SESSION_DB, testDb);
      // Also copy WAL/SHM if they exist
      for (const ext of ["-wal", "-shm"]) {
        if (existsSync(SESSION_DB + ext)) {
          copyFileSync(SESSION_DB + ext, testDb + ext);
        }
      }

      client = createClient({
        store: testDb,
        binaryPath: BINARY_PATH,
        commandTimeout: CONNECT_TIMEOUT,
      });

      const init = await client.init();
      expect(init.jid).toBeTruthy();
      jid = init.jid ?? "";
      expect(jid).not.toBe("");

      // Connect and wait for connected event
      const connected = new Promise<void>((res, rej) => {
        const timer = setTimeout(() => rej(new Error("connect timeout")), CONNECT_TIMEOUT);
        client.once("connected", () => {
          clearTimeout(timer);
          res();
        });
      });
      await client.connect();
      await connected;
    }, CONNECT_TIMEOUT + 5_000);

    afterAll(async () => {
      try {
        await client.disconnect();
      } catch {
        // ignore
      }
      client.close();
    });

    // ── Connection ──────────────────────────────────

    it("is connected and logged in", async () => {
      const { connected } = await client.isConnected();
      const { loggedIn } = await client.isLoggedIn();
      expect(connected).toBe(true);
      expect(loggedIn).toBe(true);
    });

    // ── Privacy & Settings ──────────────────────────

    it("getPrivacySettings returns settings object", async () => {
      const settings = await client.getPrivacySettings();
      expect(settings).toHaveProperty("groupAdd");
      expect(settings).toHaveProperty("lastSeen");
      expect(settings).toHaveProperty("status");
      expect(settings).toHaveProperty("profile");
      expect(settings).toHaveProperty("readReceipts");
    });

    // ── Blocklist ───────────────────────────────────

    it("getBlocklist returns jids array", async () => {
      const blocklist = await client.getBlocklist();
      expect(blocklist).toHaveProperty("jids");
      expect(Array.isArray(blocklist.jids)).toBe(true);
    });

    // ── Groups ──────────────────────────────────────

    it("getJoinedGroups returns array", async () => {
      const groups = await client.getJoinedGroups();
      expect(Array.isArray(groups)).toBe(true);
      // Verify shape if there are groups
      if (groups.length > 0) {
        expect(groups[0]).toHaveProperty("JID");
      }
    });

    // ── Contacts ────────────────────────────────────

    it("isOnWhatsApp checks own number", async () => {
      // Extract phone from JID (e.g. "5989...@s.whatsapp.net" -> "+5989...")
      const phone = "+" + jid.split("@")[0].split(":")[0];
      const results = await client.isOnWhatsApp([phone]);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].isIn).toBe(true);
    });

    it("getUserInfo returns info for own JID", async () => {
      const info = await client.getUserInfo([jid]);
      expect(info).toHaveProperty(jid);
    });

    // ── Newsletters ─────────────────────────────────

    it("getSubscribedNewsletters returns array", async () => {
      const newsletters = await client.getSubscribedNewsletters();
      expect(Array.isArray(newsletters)).toBe(true);
    });

    // ── Presence ────────────────────────────────────

    it("sendPresence available succeeds", async () => {
      // Should not throw
      await client.sendPresence("available");
    });

    it("sendPresence unavailable succeeds", async () => {
      await client.sendPresence("unavailable");
    });

    // ── QR Links ────────────────────────────────────

    it("getContactQRLink returns a link", async () => {
      const result = await client.getContactQRLink();
      expect(result).toHaveProperty("link");
      expect(typeof result.link).toBe("string");
    });
  },
);
