import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "node:path";
import { client, testJid, skip, setupClient, TEST_PHONE, ensureConnected } from "./setup.js";

const TEST_IMAGE = resolve(__dirname, "fixtures/test-image.jpg");

describe.skipIf(skip || !TEST_PHONE)("media", () => {
  setupClient();
  beforeAll(() => ensureConnected());

  it("uploadMedia returns media metadata", async () => {
    const media = await client.uploadMedia(TEST_IMAGE, "image");
    expect(media.URL).toBeTruthy();
    expect(media.directPath).toBeTruthy();
    expect(media.mediaKey).toBeTruthy();
    expect(media.fileEncSHA256).toBeTruthy();
    expect(media.fileSHA256).toBeTruthy();
    expect(media.fileLength).toBeGreaterThan(0);
  });

  it("upload + send image via sendRawMessage", async () => {
    const media = await client.uploadMedia(TEST_IMAGE, "image");
    const resp = await client.sendRawMessage(testJid, {
      imageMessage: {
        ...media,
        mimetype: "image/jpeg",
        caption: "Integration test image",
      },
    });
    expect(resp.id).toBeTruthy();
    expect(resp.timestamp).toBeGreaterThan(0);
  });
});
