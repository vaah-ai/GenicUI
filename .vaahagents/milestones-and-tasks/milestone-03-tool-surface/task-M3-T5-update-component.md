# Task M3-T5 — update_component (JSON-Patch mode + replace fallback)

> **Milestone:** M3 (Tool Surface: MCP + 4 Public Tools)
> **Manifest feature:** F17 (update_component)
> **Priority:** Critical
> **Status:** ✅ Completed
> **Estimated Effort:** 3-5 days

## Description

Implement `update_component` with discriminated union: JSON-Patch primary (`{ componentId, patch: JsonPatch[] }`) and full-replace fallback (`{ componentId, merge: Record<string, any> }`). Concurrent updates are serialized with no torn state.

## Task Goals

- Valid patches → `STATE_DELTA` (F17-AC1)
- Patch reject → fall back to `STATE_SNAPSHOT` (F17-AC2)
- Replace mode with full props → `STATE_SNAPSHOT` (F17-AC3)
- Concurrent updates serialized, no torn state (F17-AC4)
- Invalid patch path → -32004 (F17-AC5)

## Implementation Plan

### Pre-Implementation Analysis

- Effort = L (3-5 days) — invoke `brainstorming` if approach unclear
- Depends on M1-T4 (F4 — JSON-Patch engine) and M3-T4 (F16 — render_component)
- Invoke `sequential-thinking` for concurrent update serialization

### Steps

1. Implement discriminated union: `patch` (primary) vs `merge` (fallback)
2. Apply JSON-Patch via JsonPatchEngine; on failure, emit STATE_SNAPSHOT
3. Implement replace mode: full props → STATE_SNAPSHOT
4. Implement concurrent update serialization: lock per componentId
5. Validate patch paths against component schema
6. Write integration test: valid patches → STATE_DELTA (F17-AC1)
7. Write integration test: patch reject → STATE_SNAPSHOT (F17-AC2)
8. Write integration test: replace mode → STATE_SNAPSHOT (F17-AC3)
9. Write integration test: concurrent updates (F17-AC4)
10. Write integration test: invalid patch path → -32004 (F17-AC5)

## Acceptance Criteria

- Valid patches → `STATE_DELTA`
- Patch reject → fall back to `STATE_SNAPSHOT`
- Replace mode with full props → `STATE_SNAPSHOT`
- Concurrent updates serialized, no torn state
- Invalid patch path → -32004

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds
- [ ] Coverage target met: 90% tool handlers

## Dependencies

- **Requires:** M1-T4 (F4), M3-T1 (F13), M3-T4 (F16)
- **Blocks:** M4-T5 (F29 — runtime engine)

## Documentation References

- Manifest: `.vaahagents/requirements/specs/manifest.json` → `features[F17]`
- Per-feature: `.vaahagents/requirements/specs/features/feature-017-update-component-tool.md`
- Tool contracts: `.vaahagents/requirements/idea/consolidated-requirements.md` §D
