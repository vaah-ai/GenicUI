---
name: M4-T2 InternalEventBus Complete
description: F20 InternalEventBus implementation with backpressure, post-emit hooks, 18 tests
metadata:
  type: project
---

**Completed:** 2026-09-03

F20 InternalEventBus with 4 ACs: emit returns seq (AC1), post-emit hook after WS write (AC2), queue overflow closes socket with code 1013 (AC3), failed deliver drops without crash (AC4).

**Files:**
- `packages/server/src/bus/types.ts` — PostEmitHook, EmitResult, MAX_OUTBOUND_QUEUE=500, CLOSE_CODE_QUEUE_OVERFLOW=1013
- `packages/server/src/bus/event-bus.ts` — InternalEventBus class (173 lines)
- `packages/server/src/bus/event-bus.test.ts` — 18 tests
- `packages/server/src/transport/types.ts` — Added eventBus to WsSession
- `packages/server/src/transport/websocket.ts` — Create/dispose InternalEventBus per session

**Key patterns:** [[InternalEventBus patterns]]

**Test results:** 364 total server tests pass, 18 new tests for F20.

**Why:** Decouples inbound events from outbound emission, provides per-socket backpressure.
**How to apply:** Future tasks (M4-T3 server-side event application, M4-T5 runtime engine) will use `session.eventBus.emit()` to send frames to clients with backpressure protection.
