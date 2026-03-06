import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const canRun =
  !!process.env.WHATSMEOW_INTEGRATION &&
  existsSync(process.env.E2E_SESSION_DB ?? resolve(__dirname, "session.db")) &&
  existsSync(process.env.E2E_BINARY_PATH ?? resolve(__dirname, "../whatsmeow-node"));

export default defineConfig({
  test: {
    include: ["src/__tests__/integration/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    sequence: { concurrent: false },
    coverage: {
      enabled: canRun && !!process.env.COVERAGE,
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/__tests__/**"],
      reporter: ["text", "json-summary"],
    },
  },
});
