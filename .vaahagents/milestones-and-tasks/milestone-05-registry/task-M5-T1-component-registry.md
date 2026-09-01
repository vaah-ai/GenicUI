# Task M5-T1 — Component registry + manifest loader

> **Milestone:** M5 (Registry: Component Registry + PrimeVue Adapter)
> **Manifest feature:** F37 (Component registry + manifest loader)
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 3-5 days

## Description

Implement the component registry loader: loads `registry.json` into `Map<uri, entry>`, rejects `additionalProperties: true` at load, supports SIGHUP hot reload preserving open connections. This is the registry contract — all component libraries use this loader.

## Task Goals

- Load from `registry.json` into `Map<uri, entry>` (F37-AC1)
- `additionalProperties: true` rejected at load (F37-AC2)
- SIGHUP hot reload preserves open connections (F37-AC3)

## Implementation Plan

### Steps

1. Implement `loadRegistry(path)` → `Map<uri, ComponentEntry>`
2. Validate each entry against GenicSchema with `additionalProperties: false`
3. Implement SIGHUP handler: reload registry, preserve connections
4. Implement `defineRegistry({ id, version, framework, components })` helper
5. Write integration test: registry load (F37-AC1)
6. Write integration test: additionalProperties rejected (F37-AC2)
7. Write integration test: SIGHUP hot reload (F37-AC3)

## Acceptance Criteria

- Load from `registry.json` into `Map<uri, entry>`
- `additionalProperties: true` rejected at load
- SIGHUP hot reload preserves open connections

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds
- [ ] Coverage target met: 60% registry adapters

## Dependencies

- **Requires:** M1-T2 (F2), M3-T1 (F13)
- **Blocks:** M5-T2 (F38 — trust tiers), M5-T3 (F40 — PrimeVue adapter)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F37]`
- Per-feature: `docs/requirements/specs/features/feature-037-component-registry.md`
- Registry contract: `docs/requirements/idea/consolidated-requirements.md` §G
