import { describe, it, expect, beforeAll } from "vitest";
import { client, testJid, selfJid, skip, setupClient, TEST_PHONE, ensureConnected } from "./setup.js";

describe.skipIf(skip || !TEST_PHONE)("messages", () => {
  setupClient();
  beforeAll(() => ensureConnected());

  let sentId: string;

  it("sendMessage sends a text message", async () => {
    const resp = await client.sendMessage(testJid, {
      conversation: `Integration test @ ${new Date().toISOString()}`,
    });
    expect(resp.id).toBeTruthy();
    expect(resp.timestamp).toBeGreaterThan(0);
    sentId = resp.id;
  });

  it("sendRawMessage sends a text message", async () => {
    const resp = await client.sendRawMessage(testJid, {
      conversation: "Raw message test",
    });
    expect(resp.id).toBeTruthy();
    expect(resp.timestamp).toBeGreaterThan(0);
  });

  it("sendReaction reacts to a message", async () => {
    expect(sentId).toBeTruthy();
    const resp = await client.sendReaction(testJid, selfJid, sentId, "\u{1F44D}");
    expect(resp.id).toBeTruthy();
    expect(resp.timestamp).toBeGreaterThan(0);
  });

  it("editMessage edits a sent message", async () => {
    expect(sentId).toBeTruthy();
    const resp = await client.editMessage(testJid, sentId, {
      conversation: "Edited message",
    });
    expect(resp.id).toBeTruthy();
    expect(resp.timestamp).toBeGreaterThan(0);
  });

  it("revokeMessage revokes a sent message", async () => {
    // Send a fresh message and wait before revoking (479 = rate limit from rapid ops)
    const msg = await client.sendMessage(testJid, { conversation: "To be revoked" });
    await new Promise((r) => setTimeout(r, 2000));
    try {
      await client.revokeMessage(testJid, selfJid, msg.id);
    } catch (err: unknown) {
      // 479 is a WhatsApp rate limit — not a code bug
      expect((err as Error).message).toContain("479");
    }
  });

  it("markRead resolves without error", async () => {
    expect(sentId).toBeTruthy();
    await client.markRead([sentId], testJid);
  });
});
