#!/usr/bin/env node
// Reads coverage/coverage-summary.json and outputs a shields.io endpoint JSON badge.
// Usage: node scripts/coverage-badge.mjs > badge.json

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const summary = JSON.parse(
  readFileSync(resolve(__dirname, "../coverage/coverage-summary.json"), "utf8"),
);

const pct = Math.round(summary.total.lines.pct);
const color = pct >= 80 ? "brightgreen" : pct >= 60 ? "yellow" : "red";

const badge = {
  schemaVersion: 1,
  label: "integration coverage",
  message: `${pct}%`,
  color,
};

process.stdout.write(JSON.stringify(badge) + "\n");
