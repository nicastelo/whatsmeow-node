import { describe, it, beforeAll } from "vitest";
import { client, testJid, skip, setupClient, TEST_PHONE, ensureConnected } from "./setup.js";

describe.skipIf(skip)("presence", () => {
  setupClient();
  beforeAll(() => ensureConnected());

  it("sendPresence available", async () => {
    await client.sendPresence("available");
  });

  it("sendPresence unavailable", async () => {
    await client.sendPresence("unavailable");
  });

  it("sendChatPresence composing", { skip: !TEST_PHONE }, async () => {
    await client.sendChatPresence(testJid, "composing");
  });

  it("subscribePresence succeeds", { skip: !TEST_PHONE }, async () => {
    await client.subscribePresence(testJid);
  });
});
