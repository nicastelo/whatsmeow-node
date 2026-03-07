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

  it("downloadMediaWithPath downloads using direct path and keys", async () => {
    const media = await client.uploadMedia(TEST_IMAGE, "image");
    // downloadMediaWithPath needs raw byte arrays for hashes/key.
    // Since uploadMedia returns base64 strings, we decode them.
    const decodeBase64 = (s: string) => Array.from(Buffer.from(s, "base64"));
    const path = await client.downloadMediaWithPath({
      directPath: media.directPath,
      encFileHash: decodeBase64(media.fileEncSHA256),
      fileHash: decodeBase64(media.fileSHA256),
      mediaKey: decodeBase64(media.mediaKey),
      fileLength: media.fileLength,
      mediaType: "image",
    });
    expect(path).toBeTruthy();
    expect(typeof path).toBe("string");

    const { unlinkSync } = await import("node:fs");
    try {
      unlinkSync(path);
    } catch {
      /* ignore */
    }
  });

  it("downloadAny downloads from a sent image message", async () => {
    // Upload an image, send it to self, then download via downloadAny
    const media = await client.uploadMedia(TEST_IMAGE, "image");
    const imageMsg = {
      imageMessage: {
        URL: media.URL,
        directPath: media.directPath,
        mediaKey: media.mediaKey,
        fileEncSHA256: media.fileEncSHA256,
        fileSHA256: media.fileSHA256,
        fileLength: String(media.fileLength),
        mimetype: "image/jpeg",
      },
    };
    const path = await client.downloadAny(imageMsg);
    expect(path).toBeTruthy();
    expect(typeof path).toBe("string");

    // Clean up temp file
    const { unlinkSync } = await import("node:fs");
    try {
      unlinkSync(path);
    } catch {
      /* ignore */
    }
  });
});
