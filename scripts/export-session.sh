#!/usr/bin/env bash
set -euo pipefail

# Export a session.db as a base64 string for use as a GitHub Actions secret.
#
# Usage:
#   1. Pair first:  cd ts && npx tsx examples/pair.ts
#   2. Export:       ./scripts/export-session.sh ts/session.db
#   3. Set secret:   gh secret set E2E_SESSION_DB_B64 < session.b64
#
# Optional: set GH_PAT secret too (personal access token with repo scope)
# so the E2E workflow can update the session after each run.

if [ $# -ne 1 ]; then
  echo "Usage: $0 <path-to-session.db>"
  exit 1
fi

DB="$1"

if [ ! -f "$DB" ]; then
  echo "Error: $DB not found"
  exit 1
fi

# Checkpoint WAL into main db
sqlite3 "$DB" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true

OUT="${DB%.db}.b64"
base64 < "$DB" > "$OUT"

SIZE=$(wc -c < "$OUT" | tr -d ' ')
echo "Exported to $OUT ($SIZE bytes)"
echo ""
echo "Set it as a GitHub secret:"
echo "  gh secret set E2E_SESSION_DB_B64 < $OUT"
