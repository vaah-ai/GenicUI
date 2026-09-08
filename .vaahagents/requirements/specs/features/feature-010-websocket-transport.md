---
feature_id: F10
title: "WebSocket transport (handshake + auth + heartbeat)"
phase: Transport
priority: Critical
effort: L
dependencies: [F9, F46]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#b-locked-technical-decisions
  - ../../idea/consolidated-requirements.md#e-wire-protocol-locked
---

# F10 — WebSocket transport (handshake + auth + heartbeat)

WS upgrade with subprotocol `genicui.v1`, API key in `Sec-WebSocket-Protocol` or `Authorization` header, `server.hello` first frame, 30s heartbeat.

## Inputs / Outputs

**Input (client handshake):**
```
GET /ws HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: ...
Sec-WebSocket-Protocol: genicui.v1, api-key.gnc_live_abc123
Sec-WebSocket-Version: 13
```

**Output (server first frame):**
```
{"v":1,"channel":"__session__","type":"server.hello","payload":{"sessionId":"sess-9f8e7d","serverVersion":"0.1.0","heartbeatMs":30000},"seq":1}
```

## Acceptance Criteria (Gherkin)

### F10-AC1: Valid upgrade + server.hello within 100ms
- **Given** a client sends a WS upgrade with subprotocol `genicui.v1` and API key
- **When** the key validates
- **Then** connection upgrades and server sends `server.hello` within 100ms

### F10-AC2: Invalid key → HTTP 401
- **Given** an invalid API key
- **When** the upgrade arrives
- **Then** server returns HTTP 401 and closes

### F10-AC3: Missing subprotocol → HTTP 400
- **Given** no `Sec-WebSocket-Protocol` header
- **When** the upgrade arrives
- **Then** server returns HTTP 400 (rejects non-genicui clients)

### F10-AC4: 30s ping with 5s pong deadline
- **Given** a connection is open for 30s with no traffic
- **When** heartbeat timer fires
- **Then** server sends a ping frame; client must pong within 5s

### F10-AC5: 2 missed pongs → WS close 1011
- **Given** client misses 2 pongs
- **When** server detects timeout
- **Then** server closes with WS code 1011

## Test Plan

| AC | Test |
|---|---|
| F10-AC1 | `tests/integration/transport.test.ts:F10-AC1` wscat + key + subprotocol |
| F10-AC2 | `tests/integration/auth.test.ts:F10-AC2` bad key, expect 401 |
| F10-AC3 | `tests/integration/transport.test.ts:F10-AC3` no subprotocol |
| F10-AC4 | `tests/integration/transport.test.ts:F10-AC4` heartbeat timing with stub client |
| F10-AC5 | `tests/integration/transport.test.ts:F10-AC5` silent client, expect close 1011 |

## Cross-References

- Locked by: [consolidated-requirements.md §L8 Transport, §L10 Auth](../../idea/consolidated-requirements.md#b-locked-technical-decisions)
- Architecture: [architecture.md §Transport Topology](../architecture.md#transport-topology)
- Security: [security.md §Authentication](../security.md#authentication)
