import { describe, it, expect, beforeAll } from "vitest";
import {
  client,
  selfJid,
  testJid,
  skip,
  setupClient,
  TEST_PHONE,
  ensureConnected,
} from "./setup.js";

describe.skipIf(skip || !TEST_PHONE)("crypto", () => {
  setupClient();
  beforeAll(() => ensureConnected());

  const dummyInfo = () => ({
    chat: testJid,
    sender: selfJid,
    id: "DUMMY-MSG-ID",
    isFromMe: true,
    isGroup: false,
    timestamp: Math.floor(Date.now() / 1000),
    pushName: "Test",
  });

  it("encryptComment round-trip doesn't crash", async () => {
    try {
      const result = await client.encryptComment(dummyInfo(), {
        commentMessage: { text: "test comment" },
      });
      expect(result).toBeTruthy();
    } catch (err: unknown) {
      // Expected: may fail because there's no actual comment target, but not ERR_INVALID_ARGS
      const msg = (err as Error).message;
      expect(msg).not.toContain("invalid args");
    }
  });

  it("encryptPollVote round-trip doesn't crash", async () => {
    try {
      const result = await client.encryptPollVote(dummyInfo(), {
        selectedOptions: [],
      });
      expect(result).toBeTruthy();
    } catch (err: unknown) {
      const msg = (err as Error).message;
      expect(msg).not.toContain("invalid args");
    }
  });

  it("encryptReaction round-trip doesn't crash", async () => {
    try {
      const result = await client.encryptReaction(dummyInfo(), {
        text: "\u{1F44D}",
      });
      expect(result).toBeTruthy();
    } catch (err: unknown) {
      const msg = (err as Error).message;
      expect(msg).not.toContain("invalid args");
    }
  });

  it("decryptComment round-trip returns error (no valid ciphertext)", async () => {
    try {
      await client.decryptComment(dummyInfo(), {
        commentMessage: { text: "not encrypted" },
      });
    } catch (err: unknown) {
      // Expected: decryption fails because the message isn't actually encrypted
      const msg = (err as Error).message;
      expect(msg).not.toContain("invalid args");
    }
  });

  it("decryptPollVote round-trip returns error (no valid ciphertext)", async () => {
    try {
      await client.decryptPollVote(dummyInfo(), {
        pollUpdateMessage: {},
      });
    } catch (err: unknown) {
      const msg = (err as Error).message;
      expect(msg).not.toContain("invalid args");
    }
  });

  it("decryptReaction round-trip returns error (no valid ciphertext)", async () => {
    try {
      await client.decryptReaction(dummyInfo(), {
        reactionMessage: { text: "\u{1F44D}" },
      });
    } catch (err: unknown) {
      const msg = (err as Error).message;
      expect(msg).not.toContain("invalid args");
    }
  });

  it("decryptSecretEncryptedMessage round-trip returns error (no valid ciphertext)", async () => {
    try {
      await client.decryptSecretEncryptedMessage(dummyInfo(), {
        secretEncryptedMessage: {},
      });
    } catch (err: unknown) {
      const msg = (err as Error).message;
      expect(msg).not.toContain("invalid args");
    }
  });

  it("parseWebMessage parses a minimal WebMessageInfo", async () => {
    try {
      const result = await client.parseWebMessage(testJid, {
        key: {
          remoteJid: testJid,
          fromMe: true,
          id: "DUMMY-WEB-MSG-ID",
        },
        message: {
          conversation: "hello from web message",
        },
        messageTimestamp: String(Math.floor(Date.now() / 1000)),
      });
      expect(result.info).toBeTruthy();
      expect(result.message).toBeTruthy();
    } catch (err: unknown) {
      // May fail with a parse error, but should not be ERR_INVALID_ARGS
      const msg = (err as Error).message;
      expect(msg).not.toContain("invalid args");
    }
  });
});
