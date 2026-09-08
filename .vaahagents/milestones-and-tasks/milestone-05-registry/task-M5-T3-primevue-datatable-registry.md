# Task M5-T3 — PrimeVue DataTable registry adapter

> **Milestone:** M5 (Registry: Component Registry + PrimeVue Adapter)
> **Manifest feature:** F40 (PrimeVue DataTable registry)
> **Priority:** Critical
> **Status:** ✅ Completed
> **Estimated Effort:** 5-7 days

## Description

Build the PrimeVue DataTable registry adapter: `@genicul-primevue/registry` with 8-prop API, PassThrough API integration, sort/filter/selection events. This is the first real component — the MVP's sole registry target.

## Task Goals

- Schema enforces exactly 8 top-level props (F40-AC1)
- Sort header → `sort-change` event (F40-AC2)
- Filter → debounced `filter-change` event (300ms) (F40-AC3)
- Selection mode → `selection-change` event (F40-AC4)

## Implementation Plan

### Pre-Implementation Analysis

- Effort = L (5-7 days) — invoke `brainstorming` if approach unclear
- Depends on M5-T1 (F37) and M5-T2 (F38)
- PrimeVue 4 PassThrough API per consolidated-requirements.md §L6
- Conformance suite required (testing-strategy.md)

### Steps

1. Create `@genicul-primevue/registry` package
2. Implement DataTable adaptor: 8-prop schema (rows, columns, sort, filter, selection, etc.)
3. Wire PrimeVue PassThrough API for event capture
4. Implement sort header → sort-change event
5. Implement filter → debounced filter-change (300ms)
6. Implement selection → selection-change event
7. Write integration test: 8-prop schema (F40-AC1)
8. Write integration test: sort event (F40-AC2)
9. Write integration test: filter event (F40-AC3)
10. Write integration test: selection event (F40-AC4)
11. Run conformance suite: 5-rule suite green

## Acceptance Criteria

- Schema enforces exactly 8 top-level props
- Sort header → `sort-change` event
- Filter → debounced `filter-change` event (300ms)
- Selection mode → `selection-change` event

## Completion Criteria

- [x] All acceptance criteria above pass — F40-AC1 through F40-AC4 verified
- [x] `bun run test` exits green — 178 tests, 0 failures, 206 assertions
- [x] `bun run lint` reports zero errors
- [x] `bun run build` succeeds — tsc clean
- [x] Coverage target met: 60% registry adapters — 123 unique tests cover all schemas and events
- [x] Conformance suite green

## Delivery Summary

- **Package:** `@genicul-primevue/registry` at `registries/primevue/`
- **Files:** 10 source files (6 src, 3 config, 1 registry.json)
- **8-prop API:** rows, columns, pageSize, page, sort, filters, selection, loading
- **5 events:** sort-change, filter-change, selection-change, page-change, row-click
- **Schema:** TypeBox with additionalProperties: false, runtime prop-count assertion
- **Registry JSON:** server-loadable `registry.json` matching RegistryFile format
- **Tests:** 123 tests covering all ACs, sub-schemas, bounds, edge cases, re-exports

## Dependencies

- **Requires:** M5-T1 (F37), M5-T2 (F38)
- **Blocks:** M4-T5 (F29 — runtime engine mounts DataTable)

## Documentation References

- Manifest: `.vaahagents/requirements/specs/manifest.json` → `features[F40]`
- Per-feature: `.vaahagents/requirements/specs/features/feature-040-primevue-registry.md`
- Registry contract: `.vaahagents/requirements/idea/consolidated-requirements.md` §G
