---
feature_id: F5
title: "SessionStore interface + InMemoryStore"
phase: Foundations
priority: Critical
effort: M
dependencies: [F1]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#h-architecture-patterns-locked
---

# F5 — `SessionStore` interface + `InMemoryStore`

`SessionStore { get/set/append/subscribe }` abstraction; `InMemoryStore` uses `Map` for dev/test.

## Inputs / Outputs

**Input:**
```ts
import { InMemoryStore } from '@genicui/core';
const store = new InMemoryStore();
await store.set('session-123', { mountedIds: ['dt-1'], lastSeq: 42 });
const session = await store.get('session-123');
```

**Output:**
```ts
session === { mountedIds: ['dt-1'], lastSeq: 42 }
```

## Acceptance Criteria (Gherkin)

### F5-AC1: set then get same reference
- **Given** a session ID
- **When** `store.set()` is called
- **Then** subsequent `store.get()` returns the same object reference

### F5-AC2: Concurrent set last-write-wins
- **Given** multiple concurrent `set()` calls on the same session
- **When** they race
- **Then** the last write wins (no torn state)

### F5-AC3: subscribe fires on set
- **Given** a `subscribe(sessionId, callback)`
- **When** another caller `set()`s the session
- **Then** the callback fires with the new value

## Test Plan

| AC | Test |
|---|---|
| F5-AC1 | `tests/unit/core/session-store.test.ts:F5-AC1` reference identity |
| F5-AC2 | `tests/unit/core/session-store.test.ts:F5-AC2` racing promises, last-wins |
| F5-AC3 | `tests/unit/core/session-store.test.ts:F5-AC3` subscriber notified synchronously |

## Cross-References

- Locked by: [consolidated-requirements.md §H Session Store Interface](../../idea/consolidated-requirements.md#h-architecture-patterns-locked)
- Post-MVP: will add DODurableObjectStore + PostgresListenNotifyStore
