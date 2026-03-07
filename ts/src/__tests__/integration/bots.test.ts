import { describe, it, expect, beforeAll } from "vitest";
import { client, skip, setupClient, ensureConnected } from "./setup.js";

describe.skipIf(skip)("bots", () => {
  setupClient();
  beforeAll(() => ensureConnected());

  let botList: Array<{ botJid: string; personaId: string }>;

  it("getBotListV2 returns array", async () => {
    try {
      botList = await client.getBotListV2();
      expect(Array.isArray(botList)).toBe(true);
    } catch (err: unknown) {
      // Bot API may not be available in all regions
      const msg = (err as Error).message;
      expect(msg).not.toContain("invalid args");
      botList = [];
    }
  });

  it("getBotProfiles returns profiles for available bots", async (ctx) => {
    if (!botList || botList.length === 0) {
      ctx.skip();
      return;
    }
    const profiles = await client.getBotProfiles(botList.slice(0, 2));
    expect(Array.isArray(profiles)).toBe(true);
  });
});
