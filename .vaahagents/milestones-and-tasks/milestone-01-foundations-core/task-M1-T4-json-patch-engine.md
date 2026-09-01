# Task M1-T4 — JSON-Patch engine wrapper

> **Milestone:** M1 (Foundations: Core Package)
> **Manifest feature:** F4 (JSON-Patch engine wrapper)
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2 days

## Description

Build the `JsonPatchEngine` wrapper around `fast-json-patch`, implementing RFC 6902 diff/apply with `{ mutate: false }`, immutability guarantees, and 10K-pair fast-check property tests. This is the wire protocol for state updates — the core of the generative UI update loop.

## Task Goals

- RFC 6902 patch with `{ mutate: false }` (F4-AC1)
- `apply(patch, before) === after` (F4-AC2)
- 10K random pairs round-trip (fast-check) (F4-AC3)
- Date/Map → STATE_SNAPSHOT fallback (F4-AC4)

## Implementation Plan

### Pre-Implementation Analysis

- Depends on M1-T1 (F1) — core package must exist
- `fast-json-patch` with `{ mutate: false }` per [consolidated-requirements.md §F Prop Diffing](../../../docs/requirements/idea/consolidated-requirements.md#f-component-system-locked)
- Property-based test required: 10K random pairs (testing-strategy.md)
- This is effort = M (2 days) due to property test implementation
- Invoke `sequential-thinking` for diff/apply correctness proof

### Steps

1. Implement `JsonPatchEngine` class wrapping `fast-json-patch` with `{ mutate: false }`
2. Implement `diff(before, after): Operation[]` returning RFC 6902 operations
3. Implement `apply(patch, target): unknown` returning immutable result
4. Add fallback: Date/Map → throw non_serializable, caller emits STATE_SNAPSHOT
5. Write unit test: RFC 6902 patch with immutability (F4-AC1)
6. Write unit test: `apply(diff(a, b), a) === b` (F4-AC2)
7. Write property test: fast-check 10K random object pairs (F4-AC3)
8. Write unit test: Date/Map fallback to snapshot (F4-AC4)

## Acceptance Criteria

- RFC 6902 patch with `{ mutate: false }`
- `apply(patch, before) === after`
- 10K random pairs round-trip (fast-check)
- Date/Map → STATE_SNAPSHOT fallback

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds
- [ ] Coverage target met: 80% core
- [ ] Property-based test passing (fast-check 10K runs)

## Dependencies

- **Requires:** M1-T1 (F1)
- **Blocks:** M3-T5 (F17 — update_component), M4-T3 (F21 — GenicElement), M4-T4 (F24 — server-side events), M4-T5 (F29 — runtime engine)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F4]`
- Per-feature: `docs/requirements/specs/features/feature-004-json-patch-engine.md`
- Prop diffing: `docs/requirements/idea/consolidated-requirements.md` §F
