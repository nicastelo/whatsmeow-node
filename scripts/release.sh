#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/release.sh <major|minor|patch>
# Bumps version, opens CHANGELOG for editing, commits, tags, and pushes.

if [ $# -ne 1 ] || [[ ! "$1" =~ ^(major|minor|patch)$ ]]; then
  echo "Usage: $0 <major|minor|patch>"
  exit 1
fi

BUMP="$1"

# Ensure we're on main with clean working tree
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "Error: must be on main branch (currently on $BRANCH)"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: working tree is not clean"
  exit 1
fi

git pull --ff-only origin main

# Bump version
cd ts
NEW_VERSION=$(npm version "$BUMP" --no-git-tag-version | sed 's/^v//')
cd ..

echo ""
echo "Version bumped to $NEW_VERSION"
echo ""
echo "Update CHANGELOG.md with the new release notes."
echo "Press Enter to open your editor, or Ctrl+C to abort."
read -r

# Open CHANGELOG in editor
${EDITOR:-vi} CHANGELOG.md

# Confirm
echo ""
echo "Ready to commit, tag v$NEW_VERSION, and push?"
echo "Press Enter to continue, or Ctrl+C to abort."
read -r

git add ts/package.json ts/package-lock.json CHANGELOG.md
git commit -m "Release v$NEW_VERSION"
git tag "v$NEW_VERSION"
git push origin main
git push origin "v$NEW_VERSION"

echo ""
echo "Pushed v$NEW_VERSION — release workflow will build and publish to npm."
echo "https://github.com/nicastelo/whatsmeow-node/actions"
