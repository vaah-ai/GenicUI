# Task M5-T2 — Registry trust tiers (project / user / remote)

> **Milestone:** M5 (Registry: Component Registry + PrimeVue Adapter)
> **Manifest feature:** F38 (Registry trust tiers)
> **Priority:** High
> **Status:** ✅ Completed
> **Estimated Effort:** 2-3 days

## Description

Implement registry trust tiers: project (highest), user (medium), remote (lowest). Project tier wins on conflict. Remote allow-list enforced. Lookup order: user → project → remote.

## Task Goals

- Project tier wins on conflict (F38-AC1)
- Remote allow-list enforced (F38-AC2)
- Lookup order: user → project → remote (F38-AC3)

## Implementation Plan

### Steps

1. Implement trust tier enum: `project`, `user`, `remote`
2. Implement conflict resolution: project tier wins
3. Implement remote allow-list: `GENICUI_REGISTRY_ALLOWLIST` env var
4. Implement lookup order: user → project → remote
5. Write integration test: project wins conflict (F38-AC1)
6. Write integration test: remote allow-list (F38-AC2)
7. Write integration test: lookup order (F38-AC3)

## Acceptance Criteria

- Project tier wins on conflict
- Remote allow-list enforced
- Lookup order: user → project → remote

## Completion Criteria

- [x] All acceptance criteria above pass
- [x] `bun run test` exits green (972 tests)
- [x] `bun run lint` reports zero errors
- [x] `bun run build` succeeds
- [x] Coverage target met: 60% registry adapters

## Dependencies

- **Requires:** M5-T1 (F37)
- **Blocks:** M5-T3 (F40 — PrimeVue adapter)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F38]`
- Per-feature: `docs/requirements/specs/features/feature-038-registry-trust-tiers.md`
