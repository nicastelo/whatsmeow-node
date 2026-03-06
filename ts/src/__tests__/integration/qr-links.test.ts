import { describe, it, expect, beforeAll } from "vitest";
import { client, skip, setupClient, ensureConnected } from "./setup.js";

describe.skipIf(skip)("qr-links", () => {
  setupClient();
  beforeAll(() => ensureConnected());

  let firstLink: string;

  it("getContactQRLink returns a link", async () => {
    firstLink = await client.getContactQRLink();
    expect(typeof firstLink).toBe("string");
    expect(firstLink.length).toBeGreaterThan(0);
  });

  it("getContactQRLink with revoke returns a different link", async () => {
    expect(firstLink).toBeTruthy();
    const newLink = await client.getContactQRLink(true);
    expect(typeof newLink).toBe("string");
    expect(newLink.length).toBeGreaterThan(0);
    expect(newLink).not.toBe(firstLink);
  });

  it("resolveContactQRLink resolves own link", async () => {
    const link = await client.getContactQRLink();
    const target = await client.resolveContactQRLink(link);
    expect(target).toHaveProperty("jid");
    expect(target).toHaveProperty("type");
    expect(target).toHaveProperty("pushName");
  });
});
