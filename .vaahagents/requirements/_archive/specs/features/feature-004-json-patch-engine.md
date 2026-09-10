---
feature_id: F4
title: "JSON-Patch engine wrapper"
phase: Foundations
priority: Critical
effort: M
dependencies: [F1]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#b-locked-technical-decisions
  - ../../idea/consolidated-requirements.md#f-component-system-locked
---

# F4 — JSON-Patch engine wrapper

Wraps `fast-json-patch` with `{ mutate: false }`, falls back to full snapshot on non-serializable values.

## Inputs / Outputs

**Input:**
```ts
import { JsonPatchEngine } from '@genicui/core';
const engine = new JsonPatchEngine();
const before = { rows: [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }] };
const after = { rows: [{ id: '1', name: 'Alice' }, { id: '2', name: 'updated' }] };
const patch = engine.diff(before, after);
```

**Output:**
```json
[{ "op": "replace", "path": "/rows/1/name", "value": "updated" }]
```

## Acceptance Criteria (Gherkin)

### F4-AC1: RFC 6902 + mutate:false
- **Given** two object snapshots
- **When** `diff()` is called
- **Then** RFC 6902 patches are returned with `{ mutate: false }`

### F4-AC2: Round-trip
- **Given** a patch
- **When** `apply()` is called against the original
- **Then** the result equals `after`

### F4-AC3: 10K random pairs property test
- **Given** 10,000 random property pairs (fast-check)
- **When** diff+apply round-trips
- **Then** all pairs satisfy `apply(diff(a, b), a) === b`

### F4-AC4: Non-serializable fallback
- **Given** a Date or Map value
- **When** diff is attempted
- **Then** fallback to full snapshot (`STATE_SNAPSHOT` event) is emitted

## Test Plan

| AC | Test |
|---|---|
| F4-AC1 | `tests/unit/core/patch.test.ts:F4-AC1` structural snapshot |
| F4-AC2 | `tests/unit/core/patch.test.ts:F4-AC2` round-trip equality |
| F4-AC3 | `tests/unit/core/patch.property.test.ts:F4-AC3` fast-check 10K runs |
| F4-AC4 | `tests/unit/core/patch.test.ts:F4-AC4` Date/Map exception → fallback path |

## Cross-References

- Locked by: [consolidated-requirements.md §F Prop Diffing](../../idea/consolidated-requirements.md#f-component-system-locked)
- Used by: F17 (update_component), F29 (Web Component base)
