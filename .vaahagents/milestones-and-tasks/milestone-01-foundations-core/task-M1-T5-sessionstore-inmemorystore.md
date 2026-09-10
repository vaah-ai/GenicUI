# Task M1-T5 — SessionStore interface + InMemoryStore

> **Milestone:** M1 (Foundations: Core Package)
> **Manifest feature:** F5 (SessionStore interface + InMemoryStore)
> **Priority:** Critical
> **Status:** ✅ Completed
> **Estimated Effort:** 2 days

## Description

Define the `SessionStore` interface (`get`, `set`, `append`, `subscribe`) and implement `InMemoryStore` for development. This is the session state abstraction — swapable backends (DODurableObjectStore, PostgresListenNotifyStore) implement this same interface.

## Task Goals

- `set` then `get` returns same object reference (F5-AC1)
- Concurrent `set` races resolve to last write (F5-AC2)
- `subscribe` fires on `set()` (F5-AC3)

## Implementation Plan

### Pre-Implementation Analysis

- Depends on M1-T1 (F1) — core package must exist
- SessionStore interface per [consolidated-requirements.md §H](../../../.vaahagents/requirements/idea/consolidated-requirements.md#h-architecture-patterns-locked): 3 implementations (DODurableObjectStore, PostgresListenNotifyStore, InMemoryStore)
- CI matrix runs full test suite against all three backends (testing-strategy.md)
- This is effort = M (2 days)

### Steps

1. Define `SessionStore` interface: `get(key)`, `set(key, value)`, `append(key, value)`, `subscribe(key, fn)`
2. Implement `InMemoryStore` using `Map<K, V>` with synchronous writes
3. Implement `subscribe` with event emitter pattern
4. Handle concurrent writes: last-write-wins semantics
5. Write unit test: set then get returns same reference (F5-AC1)
6. Write unit test: concurrent set races resolve to last write (F5-AC2)
7. Write unit test: subscribe fires on set() (F5-AC3)
8. Verify `bun test packages/core` passes

## Acceptance Criteria

- `set` then `get` returns same object reference
- Concurrent `set` races resolve to last write
- `subscribe` fires on `set()`

## Completion Criteria

- [x] All acceptance criteria above pass
- [x] `bun run test` exits green
- [x] `bun run lint` reports zero errors
- [x] `bun run build` succeeds
- [x] Coverage target met: 80% core

## Delivery Summary

Delivered 4 source files + 1 test file (11 tests, 0 failures). SessionStore interface with get/set/append/subscribe. InMemoryStore uses Map-based storage with two internal maps (#data for set/get, #logs for append) and per-key subscriber sets. All 80 core tests pass, build clean, lint clean.

## Dependencies

- **Requires:** M1-T1 (F1)
- **Blocks:** M4-T2 (F20 — event bus), M4-T7 (F33 — session recovery), M7-T1 (F61 — CF Workers), M7-T3 (F62b — DO store)

## Documentation References

- Manifest: `.vaahagents/requirements/specs/manifest.json` → `features[F5]`
- Per-feature: `.vaahagents/requirements/specs/features/feature-005-sessionstore-inmemorystore.md`
- Architecture: `.vaahagents/requirements/idea/consolidated-requirements.md` §H
