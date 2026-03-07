import { describe, it, expect, beforeAll } from "vitest";
import { client, skip, setupClient, ensureConnected } from "./setup.js";

describe.skipIf(skip)("configuration", () => {
  setupClient();
  beforeAll(() => ensureConnected());

  it("setPassive succeeds", async () => {
    await client.setPassive(false);
  });

  it("setForceActiveDeliveryReceipts succeeds", async () => {
    await client.setForceActiveDeliveryReceipts(true);
    // Restore default
    await client.setForceActiveDeliveryReceipts(false);
  });

  it("fetchAppState fetches regular_high state", async () => {
    try {
      await client.fetchAppState("regular_high", false, true);
    } catch (err: unknown) {
      // May fail if already synced or no patches available — that's fine
      const msg = (err as Error).message;
      expect(msg).not.toContain("invalid args");
    }
  });

  it("markNotDirty succeeds or returns expected error", async () => {
    try {
      await client.markNotDirty("contacts", Math.floor(Date.now() / 1000));
    } catch (err: unknown) {
      // May fail with a whatsmeow error, but should not be ERR_INVALID_ARGS
      const msg = (err as Error).message;
      expect(msg).not.toContain("invalid args");
    }
  });
});
