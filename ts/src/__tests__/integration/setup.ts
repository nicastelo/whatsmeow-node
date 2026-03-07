import { beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { createClient } from "../../index.js";
import type { WhatsmeowClient } from "../../client.js";

const SESSION_DB = process.env.E2E_SESSION_DB ?? resolve(__dirname, "../../../session.db");
const BINARY_PATH = process.env.E2E_BINARY_PATH ?? resolve(__dirname, "../../../../whatsmeow-node");
const CONNECT_TIMEOUT = 30_000;
const COMMAND_TIMEOUT = 15_000;

export let client: WhatsmeowClient;
export let selfJid: string;

export const TEST_PHONE = process.env.TEST_PHONE ?? "";
export const testJid = TEST_PHONE ? `${TEST_PHONE.replace(/^\+/, "")}@s.whatsapp.net` : "";

export const skip =
  !process.env.WHATSMEOW_INTEGRATION || !existsSync(SESSION_DB) || !existsSync(BINARY_PATH);

let setupDone = false;

export function setupClient() {
  beforeAll(async () => {
    if (setupDone) return;
    setupDone = true;

    client = createClient({
      store: `file:${SESSION_DB}`,
      binaryPath: BINARY_PATH,
      commandTimeout: COMMAND_TIMEOUT,
    });

    const init = await client.init();
    if (!init.jid) throw new Error("Not paired — run pair.ts first");
    selfJid = init.jid;

    const connected = new Promise<void>((res, rej) => {
      const timer = setTimeout(() => rej(new Error("connect timeout")), CONNECT_TIMEOUT);
      client.once("connected", () => {
        clearTimeout(timer);
        res();
      });
      client.once("logged_out", (data) => {
        clearTimeout(timer);
        rej(new Error(`Session expired: ${data.reason}`));
      });
    });
    await client.connect();
    await connected;
  }, CONNECT_TIMEOUT + 5_000);

  afterAll(async () => {
    // Only the last file to run should tear down.
    // Vitest runs afterAll per-file, so we skip teardown here.
    // The process exit will clean up the Go binary.
  });
}

/** Ensure the client is connected (useful after connection.test.ts disconnect/reconnect). */
export async function ensureConnected() {
  if (await client.isConnected()) return;
  const reconnected = new Promise<void>((res, rej) => {
    const timer = setTimeout(() => rej(new Error("reconnect timeout")), 15_000);
    client.once("connected", () => {
      clearTimeout(timer);
      res();
    });
  });
  await client.connect();
  await reconnected;
}
