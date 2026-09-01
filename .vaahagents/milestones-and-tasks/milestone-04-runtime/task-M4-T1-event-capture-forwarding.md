# Task M4-T1 — Event capture from Custom Elements

> **Milestone:** M4 (Runtime: Events, Web Components, Runtime Engine)
> **Manifest feature:** F19 (Event capture from Custom Elements)
> **Priority:** High
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2 days

## Description

Implement event capture from Custom Elements: `composed: true` events bubble across Shadow DOM boundaries to the runtime. Event payload validated against declared event schema. Per-component rate cap of 200 events/second.

## Task Goals

- `composed: true` required for cross-Shadow-DOM capture (F19-AC1)
- Event payload validated against declared event schema (F19-AC2)
- Per-component 200/s event rate cap (F19-AC3)

## Implementation Plan

### Steps

1. Implement event capture: listen for `composed: true` events on shadow host
2. Validate event payload against declared `detailSchema`
3. Implement per-component rate limiter: 200 events/s
4. Forward events to event bus (F20)
5. Write integration test: composed:true required (F19-AC1)
6. Write integration test: event payload validation (F19-AC2)
7. Write load test: 200/s rate cap (F19-AC3)

## Acceptance Criteria

- `composed: true` required for cross-Shadow-DOM capture
- Event payload validated against declared event schema
- Per-component 200/s event rate cap

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds

## Dependencies

- **Requires:** M3-T6 (F18)
- **Blocks:** M4-T2 (F20 — event bus)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F19]`
- Per-feature: `docs/requirements/specs/features/feature-019-event-capture-forwarding.md`
