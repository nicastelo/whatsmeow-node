import { describe, it, expect } from "vitest";
import { client, skip, setupClient } from "./setup.js";

const BUSINESS_JID = process.env.TEST_BUSINESS_JID ?? "";
const BUSINESS_LINK = process.env.TEST_BUSINESS_LINK ?? "";

describe.skipIf(skip)("business", () => {
  setupClient();

  it("getBusinessProfile returns profile or errors for non-business", { skip: !BUSINESS_JID }, async () => {
    const profile = await client.getBusinessProfile(BUSINESS_JID);
    expect(profile).toHaveProperty("jid");
  });

  it("resolveBusinessMessageLink resolves a link", { skip: !BUSINESS_LINK }, async () => {
    const target = await client.resolveBusinessMessageLink(BUSINESS_LINK);
    expect(target).toHaveProperty("jid");
    expect(target).toHaveProperty("pushName");
  });
});
