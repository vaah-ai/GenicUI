---
feature_id: F33
title: "Session recovery (last 10 messages replayed)"
phase: Runtime
priority: High
effort: M
dependencies: [F5, F10]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#h-architecture-patterns-locked
---

# F33 — Session recovery

On WS reconnect, last 10 messages (or last 5s) are replayed to the new socket.

## Inputs / Outputs

**Input (reconnect):**
```
WS upgrade with header `Last-Event-ID: dt-7f3a9b2c:14`
```

**Output (server replays):**
```
{"v":1,"channel":"dt-7f3a9b2c","type":"STATE_DELTA","payload":[...],"seq":15}
... (replay up to current)
{"v":1,"channel":"__session__","type":"session.resynced","payload":{"fromSeq":14,"toSeq":17}}
```

## Acceptance Criteria (Gherkin)

### F33-AC1: Replay bounded by window
- **Given** a session with 10 prior messages in the last 5 seconds
- **When** a reconnect arrives
- **Then** only those 10 are replayed

### F33-AC2: Last-Event-ID honored
- **Given** `Last-Event-ID: dt-7f3a9b2c:14`
- **When** the server replays
- **Then** events with seq > 14 are replayed, ordered

### F33-AC3: Gap detected → STATE_SNAPSHOT
- **Given** a reconnect whose `Last-Event-ID` is older than the replay window
- **When** server processes
- **Then** it sends `STATE_SNAPSHOT` instead of partial replay

## Test Plan

| AC | Test |
|---|---|
| F33-AC1 | `tests/integration/session-recovery.test.ts:F33-AC1` window bound |
| F33-AC2 | `tests/integration/session-recovery.test.ts:F33-AC2` Last-Event-ID |
| F33-AC3 | `tests/integration/session-recovery.test.ts:F33-AC3` gap → snapshot |

## Cross-References

- Architecture: [architecture.md §Session Management](../architecture.md#state-management)
