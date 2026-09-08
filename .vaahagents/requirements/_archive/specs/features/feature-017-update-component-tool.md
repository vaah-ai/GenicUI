---
feature_id: F17
title: "update_component tool"
phase: "Tool Surface"
priority: Critical
effort: L
dependencies: [F4, F13, F16]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#d-tool-contracts-locked
---

# F17 — `update_component` tool

Accepts a `patches: JsonPatchOp[]` payload; falls back to full snapshot on schema mismatch.

## Inputs / Outputs

**Input (patches):**
```json
{
  "name": "update_component",
  "arguments": {
    "componentId": "dt-7f3a9b2c",
    "patches": [
      { "op": "replace", "path": "/rows/0/name", "value": "Alicia" },
      { "op": "add", "path": "/rows/-", "value": { "id": "2", "name": "Bob" } }
    ]
  }
}
```

**Output:**
```json
{
  "componentId": "dt-7f3a9b2c",
  "channel": "dt-7f3a9b2c",
  "applied": true,
  "diff": {
    "patched": [
      { "op": "replace", "path": "/rows/0/name", "value": "Alicia" },
      { "op": "add", "path": "/rows/1", "value": { "id": "2", "name": "Bob" } }
    ]
  }
}
```

## Acceptance Criteria (Gherkin)

### F17-AC1: Valid patches → STATE_DELTA
- **Given** a mounted component
- **When** `update_component` with valid patches is called
- **Then** `STATE_DELTA` is emitted with the applied op list

### F17-AC2: Patches reject → fall back to snapshot
- **Given** patches fail (e.g., target index out of range)
- **When** server attempts to apply
- **Then** server falls back to recomputing the full snapshot and emits `STATE_SNAPSHOT`

### F17-AC3: `replace` with full props → snapshot
- **Given** `update_component` with `mode: "replace"` and full `props`
- **When** the tool runs
- **Then** server validates against the registered schema and emits `STATE_SNAPSHOT`

### F17-AC4: Concurrent update race → atomic
- **Given** 2 concurrent `update_component` calls on the same componentId
- **When** they race
- **Then** operations are serialized (no torn state)

### F17-AC5: Path not in current state → -32004
- **Given** a patch with `path: /rows/999/name` and only 3 rows
- **When** the tool runs
- **Then** server returns `-32004 patch_invalid`

## Test Plan

| AC | Test |
|---|---|
| F17-AC1 | `tests/integration/mcp.test.ts:F17-AC1` happy path |
| F17-AC2 | `tests/integration/mcp.test.ts:F17-AC2` failure → snapshot |
| F17-AC3 | `tests/integration/mcp.test.ts:F17-AC3` replace mode snapshot |
| F17-AC4 | `tests/integration/concurrency.test.ts:F17-AC4` parallel calls |
| F17-AC5 | `tests/integration/mcp.test.ts:F17-AC5` invalid path |

## Cross-References

- Locked contract: [consolidated-requirements.md §D3, §F Prop Diffing](../../idea/consolidated-requirements.md#d-tool-contracts-locked)
- Architecture: [architecture.md §State Management](../architecture.md#state-management)
