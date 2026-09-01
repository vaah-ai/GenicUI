# Task M7-T2 — Bun self-host deployment (single binary)

> **Milestone:** M7 (Deployment: Cloudflare, Bun, Durable Objects, Nitro)
> **Manifest feature:** F62 (Bun self-host deployment)
> **Priority:** Medium
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2-3 days

## Description

Build the Bun self-host deployment: single binary via `bun build --compile`, runs without Bun installed. Binary size <50MB, cold start <100ms.

## Task Goals

- Single binary runs without Bun installed (F62-AC1)
- Binary size <50MB (F62-AC2)
- Cold start <100ms (F62-AC3)

## Implementation Plan

### Steps

1. Implement `bun build --compile` for single binary
2. Implement startup script: `bun run start`
3. Implement binary size check
4. Write deploy test: binary runs (F62-AC1)
5. Write deploy test: size <50MB (F62-AC2)
6. Write deploy test: cold start <100ms (F62-AC3)

## Acceptance Criteria

- Single binary runs without Bun installed
- Binary size <50MB
- Cold start <100ms

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run build` succeeds

## Dependencies

- **Requires:** M2-T1 (F9)
- **Blocks:** None directly

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F62]`
- Per-feature: `docs/requirements/specs/features/feature-062-bun-self-host.md`
- Deployment: `docs/requirements/specs/deployment.md`
