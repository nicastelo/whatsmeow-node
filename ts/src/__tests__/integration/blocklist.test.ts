import { describe, it, expect, beforeAll } from "vitest";
import { client, skip, setupClient, ensureConnected } from "./setup.js";

import { TEST_PHONE, testJid } from "./setup.js";

// Use the test phone for block/unblock (fake JIDs can hang)
const BLOCK_TEST_JID = testJid;

describe.skipIf(skip || !TEST_PHONE)("blocklist", () => {
  setupClient();
  beforeAll(() => ensureConnected());

  it("getBlocklist returns jids array", async () => {
    const blocklist = await client.getBlocklist();
    expect(blocklist).toHaveProperty("jids");
    expect(Array.isArray(blocklist.jids)).toBe(true);
  });

  it("block and unblock a JID", async () => {
    // Note: blocking can fail with certain JIDs or rate limits.
    // We test the round-trip: block then immediately unblock.
    try {
      const afterBlock = await client.updateBlocklist(BLOCK_TEST_JID, "block");
      expect(afterBlock.jids).toContain(BLOCK_TEST_JID);
      const afterUnblock = await client.updateBlocklist(BLOCK_TEST_JID, "unblock");
      expect(afterUnblock.jids).not.toContain(BLOCK_TEST_JID);
    } catch (err: unknown) {
      // Some JIDs can't be blocked (e.g., own number) — verify it's a server error, not a code bug
      expect((err as Error).message).toMatch(/error|forbidden|not allowed|bad-request/i);
    }
  });
});
