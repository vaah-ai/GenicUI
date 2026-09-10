---
feature_id: F37
title: "Component registry + manifest loader"
phase: Registry
priority: Critical
effort: L
dependencies: [F2, F13]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#f-component-system-locked
  - ../../idea/consolidated-requirements.md#k-registry-system-locked
---

# F37 — Component registry

In-memory registry keyed by `ui://components/{name}@{version}`. Validates `additionalProperties: false` at load.

## Inputs / Outputs

**Input (`registry.json`):**
```json
{
  "components": [
    {
      "name": "data-table",
      "version": "1.0.0",
      "propsSchema": { "type": "object", "properties": { "rows": { "type": "array" } }, "required": ["rows"], "additionalProperties": false },
      "tags": ["table", "sortable", "filterable"],
      "events": [{ "name": "row-click", "payloadSchema": { "type": "object", "properties": { "rowId": { "type": "string" } } } }]
    }
  ]
}
```

**Output (server in-memory):**
- `Map<uri, ComponentEntry>`
- Each entry has `propsSchema`, `runtime`, `tags`, `events`, `examples`

## Acceptance Criteria (Gherkin)

### F37-AC1: Load from JSON
- **Given** a valid `registry.json`
- **When** the server boots
- **Then** the in-memory map has one entry per component

### F37-AC2: Open schema rejected
- **Given** a component with `additionalProperties: true`
- **When** the loader runs
- **Then** the server fails to boot with a clear error

### F37-AC3: Hot reload via SIGHUP
- **Given** the server is running
- **When** `SIGHUP` arrives and `registry.json` is updated
- **Then** the in-memory map reloads without dropping open connections

## Test Plan

| AC | Test |
|---|---|
| F37-AC1 | `tests/integration/registry-load.test.ts:F37-AC1` happy path |
| F37-AC2 | `tests/integration/registry-load.test.ts:F37-AC2` open schema |
| F37-AC3 | `tests/integration/registry-load.test.ts:F37-AC3` SIGHUP reload |

## Cross-References

- Locked by: [consolidated-requirements.md §K Registry System](../../idea/consolidated-requirements.md#k-registry-system-locked)
- Security: [security.md §Registry Trust](../security.md#registry-trust)
