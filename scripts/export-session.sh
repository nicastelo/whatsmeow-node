#!/usr/bin/env bash
set -euo pipefail

# Encrypt a session.db for storage in the repo. The passphrase is stored
# as a GitHub secret (E2E_SESSION_KEY), the encrypted file is committed.
#
# Usage:
#   1. Pair first:  cd ts && npx tsx examples/pair.ts
#   2. Export:       ./scripts/export-session.sh ts/session.db
#   3. Commit:       git add .e2e-session.db.gpg && git commit -m "Update E2E session"
#   4. Set secret:   gh secret set E2E_SESSION_KEY --body "<your-passphrase>"

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

OUT="$(git rev-parse --show-toplevel)/.e2e-session.db.enc"

if [ -n "${E2E_SESSION_KEY:-}" ]; then
  PASSPHRASE="$E2E_SESSION_KEY"
else
  read -rsp "Passphrase: " PASSPHRASE
  echo
fi

openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in "$DB" -out "$OUT" -pass "pass:$PASSPHRASE"

SIZE=$(wc -c < "$OUT" | tr -d ' ')
echo "Encrypted to $OUT ($SIZE bytes)"
echo ""
echo "Next steps:"
echo "  git add .e2e-session.db.enc && git commit -m 'Update E2E session'"
echo "  gh secret set E2E_SESSION_KEY --body '<your-passphrase>'"
