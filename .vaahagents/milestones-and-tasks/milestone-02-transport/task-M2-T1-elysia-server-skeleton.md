# Task M2-T1 — Bun + Elysia HTTP server skeleton

> **Milestone:** M2 (Transport: Server + WebSocket + Frames)
> **Manifest feature:** F9 (Bun + Elysia HTTP server skeleton)
> **Priority:** Critical
> **Status:** ✅ Completed
> **Estimated Effort:** 1-2 days

## Description

Bootstrap the Elysia HTTP server on `:8080` with a `/health` route. This is the server backbone — every downstream feature (WS transport, MCP tools, auth, deployment) builds on this skeleton. F9 has the highest downstream impact of all Layer-1 tasks (unblocks 7 downstream features).

## Task Goals

- `GET /health` returns 200 with `{ status: 'ok' }` in <10ms (F9-AC1)
- Bun missing → actionable error (F9-AC2)
- Strict TS end-to-end, no `any` (F9-AC3)

## Implementation Plan

### Steps

1. Create `packages/server/` with `package.json` (peerDep: `@genicui/core`)
2. Implement Elysia server with `/health` route returning `{ status: 'ok' }`
3. Configure `listen({ port: 8080, hostname: '0.0.0.0' })`
4. Add startup log: `Server running at ${app.server!.url}`
5. Write integration test: curl + timing assert <10ms (F9-AC1)
6. Write integration test: PATH-stripped Bun, expect named error (F9-AC2)
7. Write lint test: ESLint on server entrypoint, no `any` (F9-AC3)

## Acceptance Criteria

- `GET /health` returns 200 with `{status:ok}` in <10ms
- `bun missing` → actionable error naming Bun installation as fix
- Strict TS end-to-end, no `any`

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds and emits `@genicui/server`

## Dependencies

- **Requires:** M1-T1 (F1)
- **Blocks:** M2-T2 (F10 — WS), M2-T3 (F11 — frames), M3-T1 (F13 — MCP), M6-T1 (F46 — auth), M7-T1 (F61), M7-T2 (F62), M7-T4 (F64)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F9]`
- Per-feature: `docs/requirements/specs/features/feature-009-bun-elysia-server-skeleton.md`
- Locked decisions: `docs/requirements/idea/consolidated-requirements.md` §B (L1)
