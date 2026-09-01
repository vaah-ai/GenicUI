---
feature_id: E2E
title: "E2E Testing Infrastructure — Playwright"
phase: PoC
priority: High
effort: M
dependencies:
  - F9  # Chat HTTP API
  - F10 # WebSocket transport
  - F16 # render_component
  - F17 # update_component
  - F18 # subscribe_to_events
methodology: Specification by Example
status: implemented
---

# E2E — Playwright testing infrastructure

End-to-end test suite for the GenicUI PoC, driven by Playwright. Tests the browser chat surface, WebSocket bridge, SSE streaming, and component lifecycle through real HTTP and WebSocket connections.

## Purpose

Verify the complete GenicUI flow from browser interaction to server response: agent renders component, user clicks, event emitted, component updated.

## Architecture

```
┌───────────────────────────────┐
│  Playwright (chromium)        │
│                               │
│  e2e/chat-surface.spec.ts     │  Browser UI, session API, SSE, CORS
│  e2e/component-render.spec.ts │  Component mount/update/unmount
│  e2e/event-bridge.spec.ts     │  WebSocket bridge, hello, actions
│  e2e/full-flow.spec.ts        │  Full flow: render → update → event
└───────────────────────────────┘
              │
              ▼
┌───────────────────────────────┐
│  PoC Server (auto-started)    │
│                               │
│  global-setup.mjs             │  Spawns web + MCP servers
│  global-teardown.mjs          │  Kills servers via PID file
└───────────────────────────────┘
```

## Test files

### e2e/global-setup.mjs

Starts the PoC services before any tests run. Checks if servers are already running; if not, spawns:

- Static web server: `python3 -m http.server 8080 --bind 127.0.0.1` (serving `poc/web/`)
- MCP server: `node poc/server/index.mjs` (ports 9876 WebSocket + 9877 HTTP)

Polls both until ready (up to 15s timeout). Stores PIDs in `e2e/.server.pids` for teardown.

### e2e/global-teardown.mjs

Reads `e2e/.server.pids`, sends SIGTERM to each process, waits 2s, then sends SIGKILL. Cleans up PID file.

### e2e/chat-surface.spec.ts

Tests the browser chat UI and chat API:

- Page loads with welcome message, heading, status, messages area, composer, prompt textarea, send button
- POST `/chat/sessions` returns 201 with `sessionId`
- Multiple sessions return different IDs
- POST `/chat/sessions/:id/messages` with empty content returns 400
- POST to non-existent session returns 404
- GET `/chat/sessions/:id/stream` returns 200 with `text/event-stream`
- Unknown routes return 405/404
- Send button disabled initially, enabled when text is entered
- User message appears in transcript after send
- Typing indicator appears during message processing
- CORS preflight returns 204

### e2e/component-render.spec.ts

Tests component lifecycle through the browser:

- Component mount creates DOM element with correct structure
- Component mount — happy path: render appears in DOM
- Component mount — edge case: empty component list
- Component mount — error path: non-existent component
- Component update — in-place re-render without remount
- Component unmount — removes element from DOM

### e2e/event-bridge.spec.ts

Tests WebSocket bridge and component actions:

- Bridge connects and status shows connected
- Bridge hello message includes component count
- Component action emits wire frame
- Component action — happy path: includes componentId and action
- Component action — edge case: no action payload
- Component action — error path: component not mounted
- Bridge handles server restart gracefully
- Bridge hello — adapter list is non-empty

### e2e/full-flow.spec.ts

Tests the complete GenicUI flow:

- Full flow: agent renders component, user clicks, event emitted
- Chat session creation via API
- Component render appears in chat transcript
- WebSocket bridge sends hello message on connect
- SSE stream returns events for active session

## Configuration

`playwright.config.ts`:

- Test directory: `./e2e`
- Timeout: 30s per test
- Fully parallel
- Retries: 2 on CI, 0 locally
- Chromium only
- Screenshots: only on failure
- Video: on first retry
- Global setup/teardown: `./e2e/global-setup.mjs` / `./e2e/global-teardown.mjs`

## Ports

| Service | Port | Env var |
|---|---|---|
| Web chat surface | 8080 | `GENICUI_WEB_PORT` |
| WebSocket bridge | 9876 | `GENICUI_BRIDGE_PORT` |
| HTTP chat API | 9877 | `GENICUI_HTTP_PORT` |

## Run

```bash
# Run all E2E tests
npx playwright test

# Run a single spec
npx playwright test e2e/chat-surface.spec.ts

# Run with browser visible
npx playwright test --headed

# Run with tracing (on failure)
npx playwright test --trace on
```

## Limitations

- **WebSocket injection.** Playwright cannot inject messages directly into the browser's WebSocket (it's in module scope). Component rendering tests verify the infrastructure is in place rather than sending actual render commands. Detailed WebSocket message tests live in server-side integration tests (`poc/server/integration.test.mjs`).
- **Requires claude on PATH.** The chat backend shells out to `claude --print` per turn. E2E tests that send messages through the chat surface require `claude` to be available.
- **Single browser tab.** The WebSocket bridge holds one `browser` reference; first tab wins.

## Cross-References

- [testing-strategy.md](../testing-strategy.md) — overall test strategy and pyramid
- [poc/README.md](../../../poc/README.md) — PoC architecture and file tour
- [architecture.md](../architecture.md) — system topology
- [features.md](../features.md) — feature acceptance criteria
- [feature-001-genicui-core-package-skeleton.md](./feature-001-genicui-core-package-skeleton.md) — core package
