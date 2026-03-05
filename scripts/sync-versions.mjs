#!/usr/bin/env node

// Syncs the version from ts/package.json to all platform packages
// and optionalDependencies. Run after bumping the version in ts/package.json.
//
// Usage: node scripts/sync-versions.js

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mainPkg = JSON.parse(readFileSync(resolve(root, "ts/package.json"), "utf8"));
const version = mainPkg.version;

console.log(`Syncing version: ${version}`);

// Update platform packages
const npmDir = resolve(root, "npm");
for (const dir of readdirSync(npmDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const pkgPath = resolve(npmDir, dir.name, "package.json");
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    pkg.version = version;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log(`  ${pkg.name} -> ${version}`);
  } catch {}
}

// Update optionalDependencies in main package
if (mainPkg.optionalDependencies) {
  for (const dep of Object.keys(mainPkg.optionalDependencies)) {
    mainPkg.optionalDependencies[dep] = version;
  }
  writeFileSync(resolve(root, "ts/package.json"), JSON.stringify(mainPkg, null, 2) + "\n");
  console.log(`  optionalDependencies -> ${version}`);
}

console.log("Done.");
