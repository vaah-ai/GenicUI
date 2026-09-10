# Task M6-T3 — DODurableObjectStore (CF DO session backend)

> **Milestone:** M6 (Deployment: Cloudflare, Bun, Durable Objects, Nitro)
> **Manifest feature:** F62b (DODurableObjectStore)
> **Priority:** High
> **Status:** ⚪ Not Started
> **Estimated Effort:** 3-5 days

## Description

Implement `DODurableObjectStore` — the Cloudflare Durable Objects backend for the SessionStore interface. set/get round-trip through DO SQLite. Cross-instance visibility. Remote subscribe fires on cross-worker set.

## Task Goals

- `set`/`get` round-trip through DO SQLite (F62b-AC1)
- Cross-instance visibility (F62b-AC2)
- Remote subscribe fires on cross-worker set (F62b-AC3)

## Implementation Plan

### Steps

1. Implement DODurableObjectStore: `SessionStore` interface → DO SQLite
2. Implement `get(key)` → SQLite query
3. Implement `set(key, value)` → SQLite insert/update
4. Implement cross-instance visibility
5. Implement remote subscribe on cross-worker set
6. Write deploy test: round-trip (F62b-AC1)
7. Write deploy test: cross-instance visibility (F62b-AC2)
8. Write deploy test: remote subscribe (F62b-AC3)

## Acceptance Criteria

- `set`/`get` round-trip through DO SQLite
- Cross-instance visibility
- Remote subscribe fires on cross-worker set

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run build` succeeds

## Dependencies

- **Requires:** M1-T5 (F5), M6-T1 (F61 — CF Workers, same milestone)
- **Blocks:** None directly

## Documentation References

- Manifest: `.vaahagents/requirements/specs/manifest.json` → `features[F62b]`
- Per-feature: `.vaahagents/requirements/specs/features/feature-062b-do-session-store.md`
- Architecture: `.vaahagents/requirements/idea/consolidated-requirements.md` §H
