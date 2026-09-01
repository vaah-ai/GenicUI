# Task M4-T2 — Internal event bus (post-emit hook + backpressure)

> **Milestone:** M4 (Runtime: Events, Web Components, Runtime Engine)
> **Manifest feature:** F20 (Internal event bus)
> **Priority:** High
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2-3 days

## Description

Implement the internal event bus with post-emit hooks and backpressure. `emit` returns a `seq` number. Outbound queue >500 → WS close 1013. Failed writes drop the event, not crash the server.

## Task Goals

- `emit` returns seq number (F20-AC1)
- Post-emit hook fires after WS write (F20-AC2)
- Outbound queue >500 → WS close 1013 (F20-AC3)
- Failed write → drop, not crash (F20-AC4)

## Implementation Plan

### Steps

1. Implement event bus: `emit(event) → seq` with monotonic sequence
2. Implement post-emit hook: fires after WS write confirms
3. Implement backpressure: outbound queue >500 → WS close 1013
4. Implement failed-write handling: drop event, don't crash
5. Write integration test: emit returns seq (F20-AC1)
6. Write integration test: post-emit hook (F20-AC2)
7. Write integration test: queue >500 → close 1013 (F20-AC3)
8. Write integration test: failed write → drop (F20-AC4)

## Acceptance Criteria

- `emit` returns seq number
- Post-emit hook fires after WS write
- Outbound queue >500 → WS close 1013
- Failed write → drop, not crash

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds

## Dependencies

- **Requires:** M1-T5 (F5), M2-T3 (F11), M4-T1 (F19)
- **Blocks:** M4-T4 (F24 — server-side event application)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F20]`
- Per-feature: `docs/requirements/specs/features/feature-020-event-system-internal.md`
