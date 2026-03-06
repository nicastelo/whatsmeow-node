import { describe, it, beforeAll } from "vitest";
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
});
