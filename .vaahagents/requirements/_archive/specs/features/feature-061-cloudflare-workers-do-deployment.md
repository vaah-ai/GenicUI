---
feature_id: F61
title: "Cloudflare Workers + Durable Objects deployment"
phase: Deployment
priority: High
effort: L
dependencies: [F5, F9]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#b-locked-technical-decisions
---

# F61 — Cloudflare Workers + Durable Objects deployment

`wrangler deploy` ships a Worker; `SessionStore` backed by DO via `state.storage`.

## Inputs / Outputs

**Input (`wrangler.toml`):**
```toml
name = "genicui-server"
main = "src/worker.ts"
compatibility_date = "2026-08-01"

[[durable_objects.bindings]]
name = "SESSION"
class_name = "GenicUISession"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["GenicUISession"]
```

**Output:**
- Worker URL: `https://genicui-server.{account}.workers.dev`
- Session DOs allocated per session ID

## Acceptance Criteria (Gherkin)

### F61-AC1: Cold start <50ms p95
- **Given** the worker is deployed
- **When** `GET /health` is hit from 10 different regions
- **Then** p95 latency is <50ms

### F61-AC2: DO persistence
- **Given** a session with state `{ lastSeq: 42 }`
- **When** the Worker is redeployed (new instance)
- **Then** the DO retains the state

### F61-AC3: SQLite-backed DO storage
- **Given** a session DO
- **When** session data exceeds 1MB
- **Then** it persists via SQLite storage

## Test Plan

| AC | Test |
|---|---|
| F61-AC1 | `tests/deploy/cf-cold-start.test.ts:F61-AC1` regional timing |
| F61-AC2 | `tests/deploy/cf-do-persistence.test.ts:F61-AC2` redeploy |
| F61-AC3 | `tests/deploy/cf-do-sqlite.test.ts:F61-AC3` >1MB storage |

## Cross-References

- Architecture: [architecture.md §Deployment](../deployment.md)
- Deployment: [deployment.md §Cloudflare Workers](../deployment.md#cloudflare-workers--durable-objects)
