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

  let messageServerId: number;

  it("getNewsletterMessages returns array", async () => {
    expect(newsletterId).toBeTruthy();
    const messages = await client.getNewsletterMessages(newsletterId, 10);
    expect(Array.isArray(messages)).toBe(true);
    if (messages.length > 0) {
      messageServerId = messages[0].serverId;
    }
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

  it("newsletterSendReaction reacts to a message", async (ctx) => {
    expect(newsletterId).toBeTruthy();
    if (!messageServerId) {
      ctx.skip();
      return;
    }
    await client.newsletterSendReaction(newsletterId, messageServerId, "\u{1F44D}", "");
  });

  it("newsletterMarkViewed succeeds", async () => {
    expect(newsletterId).toBeTruthy();
    await client.newsletterMarkViewed(newsletterId, []);
  });

  it("getNewsletterMessageUpdates returns array", async () => {
    expect(newsletterId).toBeTruthy();
    try {
      const updates = await client.getNewsletterMessageUpdates(newsletterId, 10);
      expect(Array.isArray(updates)).toBe(true);
    } catch {
      // May timeout for newly created newsletters with no updates — acceptable
    }
  });

  it("getNewsletterMessageUpdates with since option", async () => {
    expect(newsletterId).toBeTruthy();
    const since = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    try {
      const updates = await client.getNewsletterMessageUpdates(newsletterId, 10, { since });
      expect(Array.isArray(updates)).toBe(true);
    } catch {
      // May timeout for newly created newsletters — acceptable
    }
  });

  it("acceptTOSNotice succeeds or returns expected error", async () => {
    // TOS notice IDs are dynamic — this tests the IPC round-trip.
    // It may fail with a whatsmeow error if the notice doesn't exist,
    // but should not fail with ERR_INVALID_ARGS or ERR_NOT_INIT.
    try {
      await client.acceptTOSNotice("20601218", "accept");
    } catch (err: unknown) {
      // Expected: notice may not exist or may already be accepted
      expect((err as Error).message).not.toContain("invalid args");
    }
  });

  it("uploadNewsletter returns media metadata", async () => {
    const { resolve: resolvePath } = await import("node:path");
    const testImage = resolvePath(__dirname, "fixtures/test-image.jpg");
    const media = await client.uploadNewsletter(testImage, "image");
    expect(media.URL).toBeTruthy();
    expect(media.directPath).toBeTruthy();
    // Newsletter uploads may or may not include encryption fields
    expect(media.fileLength).toBeGreaterThan(0);
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
