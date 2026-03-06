import { describe, it, expect, beforeAll } from "vitest";
import { client, selfJid, skip, setupClient, TEST_PHONE, ensureConnected } from "./setup.js";

describe.skipIf(skip)("contacts", () => {
  setupClient();
  beforeAll(() => ensureConnected());

  it("isOnWhatsApp returns true for a valid phone", async () => {
    const phone = TEST_PHONE || "+" + selfJid.split("@")[0].split(":")[0];
    const results = await client.isOnWhatsApp([phone]);
    expect(results).toHaveLength(1);
    expect(results[0].isIn).toBe(true);
    expect(results[0].jid).toBeTruthy();
  });

  it("isOnWhatsApp returns empty for an invalid phone", async () => {
    const results = await client.isOnWhatsApp(["+0000000000"]);
    // WhatsApp returns empty array for numbers not on the platform
    expect(results).toHaveLength(0);
  });

  it("getUserInfo returns info for own JID", async () => {
    const info = await client.getUserInfo([selfJid]);
    const keys = Object.keys(info);
    expect(keys.length).toBeGreaterThanOrEqual(1);
  });

  it("getProfilePicture returns picture or throws", async () => {
    try {
      const pic = await client.getProfilePicture(selfJid);
      expect(pic).toHaveProperty("url");
      expect(pic).toHaveProperty("id");
    } catch (err: unknown) {
      // No profile picture is valid
      expect((err as Error).message).toBeTruthy();
    }
  });

  it("getUserDevices returns array", async () => {
    const devices = await client.getUserDevices([selfJid]);
    expect(Array.isArray(devices)).toBe(true);
  });

  it("setStatusMessage succeeds", async () => {
    await client.setStatusMessage(`Integration test status ${Date.now()}`);
  });
});
