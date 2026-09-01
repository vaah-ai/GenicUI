---
feature_id: F14
title: "Trust-boundary validation"
phase: "Tool Surface"
priority: Critical
effort: M
dependencies: [F2, F13]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#c-non-functional-requirements-iso-25010
  - ../../idea/consolidated-requirements.md#f-component-system-locked
---

# F14 — Trust-boundary validation

Every inbound tool call is re-validated against `GenicSchema<T>`; prototype pollution keys stripped; `additionalProperties: false` enforced.

## Inputs / Outputs

**Input (payload with prototype pollution):**
```json
{ "componentId": "dt-1", "props": { "rows": [], "__proto__": { "isAdmin": true } } }
```

**Output (server rejects):**
```json
{ "isError": true, "content": [{ "type": "text", "text": "{\"code\":-32003,\"message\":\"props_invalid\",\"data\":{\"details\":[\"prototype pollution detected: __proto__\"]}}" }] }
```

## Acceptance Criteria (Gherkin)

### F14-AC1: __proto__/constructor/prototype stripped
- **Given** a tool call with `__proto__`, `constructor`, or `prototype` in any field
- **When** server validates
- **Then** it strips these keys before processing and logs a warning

### F14-AC2: Invalid props → -32003
- **Given** a tool call whose props don't match the registered TypeBox schema
- **When** `Value.Check()` runs
- **Then** server returns `-32003 props_invalid` with field-level details

### F14-AC3: additionalProperties:true rejected at load
- **Given** a tool call with `additionalProperties: true` in the schema
- **When** server validates
- **Then** server rejects the schema at registry-load time

### F14-AC4: Patch op with invalid path → -32004
- **Given** an inbound patch op `replace` with a path that doesn't exist in current state
- **When** applied
- **Then** server returns `-32004 patch_invalid`

## Test Plan

| AC | Test |
|---|---|
| F14-AC1 | `tests/integration/trust-boundary.test.ts:F14-AC1` 10K random payloads with malicious keys |
| F14-AC2 | `tests/integration/schema-validation.test.ts:F14-AC2` invalid TypeBox input |
| F14-AC3 | `tests/integration/registry-load.test.ts:F14-AC3` open schema rejected at load |
| F14-AC4 | `tests/integration/patch-validation.test.ts:F14-AC4` invalid patch path |

## Cross-References

- Security: [security.md §Trust Boundaries](../security.md#trust-boundaries), [§Prototype Pollution Defense](../security.md#prototype-pollution-defense)
- Architecture: [architecture.md §State Management](../architecture.md#state-management)
- Test strategy: [testing-strategy.md §Property-Based Tests](../testing-strategy.md#property-based-tests)
