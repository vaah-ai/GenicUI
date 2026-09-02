# Task M6-T1 — Cloudflare Workers + DO deployment

> **Milestone:** M6 (Deployment: Cloudflare, Bun, Durable Objects, Nitro)
> **Manifest feature:** F61 (Cloudflare Workers + Durable Objects deployment)
> **Priority:** High
> **Status:** ⚪ Not Started
> **Estimated Effort:** 5-7 days

## Description

Deploy GenicUI to Cloudflare Workers with Durable Objects for session state. Cold start p95 <50ms across 10 regions. DO state persists across redeploy. SQLite-backed DO storage >1MB.

## Task Goals

- Cold start p95 <50ms (10 regions) (F61-AC1)
- DO state persists across redeploy (F61-AC2)
- SQLite-backed DO storage >1MB (F61-AC3)

## Implementation Plan

### Steps

1. Create `wrangler.toml` with DO bindings + env vars
2. Implement Worker entry point: route `/health`, `/ws` to Elysia server
3. Implement DO class: session state + SQLite storage
4. Implement cold-start optimization
5. Write deploy test: cold start p95 <50ms (F61-AC1)
6. Write deploy test: DO state persists (F61-AC2)
7. Write deploy test: SQLite storage >1MB (F61-AC3)

## Acceptance Criteria

- Cold start p95 <50ms (10 regions)
- DO state persists across redeploy
- SQLite-backed DO storage >1MB

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run build` succeeds
- [ ] `wrangler deploy` succeeds

## Dependencies

- **Requires:** M1-T5 (F5), M2-T1 (F9)
- **Blocks:** M6-T3 (F62b — DO store, same milestone)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F61]`
- Per-feature: `docs/requirements/specs/features/feature-061-cloudflare-workers-do-deployment.md`
- Deployment: `docs/requirements/specs/deployment.md`
