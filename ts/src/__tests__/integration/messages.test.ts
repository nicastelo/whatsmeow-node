import { describe, it, expect, beforeAll } from "vitest";
import {
  client,
  testJid,
  selfJid,
  skip,
  setupClient,
  TEST_PHONE,
  ensureConnected,
} from "./setup.js";

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

  it("generateMessageID returns a message ID", async () => {
    const id = await client.generateMessageID();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  it("buildMessageKey returns a proto key object", async () => {
    expect(sentId).toBeTruthy();
    const key = await client.buildMessageKey(testJid, selfJid, sentId);
    expect(key).toBeTruthy();
    expect(typeof key).toBe("object");
  });

  it("buildUnavailableMessageRequest returns a proto message", async () => {
    expect(sentId).toBeTruthy();
    const msg = await client.buildUnavailableMessageRequest(testJid, selfJid, sentId);
    expect(msg).toBeTruthy();
    expect(typeof msg).toBe("object");
  });

  it("buildHistorySyncRequest returns a proto message", async () => {
    expect(sentId).toBeTruthy();
    const msg = await client.buildHistorySyncRequest(
      { chat: testJid, sender: selfJid, id: sentId, timestamp: Math.floor(Date.now() / 1000) },
      5,
    );
    expect(msg).toBeTruthy();
    expect(typeof msg).toBe("object");
  });

  it("sendPeerMessage sends to own devices", async () => {
    // Send a protocol message (app state sync key request) to own devices
    // This should succeed or fail with a whatsmeow error, not an IPC error
    try {
      const resp = await client.sendPeerMessage({
        protocolMessage: {
          type: 14, // APP_STATE_SYNC_KEY_REQUEST
        },
      });
      expect(resp.id).toBeTruthy();
    } catch (err: unknown) {
      // Some protocol messages may be rejected, but not with ERR_INVALID_ARGS
      const msg = (err as Error).message;
      expect(msg).not.toContain("invalid args");
    }
  });

  it("sendMediaRetryReceipt round-trip doesn't crash", async () => {
    expect(sentId).toBeTruthy();
    try {
      await client.sendMediaRetryReceipt(
        { chat: testJid, sender: selfJid, id: sentId, timestamp: Math.floor(Date.now() / 1000) },
        [1, 2, 3, 4],
      );
    } catch (err: unknown) {
      // Expected to fail (no actual media to retry), but should not be ERR_INVALID_ARGS
      const msg = (err as Error).message;
      expect(msg).not.toContain("invalid args");
    }
  });

  let pollId: string;
  let pollTimestamp: number;

  it("sendPollCreation creates a poll", async () => {
    const resp = await client.sendPollCreation(
      testJid,
      "Integration test poll",
      ["Option A", "Option B", "Option C"],
      1,
    );
    expect(resp.id).toBeTruthy();
    expect(resp.timestamp).toBeGreaterThan(0);
    pollId = resp.id;
    pollTimestamp = resp.timestamp;
  });

  it("sendPollVote votes on the poll", async () => {
    expect(pollId).toBeTruthy();
    const resp = await client.sendPollVote(testJid, selfJid, pollId, pollTimestamp, ["Option A"]);
    expect(resp.id).toBeTruthy();
    expect(resp.timestamp).toBeGreaterThan(0);
  });
});
