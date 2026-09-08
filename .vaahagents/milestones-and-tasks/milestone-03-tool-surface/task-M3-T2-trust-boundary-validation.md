# Task M3-T2 — Trust-boundary validation

> **Milestone:** M3 (Tool Surface: MCP + 4 Public Tools)
> **Manifest feature:** F14 (Trust-boundary validation)
> **Priority:** Critical
> **Status:** ✅ Completed
> **Estimated Effort:** 2 days

## Description

Implement trust-boundary validation: strip `__proto__`/`constructor`/`prototype` from all inbound props, enforce `additionalProperties: false` on all tool input schemas, and validate patch operations. This is the security layer protecting the server from prototype pollution attacks.

## Task Goals

- `__proto__`/`constructor`/`prototype` stripped (F14-AC1)
- Invalid props → -32003 with field details (F14-AC2)
- `additionalProperties: true` rejected at registry load (F14-AC3)
- Patch op with invalid path → -32004 (F14-AC4)

## Implementation Plan

### Pre-Implementation Analysis

- Invoke `sequential-thinking` skill for trust-boundary correctness proof
- Depends on M1-T2 (F2 — schema) and M3-T1 (F13 — MCP server)
- `stripProtoKeys` function required on every inbound tool call

### Steps

1. Implement `stripProtoKeys(input)` — removes `__proto__`, `constructor`, `prototype`
2. Implement TypeBox `Value.Check()` on every inbound tool call
3. Reject `additionalProperties: true` at schema load
4. Validate patch operation paths against component schema
5. Write integration test: prototype keys stripped (F14-AC1)
6. Write integration test: invalid props → -32003 (F14-AC2)
7. Write integration test: additionalProperties rejected (F14-AC3)
8. Write integration test: invalid patch path → -32004 (F14-AC4)
9. Write property test: fast-check 10K payloads with prototype keys (testing-strategy.md)

## Acceptance Criteria

- `__proto__`/`constructor`/`prototype` stripped from all inbound props
- Invalid props → -32003 with field details
- `additionalProperties: true` rejected at registry load
- Patch op with invalid path → -32004

## Completion Criteria

- [x] All acceptance criteria above pass
- [x] `bun run test` exits green (336 tests across 20 files)
- [x] `bun run lint` reports zero errors
- [x] `bun run build` succeeds
- [x] Coverage target met: 90% tool handlers
- [x] Property-based test passing (fast-check 10K runs)
- [x] Security-touching: trust-boundary strip verified, `additionalProperties: false` enforced

## Delivery Summary

- **Modules created:** 5 source files in `packages/server/src/validation/` + 5 test files
- **Tests:** 62 tests (17 strip-proto-keys, 9 schema-validation, 11 registry-validation, 18 patch-validation, 17 property-based)
- **Integration:** `wrapWithValidation` middleware applied to all 4 tool handlers in `tool-registry.ts`
- **Exports:** Updated `mcp/index.ts` to re-export validation module

## Dependencies

- **Requires:** M1-T2 (F2), M3-T1 (F13)
- **Blocks:** All downstream tool handlers (F15-F18, F28)

## Documentation References

- Manifest: `.vaahagents/requirements/specs/manifest.json` → `features[F14]`
- Per-feature: `.vaahagents/requirements/specs/features/feature-014-trust-boundary-validation.md`
- Security: `.vaahagents/requirements/specs/security.md`
