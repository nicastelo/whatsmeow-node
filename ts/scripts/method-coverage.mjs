#!/usr/bin/env node
// Checks which public client methods have integration tests.
// Outputs a shields.io endpoint JSON badge and optionally a detailed report.
//
// Usage:
//   node scripts/method-coverage.mjs              # badge JSON to stdout
//   node scripts/method-coverage.mjs --report      # detailed report to stderr + badge to stdout

import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientSrc = readFileSync(resolve(__dirname, "../src/client.ts"), "utf8");
const testDir = resolve(__dirname, "../src/__tests__/integration");

// Extract public async method names (skip `call` — internal dispatch)
const methods = [...clientSrc.matchAll(/^\s+async (\w+)\(/gm)]
  .map((m) => m[1])
  .filter((name) => name !== "call");

// Read all test files into one string
const testFiles = readdirSync(testDir)
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => readFileSync(resolve(testDir, f), "utf8"))
  .join("\n");

const tested = [];
const untested = [];

for (const method of methods) {
  // Match client.methodName( in test files
  if (testFiles.includes(`client.${method}(`)) {
    tested.push(method);
  } else {
    untested.push(method);
  }
}

const pct = Math.round((tested.length / methods.length) * 100);
const color = pct >= 80 ? "brightgreen" : pct >= 60 ? "yellow" : "red";

const report = process.argv.includes("--report");
if (report) {
  console.error(`Method coverage: ${tested.length}/${methods.length} (${pct}%)\n`);
  console.error(`Tested (${tested.length}):`);
  for (const m of tested) console.error(`  ✓ ${m}`);
  console.error(`\nUntested (${untested.length}):`);
  for (const m of untested) console.error(`  ✗ ${m}`);
}

const badge = {
  schemaVersion: 1,
  label: "API coverage",
  message: `${tested.length}/${methods.length} (${pct}%)`,
  color,
};

process.stdout.write(JSON.stringify(badge) + "\n");
