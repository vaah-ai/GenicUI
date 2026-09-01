# Milestone M6 — Security: API Key Auth

> **Roadmap phase:** Security
> **Roadmap week:** W10
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 3-5 days
> **Dependencies:** M2-T1 (F9 — Elysia server) — needs server skeleton for middleware

## Objective

Implement API key authentication with `gnc_live_<32>` Bearer tokens, SHA-256 hash comparison, timing-safe compare, and plain-text redaction. This is a prerequisite for WebSocket transport (F10 depends on F46) and must be delivered early despite W10 placement in the roadmap. Corresponds to the Security phase in [roadmap.md](../../../docs/requirements/specs/roadmap.md#week-10-api-key-auth-f46).

## Success Criteria

- [ ] Format check: `gnc_live_` prefix + 32 chars (F46-AC1)
- [ ] SHA-256 hash compare succeeds for valid keys (F46-AC2)
- [ ] Plain-text key never logged (F46-AC3)
- [ ] Timing-safe compare within 100µs bound (F46-AC4)

## Tasks

- M6-T1 — API key auth (`gnc_live_<32>` Bearer) (maps to manifest F46)

## Dependencies

- **Blocks:** M2-T2 (F10 — WS transport depends on auth)
- **Requires:** M2-T1 (F9 — server skeleton for middleware)

## Manifest Cross-References

- Features: F46
- Quality attributes covered: Security (all 4 ACs)
- Pipeline handoff invariants honoured: API key auth only (consolidated-requirements.md §L10)
