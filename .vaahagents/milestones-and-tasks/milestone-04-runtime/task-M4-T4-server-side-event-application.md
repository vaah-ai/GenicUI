# Task M4-T4 — Server-side event application

> **Milestone:** M4 (Runtime: Events, Web Components, Runtime Engine)
> **Manifest feature:** F24 (Server-side event application)
> **Priority:** High
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2-3 days

## Description

Implement server-side event application: atomic apply of events (no torn reads), STATE_SNAPSHOT fallback on failure, schema validation post-apply with rollback, and idempotency by sequence number.

## Task Goals

- Atomic apply (no torn reads) (F24-AC1)
- Failed apply → STATE_SNAPSHOT fallback (F24-AC2)
- Schema validation post-apply; rollback on failure (F24-AC3)
- Idempotency by seq (drop duplicates) (F24-AC4)

## Implementation Plan

### Steps

1. Implement atomic event apply: lock → apply → validate → unlock
2. Implement STATE_SNAPSHOT fallback on apply failure
3. Post-apply schema validation with rollback
4. Implement idempotency: track seen seq numbers, drop duplicates
5. Write integration test: atomic apply (F24-AC1)
6. Write integration test: failed apply → snapshot (F24-AC2)
7. Write integration test: schema validation + rollback (F24-AC3)
8. Write integration test: idempotency (F24-AC4)

## Acceptance Criteria

- Atomic apply (no torn reads)
- Failed apply → STATE_SNAPSHOT fallback
- Schema validation post-apply; rollback on failure
- Idempotency by seq (drop duplicates)

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds

## Dependencies

- **Requires:** M1-T4 (F4), M4-T2 (F20)
- **Blocks:** M4-T5 (F29 — runtime engine)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F24]`
- Per-feature: `docs/requirements/specs/features/feature-024-server-side-event-application.md`
