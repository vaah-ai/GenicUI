#!/usr/bin/env bash
# examples/playground-ecommerce/scripts/check-isolation.sh
#
# Workspace-isolation gate (M5.2-T2-1).
#
# Asserts that NO file under packages/ has been modified on this branch
# (with three whitelisted exceptions: the deletion of vaahstore.ts, its
# test, its fixtures directory, AND the minimal follow-up edit that
# removes the now-dangling `./vaahstore.js` import from the core
# provider registry).
#
# Runs against the develop branch (the merge target). If diffing against
# develop shows ANY packages/ edit outside the whitelisted files, exits 1.
#
# Note: leading `--` after the subcommand is required when pathspec
# excludes collide with a branch-spec argument, otherwise git treats
# the exclude list as the merge-base side. This bug burned an hour
# of debugging during M5.2-T2-1 — keep the syntax in this script.

set -euo pipefail
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

echo "[check-isolation] verifying zero new edits under packages/ ..."

# Whitelist the delete-only zones that M5.2-T2-1 introduces, plus the
# single minimal follow-up edit that removes the now-dangling
# `./vaahstore.js` import from the core provider registry (same scope
# as the deletion — without it, `@genicui/server` won't resolve).
# Anything else under packages/ that has been touched → FAIL.
git diff --quiet develop..HEAD \
  -- packages/ \
  ':!packages/server/src/chat/providers/vaahstore.ts' \
  ':!packages/server/src/chat/providers/__tests__/vaahstore.test.ts' \
  ':!packages/server/src/chat/providers/__fixtures__/vaahstore' \
  ':!packages/server/src/chat/providers/registry.ts' \
  || {
    echo "FAIL: edits detected under packages/ (outside the vaahstore move zone)" >&2
    git diff --stat develop..HEAD \
      -- packages/ \
      ':!packages/server/src/chat/providers/vaahstore.ts' \
      ':!packages/server/src/chat/providers/__tests__/vaahstore.test.ts' \
      ':!packages/server/src/chat/providers/__fixtures__/vaahstore' \
      ':!packages/server/src/chat/providers/registry.ts'
    exit 1
  }

# Also gate two adjacent isolation-guard zones that would leak changes
# from this task into adjacent workspaces.
git diff --quiet develop..HEAD -- examples/playground/ package.json \
  || {
    echo "FAIL: edits detected under examples/playground/ or root package.json" >&2
    git diff --stat develop..HEAD -- examples/playground/ package.json
    exit 1
  }

echo "[check-isolation] workspace isolation holds"
