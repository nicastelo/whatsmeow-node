import { describe, it, expect, beforeAll } from "vitest";
import { client, skip, setupClient, ensureConnected } from "./setup.js";

describe.skipIf(skip)("privacy", () => {
  setupClient();
  beforeAll(() => ensureConnected());

  const expectedKeys = [
    "groupAdd", "lastSeen", "status", "profile",
    "readReceipts", "callAdd", "online", "messages",
  ];

  it("getPrivacySettings returns all expected keys", async () => {
    const settings = await client.getPrivacySettings();
    for (const key of expectedKeys) {
      expect(settings).toHaveProperty(key);
    }
  });

  it("tryFetchPrivacySettings returns all expected keys", async () => {
    const settings = await client.tryFetchPrivacySettings();
    for (const key of expectedKeys) {
      expect(settings).toHaveProperty(key);
    }
  });

  it("setPrivacySetting changes a setting and returns updated settings", async () => {
    const before = await client.getPrivacySettings();
    const newValue = before.readReceipts === "all" ? "none" : "all";
    const after = await client.setPrivacySetting("readreceipts", newValue);
    expect(after.readReceipts).toBe(newValue);
    // Restore original
    await client.setPrivacySetting("readreceipts", before.readReceipts);
  });

  it("getStatusPrivacy returns array", async () => {
    const result = await client.getStatusPrivacy();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("setDefaultDisappearingTimer succeeds", async () => {
    await client.setDefaultDisappearingTimer(0);
  });
});
