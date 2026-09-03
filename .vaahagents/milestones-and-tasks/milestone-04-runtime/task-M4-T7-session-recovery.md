# Task M4-T7 — Session recovery (last-10-messages replay)

> **Milestone:** M4 (Runtime: Events, Web Components, Runtime Engine)
> **Manifest feature:** F33 (Session recovery)
> **Priority:** Medium
> **Status:** ✅ Completed
> **Estimated Effort:** 2-3 days

## Description

Implement session recovery: when a client reconnects after disconnect, replay the last 10 messages within a 5-second window. If `Last-Event-ID` is too old, send `STATE_SNAPSHOT` instead.

## Task Goals

- Replay bounded to last 10 / 5s window (F33-AC1)
- `Last-Event-ID` header honored, ordered replay (F33-AC2)
- Older `Last-Event-ID` → `STATE_SNAPSHOT` (F33-AC3)

## Implementation Plan

### Steps

1. Implement message buffer: last 10 messages, 5s TTL
2. Implement `Last-Event-ID` header parsing
3. Implement ordered replay from buffer
4. Implement STATE_SNAPSHOT fallback for old IDs
5. Write integration test: replay bounded (F33-AC1)
6. Write integration test: Last-Event-ID honored (F33-AC2)
7. Write integration test: old ID → STATE_SNAPSHOT (F33-AC3)

## Acceptance Criteria

- Replay bounded to last 10 / 5s window
- `Last-Event-ID` header honored, ordered replay
- Older `Last-Event-ID` → `STATE_SNAPSHOT`

## Completion Criteria

- [x] All acceptance criteria above pass
- [x] `bun run test` exits green
- [x] `bun run lint` reports zero errors
- [x] `bun run build` succeeds

## Summary

Session recovery (F33) implemented with 4 source files in `packages/server/src/session-recovery/`. MessageBuffer (circular buffer, 10 entries, 5s TTL), Last-Event-ID parsing (channel:seq), session buffer store (global Map), and replay logic. Integrated into WebSocket handler (upgrade, open, close). 45 tests cover F33-AC1, F33-AC2, F33-AC3.

## Dependencies

- **Requires:** M1-T5 (F5), M2-T3 (F10)
- **Blocks:** None directly (used by M7 — deployment)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F33]`
- Per-feature: `docs/requirements/specs/features/feature-033-session-recovery.md`
