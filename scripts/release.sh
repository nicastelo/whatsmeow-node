#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/release.sh <major|minor|patch>
# Bumps version, auto-generates CHANGELOG entry, syncs versions, commits, tags, and pushes.

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

# Sync all platform package versions
node scripts/sync-versions.mjs

# Auto-generate changelog entry from GitHub
PREV_TAG=$(git tag --sort=-v:refname | head -1)
DATE=$(date +%Y-%m-%d)
HEADER="## [${NEW_VERSION}] - ${DATE}"

echo ""
echo "Generating changelog from GitHub..."

GENERATED=""
if [ -n "$PREV_TAG" ]; then
  GENERATED=$(gh api repos/:owner/:repo/releases/generate-notes \
    -f tag_name="v${NEW_VERSION}" \
    -f target_commitish=main \
    -f previous_tag_name="${PREV_TAG}" \
    --jq '.body' 2>/dev/null || true)
fi

# Fallback to git log if GitHub API fails
if [ -z "$GENERATED" ]; then
  echo "GitHub API unavailable, using git log..."
  if [ -n "$PREV_TAG" ]; then
    GENERATED=$(git log "${PREV_TAG}..HEAD" --pretty=format:"- %s" --no-merges)
  else
    GENERATED=$(git log --pretty=format:"- %s" --no-merges -20)
  fi
fi

# Build the new entry
ENTRY=$(printf '%s\n\n%s\n' "$HEADER" "$GENERATED")

# Insert into CHANGELOG.md before the first existing ## [ entry
INSERT_LINE=$(grep -n "^## \[" CHANGELOG.md | head -1 | cut -d: -f1)
if [ -n "$INSERT_LINE" ]; then
  {
    head -n $((INSERT_LINE - 1)) CHANGELOG.md
    printf '%s\n\n' "$ENTRY"
    tail -n +${INSERT_LINE} CHANGELOG.md
  } > /tmp/CHANGELOG_NEW.md
else
  {
    cat CHANGELOG.md
    printf '\n%s\n' "$ENTRY"
  } > /tmp/CHANGELOG_NEW.md
fi

# Add compare link
if [ -n "$PREV_TAG" ]; then
  LINK="[${NEW_VERSION}]: https://github.com/nicastelo/whatsmeow-node/compare/${PREV_TAG}...v${NEW_VERSION}"
  LINK_LINE=$(grep -n "^\[" /tmp/CHANGELOG_NEW.md | head -1 | cut -d: -f1)
  if [ -n "$LINK_LINE" ]; then
    {
      head -n $((LINK_LINE - 1)) /tmp/CHANGELOG_NEW.md
      echo "$LINK"
      tail -n +${LINK_LINE} /tmp/CHANGELOG_NEW.md
    } > /tmp/CHANGELOG_NEW2.md
    mv /tmp/CHANGELOG_NEW2.md /tmp/CHANGELOG_NEW.md
  else
    echo "$LINK" >> /tmp/CHANGELOG_NEW.md
  fi
fi

cp /tmp/CHANGELOG_NEW.md CHANGELOG.md

echo ""
echo "--- Generated CHANGELOG entry ---"
echo "$ENTRY"
echo "---------------------------------"
echo ""
echo "Review CHANGELOG.md and edit if needed."
echo "Press Enter to open your editor, or type 'skip' to continue as-is."
read -r REPLY

if [ "$REPLY" != "skip" ]; then
  ${EDITOR:-vi} CHANGELOG.md
fi

# Confirm
echo ""
echo "Ready to commit, tag v$NEW_VERSION, and push?"
echo "Press Enter to continue, or Ctrl+C to abort."
read -r

git add ts/package.json npm/*/package.json CHANGELOG.md
git commit -m "Release v$NEW_VERSION"
git tag "v$NEW_VERSION"
git push origin main "v$NEW_VERSION"

echo ""
echo "Pushed v$NEW_VERSION — release workflow will build and publish to npm."
echo "https://github.com/nicastelo/whatsmeow-node/actions"
