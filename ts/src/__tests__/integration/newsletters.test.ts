import { describe, it, expect, beforeAll } from "vitest";
import { client, skip, setupClient, ensureConnected } from "./setup.js";

describe.skipIf(skip)("newsletters", () => {
  setupClient();
  beforeAll(() => ensureConnected());

  let newsletterId: string;
  const newsletterName = `test-newsletter-${Date.now()}`;

  it("createNewsletter creates a newsletter", async () => {
    const result = await client.createNewsletter(newsletterName, "Integration test newsletter");
    expect(result.id).toBeTruthy();
    expect(result.name).toBe(newsletterName);
    newsletterId = result.id;
  });

  it("getSubscribedNewsletters includes created newsletter", async () => {
    expect(newsletterId).toBeTruthy();
    const newsletters = await client.getSubscribedNewsletters();
    expect(Array.isArray(newsletters)).toBe(true);
    const found = newsletters.some((n) => n.id === newsletterId);
    expect(found).toBe(true);
  });

  it("getNewsletterInfo returns metadata", async () => {
    expect(newsletterId).toBeTruthy();
    const info = await client.getNewsletterInfo(newsletterId);
    expect(info.id).toBe(newsletterId);
    expect(info.name).toBe(newsletterName);
  });

  it("getNewsletterMessages returns array", async () => {
    expect(newsletterId).toBeTruthy();
    const messages = await client.getNewsletterMessages(newsletterId, 10);
    expect(Array.isArray(messages)).toBe(true);
  });

  it("newsletterSubscribeLiveUpdates returns duration", async () => {
    expect(newsletterId).toBeTruthy();
    const durationMs = await client.newsletterSubscribeLiveUpdates(newsletterId);
    expect(durationMs).toBeGreaterThan(0);
  });

  it("newsletterToggleMute succeeds", async () => {
    expect(newsletterId).toBeTruthy();
    await client.newsletterToggleMute(newsletterId, true);
  });

  it("newsletterMarkViewed succeeds", async () => {
    expect(newsletterId).toBeTruthy();
    await client.newsletterMarkViewed(newsletterId, []);
  });

  // Can't unfollow/follow your own newsletter (you're the owner, 405 error).
  // Test follow/unfollow only on an external newsletter we're subscribed to.
  it("followNewsletter and unfollowNewsletter on an external newsletter", async (ctx) => {
    const newsletters = await client.getSubscribedNewsletters();
    const external = newsletters.find((n) => n.id !== newsletterId);
    if (!external) {
      ctx.skip();
      return;
    }
    try {
      await client.unfollowNewsletter(external.id);
      await client.followNewsletter(external.id);
    } catch (err: unknown) {
      // 405 can still happen if newsletter doesn't allow unfollowing
      expect((err as Error).message).toMatch(/not allowed|forbidden/i);
    }
  });
});
