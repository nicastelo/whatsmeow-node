import { describe, it, expect } from "vitest";
import { client, selfJid, skip, setupClient } from "./setup.js";

describe.skipIf(skip)("connection", () => {
  setupClient();

  it("init returns jid for paired session", () => {
    expect(selfJid).toBeTruthy();
    expect(selfJid).toContain("@s.whatsapp.net");
  });

  it("isConnected returns true", async () => {
    expect(await client.isConnected()).toBe(true);
  });

  it("isLoggedIn returns true", async () => {
    expect(await client.isLoggedIn()).toBe(true);
  });

  it("waitForConnection returns true when already connected", async () => {
    expect(await client.waitForConnection(5_000)).toBe(true);
  });

  it("disconnect and reconnect", async () => {
    await client.disconnect();
    expect(await client.isConnected()).toBe(false);

    const reconnected = new Promise<void>((res, rej) => {
      const timer = setTimeout(() => rej(new Error("reconnect timeout")), 15_000);
      client.once("connected", () => {
        clearTimeout(timer);
        res();
      });
    });
    await client.connect();
    await reconnected;

    expect(await client.isConnected()).toBe(true);
  });
});
