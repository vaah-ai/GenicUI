# Task M3-T4 — render_component tool

> **Milestone:** M3 (Tool Surface: MCP + 4 Public Tools)
> **Manifest feature:** F16 (render_component)
> **Priority:** Critical
> **Status:** ✅ Completed
> **Estimated Effort:** 3-5 days

## Description

Implement `render_component`: validates props via `GenicSchema<T>`, allocates a channel + componentId, emits `STATE_SNAPSHOT` then `component.mounted`. This is the primary agent → UI path — the moment the AI agent renders a component in the browser.

## Task Goals

- Valid props → `STATE_SNAPSHOT` + `component.mounted` emitted (F16-AC1)
- Invalid props → -32003 (F16-AC2)
- Idempotency key reuses componentId (F16-AC3)
- URI not found → -32001 (F16-AC4)

## Implementation Plan

### Pre-Implementation Analysis

- Effort = L (3-5 days) — invoke `brainstorming` if approach unclear
- Depends on M3-T3 (F15 — find_ui_component) and M1-T2 (F2 — schema)

### Steps

1. Implement `render_component` handler: validate props via GenicSchema
2. Allocate channel + componentId: `${prefix}-${sessionId.slice(0,8)}-${ulid()}`
3. Emit `STATE_SNAPSHOT` followed by `component.mounted` event
4. Implement idempotency: `clientRequestId` → reuse componentId
5. Implement URI resolution: -32001 for unknown URIs
6. Write integration test: happy path emits STATE_SNAPSHOT + mounted (F16-AC1)
7. Write integration test: invalid props → -32003 (F16-AC2)
8. Write integration test: idempotency reuse (F16-AC3)
9. Write integration test: URI not found → -32001 (F16-AC4)

## Acceptance Criteria

- Valid props → `STATE_SNAPSHOT` + `component.mounted` emitted
- Invalid props → -32003
- Idempotency key reuses componentId
- URI not found → -32001

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds
- [ ] Coverage target met: 90% tool handlers

## Dependencies

- **Requires:** M1-T2 (F2), M3-T1 (F13), M3-T3 (F15)
- **Blocks:** M3-T5 (F17 — update_component)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F16]`
- Per-feature: `docs/requirements/specs/features/feature-016-render-component-tool.md`
- Tool contracts: `docs/requirements/idea/consolidated-requirements.md` §D
