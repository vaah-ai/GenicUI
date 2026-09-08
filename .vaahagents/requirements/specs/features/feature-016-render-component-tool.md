---
feature_id: F16
title: "render_component tool"
phase: "Tool Surface"
priority: Critical
effort: L
dependencies: [F2, F13, F15]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#d-tool-contracts-locked
  - ../../idea/consolidated-requirements.md#f-component-system-locked
---

# F16 — `render_component` tool

Validates props via `GenicSchema<T>`, allocates a channel + componentId, emits `STATE_SNAPSHOT` then `component.mounted`.

## Inputs / Outputs

**Input:**
```json
{
  "name": "render_component",
  "arguments": {
    "uri": "ui://components/data-table@1.0.0",
    "props": { "rows": [{"id":"1","name":"Alice"}], "columns": [{"key":"name","label":"Name"}] }
  }
}
```

**Output:**
```json
{
  "componentId": "dt-7f3a9b2c",
  "channel": "dt-7f3a9b2c",
  "schema": { "...": "..." },
  "events": ["row-click", "sort-change", "filter-change"]
}
```

## Acceptance Criteria (Gherkin)

### F16-AC1: Happy path emits STATE_SNAPSHOT + mounted
- **Given** valid props
- **When** the tool runs
- **Then** channel is allocated and `STATE_SNAPSHOT` then `component.mounted` are emitted

### F16-AC2: Invalid props → -32003
- **Given** props missing `rows`
- **When** the tool runs
- **Then** server returns `-32003 props_invalid`

### F16-AC3: Idempotency key reused
- **Given** a `clientRequestId` from a prior `render_component` call
- **When** the same call is retried
- **Then** the same `componentId` is returned without re-allocating

### F16-AC4: URI not found → -32001
- **Given** a `uri` that isn't in the registry
- **When** the tool runs
- **Then** server returns `-32001 component_not_found`

## Test Plan

| AC | Test |
|---|---|
| F16-AC1 | `tests/integration/mcp.test.ts:F16-AC1` full WS round-trip |
| F16-AC2 | `tests/integration/schema-validation.test.ts:F16-AC2` missing rows |
| F16-AC3 | `tests/integration/mcp.test.ts:F16-AC3` idempotency replay |
| F16-AC4 | `tests/integration/mcp.test.ts:F16-AC4` unknown URI |

## Cross-References

- Locked contract: [consolidated-requirements.md §D2 Tool contracts](../../idea/consolidated-requirements.md#d-tool-contracts-locked)
- Architecture: [architecture.md §Request Lifecycle](../architecture.md#request-lifecycle)
