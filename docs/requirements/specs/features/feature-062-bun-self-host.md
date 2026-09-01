---
feature_id: F62
title: "Bun self-host deployment (single binary)"
phase: Deployment
priority: High
effort: M
dependencies: [F9]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#b-locked-technical-decisions
---

# F62 — Bun self-host deployment

`bun build --compile` produces a single binary; `InMemoryStore` (dev) or external Redis (prod) for session storage.

## Inputs / Outputs

**Input:**
```bash
bun build --compile --target=bun-linux-x64 src/server.ts --outfile=genicui-server
./genicui-server --port 8080
```

**Output:**
- A standalone ELF binary
- Logs to stdout

## Acceptance Criteria (Gherkin)

### F62-AC1: Single binary works without Bun installed
- **Given** a fresh Linux machine without Bun
- **When** `./genicui-server` runs
- **Then** the server starts on port 8080

### F62-AC2: Binary size under 50MB
- **Given** the compiled binary
- **When** `ls -la` runs
- **Then** size is <50MB

### F62-AC3: Cold start <100ms
- **Given** the binary is invoked
- **When** `/health` is called
- **Then** response is <100ms after process start

## Test Plan

| AC | Test |
|---|---|
| F62-AC1 | `tests/deploy/bun-binary.test.ts:F62-AC1` clean VM |
| F62-AC2 | `tests/deploy/bun-binary.test.ts:F62-AC2` size assert |
| F62-AC3 | `tests/deploy/bun-binary.test.ts:F62-AC3` cold start |

## Cross-References

- Deployment: [deployment.md §Bun Self-Host](../deployment.md#bun-self-host)
