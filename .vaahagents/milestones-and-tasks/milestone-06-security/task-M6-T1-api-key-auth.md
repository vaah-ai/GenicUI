# Task M6-T1 — API key auth (`gnc_live_<32>` Bearer)

> **Milestone:** M6 (Security: API Key Auth)
> **Manifest feature:** F46 (API key auth)
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2-3 days

## Description

Implement API key authentication middleware: `gnc_live_` prefix + 32 random chars (256 bits), validated against SHA-256 hashes. Plain-text keys are never logged. Timing-safe comparison prevents side-channel attacks. This is a hard prerequisite for WebSocket transport (F10 depends on F46).

## Task Goals

- Format check: `gnc_live_` prefix + 32 chars (F46-AC1)
- SHA-256 hash compare (F46-AC2)
- Plain-text key never logged (F46-AC3)
- Timing-safe compare (100µs bound) (F46-AC4)

## Implementation Plan

### Pre-Implementation Analysis

- Depends on M2-T1 (F9 — Elysia server)
- Auth model: API key only per [consolidated-requirements.md §L10](../../../docs/requirements/idea/consolidated-requirements.md#b-locked-technical-decisions)
- Trust boundary: server re-validates every inbound call (§F)

### Steps

1. Implement API key format validation: `gnc_live_` + 32 chars regex
2. Implement SHA-256 hash storage: store only `sha256(input)`, never plain text
3. Implement timing-safe compare (constant-time, <100µs)
4. Implement middleware: `Authorization: Bearer` header + `Sec-WebSocket-Protocol: api-key.<key>`
5. Implement log redaction: show `keyId` only
6. Write integration test: format validation (F46-AC1)
7. Write integration test: hash compare (F46-AC2)
8. Write integration test: log redaction (F46-AC3)
9. Write integration test: timing-safe compare (F46-AC4)

## Acceptance Criteria

- Format check: `gnc_live_` prefix + 32 chars → 401 on wrong format
- SHA-256 hash compare succeeds for valid keys
- Plain-text key never logged
- Timing-safe compare within 100µs bound

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds
- [ ] Trust-boundary strip verified, `additionalProperties: false` enforced
- [ ] Security-touching: trust-boundary checks verified

## Dependencies

- **Requires:** M2-T1 (F9)
- **Blocks:** M2-T2 (F10 — WS transport)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F46]`
- Per-feature: `docs/requirements/specs/features/feature-046-api-key-auth.md`
- Security: `docs/requirements/specs/security.md`
- Locked decisions: `docs/requirements/idea/consolidated-requirements.md` §B (L10)
