# Task M5.1-T2 — Corpus reconciliation + cross-ref rewrite

> **Milestone:** M5.1 (Documentation Site)
> **Manifest feature:** F69a (new — corpus reconciliation)
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 1 day

## Description

The existing requirements corpus lives in two divergent trees: `.vaahagents/requirements/` (the planner-prompt source-of-truth, frozen pipeline snapshot, 39 files with 125 internal references) and `docs/specs/` + `docs/idea/` (newer, active source-of-truth, contains files that exist ONLY there — `feature-043-chat-bridge-prop-sanitization.md`, `feature-e2e-testing-infrastructure.md`). Reconcile into one canonical tree at `.vaahagents/requirements/` (per user decision in Step 1 of the planner session), seeded from the **newer** `docs/specs/` + `docs/idea/` content. Archive `.vaahagents/requirements/` so history is preserved.

This unblocks T3 (Information Architecture) and T8 (API Reference) by giving them a single source-of-truth to mine.

## Task Goals

- `git mv docs/specs → .vaahagents/requirements/specs` (preserve history)
- `git mv docs/idea → .vaahagents/requirements/idea` (preserve history)
- `git mv .vaahagents/requirements → .vaahagents/requirements/_archive` (preserve history, demote visibility)
- Rewrite all 125 `.vaahagents/requirements` references across 39 files to `.vaahagents/requirements`
- Rewrite all 552 relative `.md` links (78 files) — but defer 552-to-Docus-route mapping to T3 + per-page authoring (this task handles only the corpus rebase, not the IA rewrite)

## Implementation Plan

### Pre-Implementation Analysis

- Inventory current corpus: confirm 105 markdown files + 2 manifests (32,128 lines), 0 images, 0 mermaid blocks (all diagrams are ASCII in fenced blocks — no asset migration needed)
- Inventory the 125 cross-references (`grep -r ".vaahagents/requirements" --include="*.md" --include="*.json"`); classify each as: corpus-internal (→ `.vaahagents/requirements`) vs. link into Docus route (→ defer to T3)
- Identify the 3 out-of-tree links that break regardless (`../../../poc/README.md`, `../ai-base-prompts/*`) — flag for manual review
- Plan the `git mv` sequence to preserve history (no force-push, no delete-then-add)

### Steps

1. `git mv docs/specs .vaahagents/requirements/specs` — preserves history
2. `git mv docs/idea .vaahagents/requirements/idea` — preserves history
3. `git mv .vaahagents/requirements .vaahagents/requirements/_archive` — preserves history under demoted visibility
4. Resolve conflicts if any spec file exists in both trees with different content (`diff -rq docs/specs _archive/specs` — newer file wins; log decisions in commit body)
5. Generate the 125-ref map: `grep -rl ".vaahagents/requirements" --include="*.md" --include="*.json"` → output to `.vaahagents/requirements/_archive/ref-rewrite-map.json` for review
6. Write a small migration script (Python or `sed -i`) that rewrites `.vaahagents/requirements/...` → `.vaahagents/requirements/...` in-place across the 39 affected files
7. Run the script on a dry-run branch; verify diffs are limited to path-only changes (no content drift); commit only when clean
8. Mark the 3 out-of-tree links (`../../../poc/README.md`, `../ai-base-prompts/*`) as `TODO(review)` with a code comment + file listing in the migration report
9. Document the final tree layout in `.vaahagents/requirements/README.md` (one-time artefact, archived after T8)

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `git` MCP | `git mv` with history preservation | Steps 1–3 |
| `filesystem` MCP | Bulk-read 39 affected files for ref-rewrite validation | Step 7 |
| `sequential-thinking` skill | Multi-step correctness proof for the rewrite script (idempotency, no double-rewrites) | Step 6 |

## Acceptance Criteria

