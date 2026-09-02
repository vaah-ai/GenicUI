# Task M3-T3 — find_ui_component tool

> **Milestone:** M3 (Tool Surface: MCP + 4 Public Tools)
> **Manifest feature:** F15 (find_ui_component)
> **Priority:** High
> **Status:** ✅ Completed
> **Estimated Effort:** 2 days

## Description

Implement `find_ui_component`: agent searches the component catalog by query. For MVP, starts with a stub in-memory catalog (W3) that returns a hard-coded DataTable; F37 registry provides the full catalog later (W7). Returns component name, version, propsSchema, events, and examples.

## Task Goals

- Exact tag match returns 1 result (F15-AC1)
- No match → empty result with reason (F15-AC2)
- Ambiguous match → disambiguation candidates (F15-AC3)

## Implementation Plan

### Steps

1. Implement `find_ui_component` handler with in-memory stub catalog
2. Implement query matching: exact tag, fuzzy, disambiguation
3. Return `{ name, version, propsSchema, events, examples }`
4. Write integration test: exact match returns 1 (F15-AC1)
5. Write integration test: no match with reason (F15-AC2)
6. Write integration test: ambiguous match (F15-AC3)

## Acceptance Criteria

- Exact tag match returns 1 result with name/version/propsSchema/events/examples
- No match → empty result with reason
- Ambiguous match → disambiguation field lists candidates

## Completion Criteria

- [x] All acceptance criteria above pass
- [x] `bun run test` exits green (186 pass, 0 fail)
- [x] `bun run lint` reports zero errors
- [x] `bun run build` succeeds
- [x] Coverage target met: 90% tool handlers (18 catalog tests + 13 MCP tests)

## Dependencies

- **Requires:** M1-T2 (F2), M3-T1 (F13) — F37 (registry) is soft dep; stub OK for MVP
- **Blocks:** M3-T4 (F16 — render_component)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F15]`
- Per-feature: `docs/requirements/specs/features/feature-015-find-ui-component-tool.md`
