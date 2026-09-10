# Task M4-T5 — Runtime engine (mount, patch, lifecycle)

> **Milestone:** M4 (Runtime: Events, Web Components, Runtime Engine)
> **Manifest feature:** F29 (Runtime engine)
> **Priority:** Critical
> **Status:** ✅ Completed (2026-09-03)
> **Estimated Effort:** 3-5 days

## Description

Implement the runtime engine: mounts components from `STATE_SNAPSHOT` within 50ms, patches from `STATE_DELTA` within 10ms, unmounts on `channel.closed`, and maintains module isolation (no window globals). This is the core loop that bridges server state to browser rendering.

## Task Goals

- `STATE_SNAPSHOT` → mount within 50ms (F29-AC1)
- `STATE_DELTA` → patch within 10ms (F29-AC2)
- `channel.closed` → unmount + dispose (F29-AC3)
- Module isolation — no window globals (F29-AC4)

## Implementation Plan

### Pre-Implementation Analysis

- Effort = L (3-5 days)
- Circular dependency with F21 (GenicElement): F29 depends on F21, F21 depends on F29
- Build F21 with stub runtime, then implement F29, then wire together

### Steps

1. Implement runtime engine: `mount(componentId, state)` → GenicElement
2. Implement `patch(componentId, delta)` → apply JSON-Patch to shadow DOM
3. Implement `unmount(componentId)` → dispose + cleanup
4. Implement module isolation: no window globals
5. Write integration test: snapshot mount <50ms (F29-AC1)
6. Write integration test: delta patch <10ms (F29-AC2)
7. Write integration test: channel closed → unmount (F29-AC3)
8. Write unit test: module isolation (F29-AC4)

## Acceptance Criteria

- `STATE_SNAPSHOT` → mount within 50ms
- `STATE_DELTA` → patch within 10ms
- `channel.closed` → unmount + dispose
- Module isolation — no window globals

## Completion Criteria

- [x] All acceptance criteria above pass
- [x] `bun run test` exits green (45 tests, 0 failures)
- [x] `bun run lint` reports zero errors
- [x] `bun run build` succeeds
- [x] Coverage target met: 70% client

## Delivery Summary

- **Files created:** `runtime/types.ts`, `runtime/runtime.ts`, `runtime/runtime.test.ts`, `runtime/index.ts` (4 files)
- **Files modified:** `src/index.ts` (added runtime re-exports)
- **Tests:** 26 new tests, 45 total client tests pass
- **RuntimeEngine** class with `onMessage(frame)` routing, `createRuntime()` factory
- Wires itself as RuntimeBridge into GenicElement via `setRuntimeBridge()`
- All 4 ACs verified: mount <50ms, patch <10ms, unmount on closed, no globals

## Dependencies

- **Requires:** M4-T4 (F21), M4-T3 (F24)
- **Blocks:** M5-T3 (F40 — PrimeVue registry)

## Documentation References

- Manifest: `.vaahagents/requirements/specs/manifest.json` → `features[F29]`
- Per-feature: `.vaahagents/requirements/specs/features/feature-029-runtime-engine.md`