- AC1: `.vaahagents/requirements/specs/manifest.json` exists and is identical to the pre-reconciliation `docs/specs/manifest.json` (modulo path)
- AC2: `.vaahagents/requirements/specs/roadmap.md` exists and contains all 12 weeks of plan content
- AC3: `.vaahagents/requirements/specs/features/feature-043-chat-bridge-prop-sanitization.md` exists (this file was ONLY in `docs/specs/`, not in `.vaahagents/requirements/`)
- AC4: `.vaahagents/requirements/_archive/` exists and contains the contents of the old `.vaahagents/requirements/` tree
- AC5: `grep -r ".vaahagents/requirements" --include="*.md" --include="*.json"` returns **zero** matches (the 125 refs are all rewritten) — except inside `.vaahagents/requirements/_archive/` itself (allowed)
- AC6: `git log --follow .vaahagents/requirements/specs/manifest.json` shows the full history from `docs/specs/manifest.json` (history preserved)
- AC7: The migration report at `.vaahagents/requirements/_archive/ref-rewrite-map.json` lists all 39 files touched, with before/after paths
- AC8: The 3 out-of-tree links are flagged in the migration report with `TODO(review)` markers
- AC9: No new file appears without its `git log --follow` history intact
- AC10: Total commit count for the migration is ≤ 3 (one per `git mv` + one for the rewrite)

## Completion Criteria

- [ ] All 10 acceptance criteria above pass
- [ ] `bun run lint` exits 0
- [ ] `git log --stat` shows clean three-commit history (mv + mv + mv + optional rewrite commit)
- [ ] No `.vaahagents/requirements` directory remains at top level (only inside `.vaahagents/requirements/_archive/`)

## Testing Checklist

- [ ] Unit: `diff -rq .vaahagents/requirements .vaahagents/requirements/_archive` returns zero (preserved tree)
- [ ] Unit: `diff -rq docs/specs .vaahagents/requirements/specs` returns zero (preserved tree)
- [ ] Unit: `grep -c ".vaahagents/requirements" .vaahagents/requirements/specs/manifest.json` returns 0 after rewrite
- [ ] Property: rerun the rewrite script — idempotent (second pass produces zero diff)
- [ ] Manual: open 5 random files from `.vaahagents/requirements/specs/` and verify links resolve
- [ ] No e2e (no UI affected)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
|---|---|---|---|---|
| M5.1-T2-01 | `git mv` three trees to `.vaahagents/requirements/` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T2-02 | Build the 125-ref map for review | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T2-03 | Write idempotent rewrite script + dry-run | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T2-04 | Apply rewrite + commit | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T2-05 | Flag 3 out-of-tree links for manual review | ⚪ Not Started | ✅ Yes | High |

## Dependencies

- **Requires:** None (the requirements tree is independent of the doc site scaffold)
- **Soft dependency:** T1 should have created `examples/docs/` first so the workspace doesn't conflict on the top-level `docs/` directory (this task removes `.vaahagents/requirements/` but creates `.vaahagents/requirements/` — no collision with `examples/docs/`)
- **Blocks:** T3 (IA reads from the canonical tree), T8 (API Reference cites per-package features from `.vaahagents/requirements/specs/features/`)

## Documentation References

- Existing corpus: `.vaahagents/requirements/` (pre-reconciliation, will become `_archive/`)
- Existing corpus: `docs/specs/` (the newer authoritative tree)
- Existing corpus: `docs/idea/` (consolidated requirements, locked decisions)
- Cross-ref map: `.vaahagents/requirements/_archive/ref-rewrite-map.json` (produced by this task)
- Migration decision rationale: see Step 1 of this planner session (user choice = "Reconcile into one canonical tree")

## Notes

- `git mv` is preferred over `mv + git add` because it preserves file history — if any reviewer wants to `git log --follow` a file later, the rename is recorded.
- The 552 relative `.md` links are NOT all rewritten in this task — many will become Docus routes after T3 reshapes the URL space. This task only handles corpus-internal paths.
- The 3 out-of-tree links (`../../../poc/README.md`, `../ai-base-prompts/*`) cannot be auto-rewritten because they're context-specific. Document them; let T6 (Concepts) or T7 (Guides) decide whether to keep, rewrite to Docus routes, or remove.
- `.vaahagents/` is gitignored by convention in some projects — verify before commit. If `.vaahagents/` is not gitignored, this task also creates a top-level `.gitignore` entry for `_archive/` so the historical artifacts don't pollute the working tree.
