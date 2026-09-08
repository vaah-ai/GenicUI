# Task M2-T3 — WebSocket transport (handshake + auth + heartbeat)

> **Milestone:** M2 (Transport: Server + WebSocket + Frames)
> **Manifest feature:** F10 (WebSocket transport)
> **Priority:** Critical
> **Status:** ✅ Completed
> **Estimated Effort:** 3-5 days
> **Completed:** 2026-09-02
> **Delivered:** transport/types.ts, transport/websocket.ts, transport/websocket.test.ts (54 tests, 84 expects, 0 failures)

## Description

Implement WebSocket transport: upgrade with `genicui.v1` subprotocol, API key authentication (delegated to F46), `server.hello` first frame, and 30s heartbeat with pong timeout. This is the primary transport — all MCP tool calls flow over this channel.

## Task Goals

- Valid key + subprotocol → upgrade + `server.hello` in 100ms (F10-AC1)
- Invalid key → HTTP 401 (F10-AC2)
- Missing subprotocol → HTTP 400 (F10-AC3)
- 30s heartbeat ping; client must pong in 5s (F10-AC4)
- 2 missed pongs → WS close 1011 (F10-AC5)

## Implementation Plan

### Pre-Implementation Analysis

- Depends on M2-T1 (F9) and M2-T2 (F46 — auth, same milestone)
- Subprotocol: `genicui.v1` per consolidated-requirements.md §E
- Heartbeat: 30s ping, 5s pong deadline, 2 missed = close 1011

### Steps

1. Implement WS upgrade handler at `/ws` with subprotocol validation
2. Delegate auth to F46 middleware (Bearer or `Sec-WebSocket-Protocol: api-key.<key>`)
3. Implement `server.hello` first frame: `{ sessionId, serverVersion, heartbeatMs: 30000 }`
4. Implement heartbeat: 30s ping, 5s pong deadline, 2 missed → close 1011
5. Write integration test: valid upgrade + server.hello within 100ms (F10-AC1)
6. Write integration test: invalid key → 401 (F10-AC2)
7. Write integration test: missing subprotocol → 400 (F10-AC3)
8. Write integration test: heartbeat timing (F10-AC4)
9. Write integration test: 2 missed pongs → close 1011 (F10-AC5)

## Acceptance Criteria

- Valid key + subprotocol upgrades and server.hello in 100ms
- Invalid key → HTTP 401
- Missing subprotocol → HTTP 400
- 30s heartbeat ping; client must pong in 5s
- 2 missed pongs → WS close 1011

## Completion Criteria

- [x] All acceptance criteria above pass
- [x] `bun run test` exits green (54 tests, 0 failures)
- [x] `bun run lint` reports zero errors
- [x] `bun run build` succeeds

## Dependencies

- **Requires:** M2-T1 (F9 — Elysia server), M2-T2 (F46 — API key auth)
- **Blocks:** M4-T7 (F33 — session recovery), M6-T1 (F61 — CF Workers)

## Documentation References

- Manifest: `.vaahagents/requirements/specs/manifest.json` → `features[F10]`
- Per-feature: `.vaahagents/requirements/specs/features/feature-010-websocket-transport.md`
- Wire protocol: `.vaahagents/requirements/idea/consolidated-requirements.md` §E
