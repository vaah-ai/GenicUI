---
feature_id: F24
title: "Server-side event application"
phase: Runtime
priority: Critical
effort: M
dependencies: [F4, F20]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#f-component-system-locked
---

# F24 — Server-side event application

Server applies inbound `UPDATE_COMPONENT` ops to canonical state, emits `STATE_DELTA` for clients.

## Inputs / Outputs

**Input:**
```json
{
  "channel": "dt-7f3a9b2c",
  "type": "UPDATE_COMPONENT",
  "payload": { "patches": [{ "op": "replace", "path": "/rows/0/name", "value": "Alicia" }] }
}
```

**Output:**
```json
{
  "channel": "dt-7f3a9b2c",
  "type": "STATE_DELTA",
  "payload": [{ "op": "replace", "path": "/rows/0/name", "value": "Alicia" }],
  "seq": 14
}
```

## Acceptance Criteria (Gherkin)

### F24-AC1: Atomic apply
- **Given** a `STATE_DELTA` payload
- **When** server applies it
- **Then** the canonical state and broadcast happen atomically (no torn reads)

### F24-AC2: Failed apply → STATE_SNAPSHOT fallback
- **Given** a patch that fails to apply
- **When** server detects
- **Then** it recomputes the full canonical state and emits `STATE_SNAPSHOT`

### F24-AC3: Schema validation after apply
- **Given** a patch applied
- **When** the new state is checked against the registered TypeBox schema
- **Then** if validation fails, server rolls back and returns `-32003 props_invalid`

### F24-AC4: Idempotency by seq
- **Given** a frame with `seq: 14` arrives twice
- **When** server processes both
- **Then** only the first one takes effect; second is dropped silently

## Test Plan

| AC | Test |
|---|---|
| F24-AC1 | `tests/integration/runtime.test.ts:F24-AC1` atomic apply |
| F24-AC2 | `tests/integration/runtime.test.ts:F24-AC2` fallback snapshot |
| F24-AC3 | `tests/integration/runtime.test.ts:F24-AC3` schema rollback |
| F24-AC4 | `tests/integration/runtime.test.ts:F24-AC4` dedupe by seq |

## Cross-References

- Architecture: [architecture.md §State Management](../architecture.md#state-management)
- Security: [security.md §Trust Boundaries](../security.md#trust-boundaries)
