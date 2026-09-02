---
feature_id: F9
title: "Bun + Elysia HTTP server skeleton"
phase: Transport
priority: Critical
effort: S
dependencies: [F1]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
verified_by_agent: claude-code
completed_at: 2026-09-01
branch: feature/M2-T1-bun-elysia-server-skeleton
implementation: packages/server/
sources:
  - ../../idea/consolidated-requirements.md#b-locked-technical-decisions
---

# F9 — Bun + Elysia HTTP server skeleton

`bun run dev` starts Elysia server on `:3040` with `/health` route.

## Inputs / Outputs

**Input:**
```ts
import { Elysia } from 'elysia';
const app = new Elysia()
  .get('/health', () => ({ status: 'ok' }))
  .listen({ port: 3040, hostname: '0.0.0.0' });
console.log(`Server running at ${app.server!.url}`);
```

**Output:**
```bash
$ curl http://localhost:3040/health
{"status":"ok"}
```

## Acceptance Criteria (Gherkin)

### F9-AC1: /health under 10ms
- **Given** the server starts
- **When** `GET /health` is called
- **Then** response is 200 with `{ status: 'ok' }` in <10ms

### F9-AC2: Bun missing error
- **Given** Bun is not available
- **When** `bun run dev` is invoked
- **Then** error message names Bun installation as the fix

### F9-AC3: End-to-end types, no any
- **Given** TypeScript strict mode
- **When** route handlers are registered
- **Then** end-to-end types from Elysia route to client (no `any`)

## Test Plan

| AC | Test |
|---|---|
| F9-AC1 | `tests/integration/server.test.ts:F9-AC1` curl + timing assert |
| F9-AC2 | `tests/integration/server.test.ts:F9-AC2` PATH-stripped Bun, expect named error |
| F9-AC3 | `tests/unit/core/lint.test.ts:F9-AC3` ESLint on server entrypoint |

## Cross-References

- Locked by: [consolidated-requirements.md §L1 Dev stack](../../idea/consolidated-requirements.md#b-locked-technical-decisions)
- Used by: F10 (WS), F13 (MCP), F46 (auth)
