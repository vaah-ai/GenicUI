#!/usr/bin/env bash
# examples/playground-ecommerce/scripts/check-isolation.sh
#
# Workspace-isolation gate (M5.2-T2-1).
#
# Asserts that ONLY the four whitelisted packages/ files have been
# modified/deleted on this branch (relative to `develop`). Anything else
# under packages/ means someone snuck a core edit past the M5.2
# redirect — exit 1.
#
# Whitelisted files (the vaahstore move + its dangling-import follow-up):
#   - packages/server/src/chat/providers/vaahstore.ts           (delete)
#   - packages/server/src/chat/providers/__tests__/vaahstore.test.ts (delete)
#   - packages/server/src/chat/providers/__fixtures__/vaahstore/        (delete)
#   - packages/server/src/chat/providers/registry.ts           (modify — remove dangling import)
#
# Adjacent isolation zones:
#   - examples/playground/       must be untouched
#   - root package.json          must be untouched
#
# Implementation note: `git diff` pathspec exclusions (`:!foo`) do not
# filter deletions, so we can't use them to whitelist a deleted file.
# Instead we collect the diff, then compare the changed-path set
# against the whitelist using plain bash + diff.

set -euo pipefail
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

echo "[check-isolation] verifying zero new edits under packages/ ..."

# Whitelist — all changes outside this list fail.
# NB: `git diff --name-only` reports deleted files with their basename
# only (`vaahstore.test.ts`), not the full path (`__tests__/vaahstore.test.ts`).
# Match the basename form on the `D`-side and the full path on the
# `M`-side, so the whitelist covers both rename-deletions AND the
# matching new file under the workspace.
WHITELIST=$(cat <<'WHITELIST_EOF'
packages/server/src/chat/providers/vaahstore.ts
packages/server/src/chat/providers/vaahstore.test.ts
packages/server/src/chat/providers/__fixtures__/vaahstore
packages/server/src/chat/providers/registry.ts
WHITELIST_EOF
)

# Changed file paths under packages/ vs develop.
CHANGED=$(mktemp)
git diff --name-only develop..HEAD -- packages/ | sort > "$CHANGED"

# Diff against the whitelist — anything in CHANGED that's NOT in the
# whitelist is an unauthorised edit.
UNEXPECTED=$(mktemp)
comm -23 "$CHANGED" <(echo "$WHITELIST" | sort) > "$UNEXPECTED" || true

if [ -s "$UNEXPECTED" ]; then
  echo "FAIL: edits detected under packages/ (outside the vaahstore move zone):" >&2
  sed 's/^/  /' "$UNEXPECTED" >&2
  echo "" >&2
  echo "Inspect with:" >&2
  echo "  git diff --stat develop..HEAD -- \$(cat $UNEXPECTED | head -1 | xargs dirname)" >&2
  rm -f "$CHANGED" "$UNEXPECTED"
  exit 1
fi

# Adjacent isolation zones
for zone in examples/playground package.json; do
  if ! git diff --quiet develop..HEAD -- "$zone"; then
    echo "FAIL: edits detected under $zone" >&2
    git diff --stat develop..HEAD -- "$zone"
    rm -f "$CHANGED" "$UNEXPECTED"
    exit 1
  fi
done

rm -f "$CHANGED" "$UNEXPECTED"
echo "[check-isolation] workspace isolation holds"
