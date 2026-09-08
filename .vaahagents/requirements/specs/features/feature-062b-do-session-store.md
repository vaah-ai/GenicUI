---
feature_id: F62b
title: "DODurableObjectStore (Cloudflare DO session backend)"
phase: Deployment
priority: High
effort: M
dependencies: [F5, F61]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#h-architecture-patterns-locked
---

# F62b — `DODurableObjectStore`

Concrete `SessionStore` implementation backed by Cloudflare Durable Objects (SQLite storage).

## Inputs / Outputs

**Input:**
```ts
import { DODurableObjectStore } from '@genicui/server';
const store = new DODurableObjectStore(env.SESSION);
await store.set('sess-123', { mountedIds: ['dt-1'], lastSeq: 42 });
```

**Output:**
- State persisted in DO SQLite
- Cross-request, cross-instance consistency

## Acceptance Criteria (Gherkin)

### F62b-AC1: set/get round-trip
- **Given** a session ID
- **When** `store.set()` then `store.get()`
- **Then** the same value is returned

### F62b-AC2: Cross-instance visibility
- **Given** Worker A sets session state
- **When** Worker B (different instance) reads it
- **Then** it sees the same value via DO consistency

### F62b-AC3: Subscribe fires on remote set
- **Given** a `subscribe` callback is registered
- **When** another Worker instance updates the session
- **Then** the callback fires with the new value

## Test Plan

| AC | Test |
|---|---|
| F62b-AC1 | `tests/deploy/do-store.test.ts:F62b-AC1` round-trip |
| F62b-AC2 | `tests/deploy/do-store.test.ts:F62b-AC2` cross-instance |
| F62b-AC3 | `tests/deploy/do-store.test.ts:F62b-AC3` subscribe |

## Cross-References

- Implements: F5 (interface)
- Deployment: [deployment.md §Cloudflare Workers](../deployment.md#cloudflare-workers--durable-objects)
