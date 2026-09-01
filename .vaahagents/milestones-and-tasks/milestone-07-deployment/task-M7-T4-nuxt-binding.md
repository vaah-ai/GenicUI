# Task M7-T4 — Nitro/Nuxt binding

> **Milestone:** M7 (Deployment: Cloudflare, Bun, Durable Objects, Nitro)
> **Manifest feature:** F64 (Nitro/Nuxt binding)
> **Priority:** Medium
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2-3 days

## Description

Implement the Nitro/Nuxt binding: WS upgrade via Nitro experimental websocket, API key from `GENICUI_API_KEY` env, and devtools panel showing active sessions.

## Task Goals

- WS upgrade via Nitro experimental websocket (F64-AC1)
- API key from `GENICUI_API_KEY` env (F64-AC2)
- Devtools panel shows active sessions (F64-AC3)

## Implementation Plan

### Steps

1. Implement `nuxt-genicui` module
2. Wire Nitro experimental websocket at `/api/ws`
3. Implement API key from `GENICUI_API_KEY` env var
4. Implement devtools panel: active sessions display
5. Write integration test: WS upgrade (F64-AC1)
6. Write integration test: API key from env (F64-AC2)
7. Write integration test: devtools panel (F64-AC3)

## Acceptance Criteria

- WS upgrade via Nitro experimental websocket
- API key from `GENICUI_API_KEY` env
- Devtools panel shows active sessions

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds

## Dependencies

- **Requires:** M2-T1 (F9)
- **Blocks:** None — final milestone task

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F64]`
- Per-feature: `docs/requirements/specs/features/feature-064-nuxt-binding.md`
- Deployment: `docs/requirements/specs/deployment.md`
