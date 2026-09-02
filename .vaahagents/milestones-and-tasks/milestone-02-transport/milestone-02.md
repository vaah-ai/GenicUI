# Milestone M2 — Transport: Server + WebSocket + Frames

> **Roadmap phase:** Transport
> **Roadmap week:** W2
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 7-10 days (1-1.5 weeks × single maintainer)
> **Dependencies:** M1 (Foundations) — all 5 M1 tasks must complete first

## Objective

Build the server transport layer: Elysia HTTP server skeleton, WebSocket transport with API key auth and heartbeat, and frame envelope serialization with channel multiplexing. This enables the first client-server communication path — the backbone for all MCP tool calls. Corresponds to W2 in [roadmap.md](../../../docs/requirements/specs/roadmap.md#week-2-server-skeleton-f9-f10-f11).

## Success Criteria

- [ ] `GET /health` returns 200 with `{status:ok}` in <10ms
- [ ] WS upgrade with valid API key + subprotocol receives `server.hello` in <100ms
- [ ] Frames dispatched in `seq` order, not arrival order
- [ ] 257th channel rejected with -32001
- [ ] Integration smoke test: `wscat -c ws://localhost:8080/ws` receives `server.hello`

## Tasks

- M2-T1 — Bun + Elysia HTTP server skeleton (maps to manifest F9)
- M2-T2 — API key auth (`gnc_live_<32>` Bearer) (maps to manifest F46, moved from M6)
- M2-T3 — WebSocket transport (handshake + auth + heartbeat) (maps to manifest F10)
- M2-T4 — Frame envelope serialization + channel multiplexing (maps to manifest F11)

## Dependencies

- **Blocks:** M3 (Tool Surface — F13 depends on F9, F11)
- **Requires:** M1-T1 (F1), M1-T3 (F3)

## Manifest Cross-References

- Features: F9, F46, F10, F11
- Quality attributes covered: Performance (F9-AC1), Reliability (F10-AC4, F10-AC5), Security (F10-AC2)
- Pipeline handoff invariants honoured: WS transport primary only (consolidated-requirements.md §L8)
