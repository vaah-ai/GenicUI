---
feature_id: F46
title: "API key auth (`gnc_live_<32>` Bearer)"
phase: Security
priority: Critical
effort: M
dependencies: [F9]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#m-security-decisions-locked
  - ../../idea/consolidated-requirements.md#b-locked-technical-decisions
---

# F46 — API key auth

Keys are `gnc_live_` + 32 random chars (256 bits). Validated against SHA-256 hashes; never logged in plain text.

## Inputs / Outputs

**Input (HTTP):**
```
GET /ws HTTP/1.1
Authorization: Bearer gnc_live_a1b2c3d4e5f6...
```

**Output:**
- 200 + WS upgrade on success
- 401 on failure (no further detail)

## Acceptance Criteria (Gherkin)

### F46-AC1: Format check
- **Given** a key with the wrong prefix or wrong length
- **When** the server validates
- **Then** it returns 401

### F46-AC2: SHA-256 hash compare
- **Given** a stored `keyHash` is `sha256(input)`
- **When** the request arrives with that key
- **Then** auth succeeds

### F46-AC3: Plain-text never logged
- **Given** a successful auth
- **When** the server emits a log line
- **Then** the log shows `keyId` only, not the secret

### F46-AC4: Timing-safe compare
- **Given** two keys differ in the last character
- **When** the compare runs
- **Then** timing differences are below 100µs (constant-time comparison)

## Test Plan

| AC | Test |
|---|---|
| F46-AC1 | `tests/integration/auth.test.ts:F46-AC1` format validation |
| F46-AC2 | `tests/integration/auth.test.ts:F46-AC2` hash compare |
| F46-AC3 | `tests/integration/auth.test.ts:F46-AC3` log redaction |
| F46-AC4 | `tests/integration/auth.test.ts:F46-AC4` timing-safe |

## Cross-References

- Locked by: [consolidated-requirements.md §M Security Decisions](../../idea/consolidated-requirements.md#m-security-decisions-locked)
- Security: [security.md §Authentication](../security.md#authentication)
- Used by: F10 (WS transport)
