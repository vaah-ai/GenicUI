# Task M5-T7 — Component-Event Interactivity (chat.component_event)

> **Milestone:** M5 (Registry: Component Registry + PrimeVue Adapter)
> **Manifest feature:** F47 (proposed — Component-event interactivity. See Notes below — manifest F{n} assignment pending.)
> **Priority:** High
> **Status:** ✅ Completed
> **Estimated Effort:** 5-7 days

## Description

Close the agent ↔ user interactivity loop so that user actions inside a mounted component (clicks, submits, selections) flow back to the agent as a new turn, and the agent responds with a follow-up `render_component`. The canonical end-to-end scenario is the **CityPicker → WeatherCard** flow: user picks a city in `CityPicker`, the client fires a `chat.component_event` frame on the `__chat__` channel, the server kills the active Claude Code subprocess, respawns it with `--resume <claudeSessionId>` + a synthetic prompt, and the new turn renders `WeatherCard` inside the chat bubble. The previously-mounted `CityPicker` stays interactive so the user can pick again.

Architecturally this is the bridge between F19 (event capture from Custom Elements) and F24 (server-side event application) on the inbound side, and F43 (suggestive prompts/chat-as-render-surface) on the outbound side. No new package boundary, no new protocol layer — reuses the existing `__chat__` channel and `chat.event` frame type, only adds a new `type: "chat.component_event"` inbound variant and a new outbound `event.type === "user_event"` payload.

The detailed plan lives in `/Users/pk/.claude/plans/abstract-zooming-hellman.md` (a 6-step change across client + server). This task file groups those 6 steps into 4 sub-tasks of ~1-2 days each.

## Task Goals

- F47-AC1 — A user action inside a rendered component (e.g. `CityPicker` city selection + Submit) produces a `chat.component_event` WS frame on `__chat__` carrying `{ componentId, name, action, payload }`.
- F47-AC2 — Server handler `handleChatComponentEvent` validates the payload (F14 trust-boundary strip), resolves the active `claudeSessionId`, kills the subprocess, synthesises a follow-up prompt, and broadcasts a synchronous `chat.user_event` to the client BEFORE spawning the follow-up turn.
- F47-AC3 — Client renders a synthetic user bubble (`Clicked Submit on CityPicker with city=Paris`) in the chat history; this bubble appears BEFORE the new assistant turn's first `ai_text`/`tool_call` events.
- F47-AC4 — The follow-up turn spawns Claude Code with `--resume <claudeSessionId>` (preserves conversation context) and the agent calls `render_component` for `WeatherCard`, which mounts inside the chat bubble alongside the still-mounted `CityPicker`.
- F47-AC5 — `WeatherCard` (a Vue 3 component) accepts a `city: string` prop and fetches the current weather from a free public API client-side using `fetch()` in `onMounted`; weather details render inside the card.
- F47-AC6 — Missing `claudeSessionId` for the inbound WebSocket is rejected with a `chat.error` frame (no close); the WebSocket remains usable for future `chat.message` calls.

## Implementation Plan

> ⚠️ Analyze this plan thoroughly before implementing. Invoke relevant skills and MCP servers as needed.

### Pre-Implementation Analysis

- The detailed 6-step change lives in `/Users/pk/.claude/plans/abstract-zooming-hellman.md`. Read it first — it covers the kill/resume ordering, the synthetic prompt shape, the F14 trust-boundary strip application, and the WS frame envelope.
- Invoke `sequential-thinking` skill to verify the **subprocess kill ordering** invariant: `await proc.kill()` MUST resolve before `await proc.exited.catch(() => undefined)` before `await runChatTurn(...)`. A stray stdout line from the killed process leaking into the next turn's `handleParsedLine` would be a silent state corruption.
- The synthetic `chat.user_event` MUST broadcast synchronously (before `await runChatTurn`) so the client receives it before the next turn's first event — verify ordering by reading `sendChatUserEvent` placement in `chat-handler.ts`.
- Trust boundary: inbound `chat.component_event` payload from the WebSocket client MUST go through `eventCapture.capture()` (F18 path) with `additionalProperties: false` on the schema to prevent prototype pollution. Reuse `stripProtoKeys`.
- No new package boundary. No new protocol layer. Reuse existing `__chat__` channel + `chat.event` frame type.

### Sub-task breakdown (4 units, ~1-2 days each)

| SubTask ID   | Title                                                          | Status        | Maps to plan step | Priority |
| ------------ | -------------------------------------------------------------- | ------------- | ----------------- | -------- |
| M5-T7-01     | Registry entries: `CityPicker` + `WeatherCard` schemas, events | ⚪ Not Started | Plan step 1       | High     |
| M5-T7-02     | Client event-bus + `RenderedComponent` branches + `useChat.user_event` | ⚪ Not Started | Plan steps 2-3, 5 | High     |
| M5-T7-03     | Server: `killActiveSubprocess` + `runChatTurn` extraction + `handleChatComponentEvent` + `sendChatUserEvent` + WS branch | ⚪ Not Started | Plan step 4       | High     |
| M5-T7-04     | Layout polish: `WeatherCard` in chat + integration UAT via Playwright | ⚪ Not Started | Plan step 6       | Medium   |

#### M5-T7-01 — Registry entries (Plan step 1)

- Create `registries/primevue/src/city-picker-schema.ts` — TypeBox: `{ initialCity?: string, cityOptions: string[] (min 2), label?: string }`.
- Create `registries/primevue/src/weather-card-schema.ts` — TypeBox: `{ city: string, units?: 'metric' | 'imperial' }`.
- Create `registries/primevue/src/city-picker-events.ts` — declares `submit` event with payload `{ city: string }`.
- Update `registries/primevue/registry.json` — add both entries with `examplePrompts`: ["Show me today's weather", "Weather in Paris please", "Pick a city and tell me the weather"]. Wire `tags: ["interactive", "weather"]` for the chips filter.
- Update `registries/primevue/src/index.ts` and `registry.ts` — wire new schemas + events.
- Add `city-picker-registry.test.ts` + `weather-card-registry.test.ts` mirroring `data-table-registry.test.ts` (F37 conformance-style smoke).
- F47-AC5 partial: `WeatherCard` accepts a `city` prop; the actual `fetch()` lives in `RenderedComponent.vue` per plan step 3.

#### M5-T7-02 — Client event-bus + RenderedComponent branches + useChat.user_event (Plan steps 2-3, 5)

- Create `examples/playground/app/composables/component-event-bus.ts` — module-singleton emitter (`on(componentId, handler)`, `emit(componentId, evt)`, `off(componentId)`). Lets `RenderedComponent` find the right consumer handler without prop drilling.
- Modify `examples/playground/app/composables/useComponents.ts`:
  - Add `sendComponentEvent(ws, componentId, name, action, payload?)` that builds the `chat.component_event` WS frame and calls `ws.send(frame)`.
  - Add `nameFor(componentId): string | undefined` lookup that reads from the existing `components[]` ref so the outbound frame carries the component name even if the caller doesn't have it.
- Modify `examples/playground/app/components/RenderedComponent.vue`:
  - Add `isCityPicker = computed(() => props.name === 'CityPicker')` and `isWeatherCard = computed(() => props.name === 'WeatherCard')`.
  - `CityPicker` template: a `Dropdown` (city list) + a `<Button label="Show weather">`. Submit handler calls `useComponents().sendComponentEvent(ws, componentId, 'CityPicker', 'submit', { city })`.
  - `WeatherCard` template: a `<Card>` showing the city, current temperature, conditions, icon. Uses `fetch('https://api.open-meteo.com/v1/forecast?latitude=…&longitude=…')` (free, no API key) keyed off the `city` prop; geocoding via `https://geocoding-api.open-meteo.com/v1/search?name=<city>`. Loading + error states.
- Modify `examples/playground/app/components/ToolCallAccordion.vue` — ensure `componentId` is forwarded to `<RenderedComponent>` (verify or add).
- Modify `examples/playground/app/composables/useChat.ts` — in `handleEvent` switch, add `case 'user_event'` that pushes a synthetic user bubble `{ prompt: '[click] submit on CityPicker city=Paris', response: '', status: 'complete', toolCalls: [], timestamp }`.
- New tests:
  - `examples/playground/app/composables/__tests__/component-event-bus.test.ts` — emit/on/off unit tests (multi-handler, idempotent off).
  - `examples/playground/app/composables/__tests__/useComponents.sendComponentEvent.test.ts` — frame envelope shape + `ws.send` invocation.
  - `examples/playground/app/composables/__tests__/chat.test.ts` — extend with `user_event` case.

#### M5-T7-03 — Server: kill + runChatTurn + handleChatComponentEvent + sendChatUserEvent + WS branch (Plan step 4)

- Modify `packages/server/src/transport/types.ts` — add `ChatComponentEventPayload`: `{ componentId: string; name?: string; action: string; payload?: Record<string, unknown> }`.
- Modify `packages/server/src/chat/chat-session-registry.ts` — add `killActiveSubprocess(sessionId): Promise<boolean>` that calls `proc.kill()` + `await proc.exited.catch(() => undefined)` and returns whether something was killed.
- Modify `packages/server/src/chat/chat-handler.ts`:
  - **Extract** `runChatTurn(session, { prompt, registry, provider, providerId }, synthesizedBy?)` from the current turn-spawn logic so it accepts a custom prompt. The `synthesizedBy` parameter is informational only (logged for diagnostics).
  - **Add** `handleChatComponentEvent(session, payload)` exported function:
    1. Validate payload via `eventCapture.capture({ composed: true, componentId, name, action, payload })` (reuse F18 path; schema MUST be `additionalProperties: false`).
    2. Resolve `claudeSessionId` via `getClaudeSession(sessionId)` — required; if null, send `chat.error` "No active Claude session for this WebSocket — please send a chat.message first" and return. **DO NOT close the WebSocket.**
    3. `await killActiveSubprocess(sessionId)`.
    4. Synthesize prompt: `[component_event] user triggered "${action}" on component "${name}" (id=${componentId}) with payload ${JSON.stringify(payload)}. The previous component is still mounted in the chat. Continue the conversation by rendering a follow-up component.`
    5. `sendChatUserEvent(session, { componentId, name, action, payload })` — **synchronous**, so the user_event reaches the client BEFORE the new turn's first `ai_text`/`tool_call` frames.
    6. `await runChatTurn(session, { prompt: synthesizedPrompt, registry: existing, provider, providerId }, 'component_event')`.
  - **Add** `sendChatUserEvent(session, payload)` near the existing `sendChatEvent` helpers.
- Modify `packages/server/src/transport/websocket.ts` — new branch in `message()` (after the existing `chat.message` branch, before the multiplexer fallthrough): if `frame.channel === '__chat__' && frame.type === 'chat.component_event'` → `handleChatComponentEvent(session, frame.payload).catch(handleAsyncError)`.
- New tests:
  - `packages/server/src/chat/__tests__/chat-component-event.test.ts`:
    - Validates payload via `eventCapture` (rejects payload with `__proto__`, `constructor`, `prototype` keys).
    - Returns `chat.error` when no `claudeSessionId` is registered.
    - Calls `killActiveSubprocess` before spawning the follow-up.
    - Broadcasts `user_event` synchronously before the follow-up turn (assert via ordered mock calls).
    - Synthesizes the prompt with the right structure (componentId, name, action, payload).
    - Round-trip: stub provider records the synthetic prompt and emits a `render_component` tool_call → assert the synthesized prompt reached the provider.
  - Extend `packages/server/src/chat/chat-handler.test.ts` with a stub-provider round-trip case.

#### M5-T7-04 — Layout polish + integration UAT (Plan step 6)

- Manual UAT via `examples/playground/start.sh` (already wired in this branch).
- Verify via Playwright that the 3-zone layout (sidebar + PromptsPanel + chat) survives the new flow (added in commit 7acb0f8).
- Confirm `WeatherCard` mounts and renders weather details (real API fetch inside `RenderedComponent`).
- Confirm `CityPicker` remains interactive across multiple turns (change city, click Submit, see new user bubble + new `WeatherCard`).
- Sidebar counter pill reads "2 mounted" after two follow-up components, "0 mounted" if no components are mounted.

### Skills & MCP Servers

| Resource                  | Purpose                                    | When to Invoke                                              |
| ------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| `sequential-thinking`     | Subprocess kill ordering invariant proof   | Before starting M5-T7-03 (kill before respawn ordering)     |
| `filesystem` (MCP)        | File creation / modification               | Sub-tasks 01, 02, 03, 04 — all writes go through this tool |
| `memory` (MCP)            | Persist derived helpers                    | After M5-T7-03 ships, save the `killActiveSubprocess` helper to cross-session memory |

## Acceptance Criteria

- F47-AC1 — A user action inside a rendered component (e.g. `CityPicker` city selection + Submit) produces a `chat.component_event` WS frame on `__chat__` carrying `{ componentId, name, action, payload }`.
- F47-AC2 — Server handler `handleChatComponentEvent` validates the payload (F14 trust-boundary strip), resolves the active `claudeSessionId`, kills the subprocess, synthesises a follow-up prompt, and broadcasts a synchronous `chat.user_event` to the client BEFORE spawning the follow-up turn.
- F47-AC3 — Client renders a synthetic user bubble (`Clicked Submit on CityPicker with city=Paris`) in the chat history; this bubble appears BEFORE the new assistant turn's first `ai_text`/`tool_call` events.
- F47-AC4 — The follow-up turn spawns Claude Code with `--resume <claudeSessionId>` (preserves conversation context) and the agent calls `render_component` for `WeatherCard`, which mounts inside the chat bubble alongside the still-mounted `CityPicker`.
- F47-AC5 — `WeatherCard` (a Vue 3 component) accepts a `city: string` prop and fetches the current weather from a free public API client-side using `fetch()` in `onMounted`; weather details render inside the card.
- F47-AC6 — Missing `claudeSessionId` for the inbound WebSocket is rejected with a `chat.error` frame (no close); the WebSocket remains usable for future `chat.message` calls.

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green (full suite, all layers) — including new tests for `chat-component-event.test.ts`, `component-event-bus.test.ts`, `useComponents.sendComponentEvent.test.ts`, `chat.test.ts`, `city-picker-registry.test.ts`, `weather-card-registry.test.ts`
- [ ] `bun run lint` reports zero errors (zero `any`, ESLint clean)
- [ ] `bun run build` succeeds
- [ ] Trust-boundary strip verified: `chat.component_event` payload with `__proto__`, `constructor`, `prototype` keys rejected (or sanitised) by `eventCapture.capture()`
- [ ] Subprocess kill ordering verified: `kill()` → `await exited` → `runChatTurn` (no stdout leak)
- [ ] No new `any` types introduced
- [ ] No new package boundary created (stays within `packages/server` + `examples/playground` + `registries/primevue`)

## Testing Checklist

- [ ] Unit tests written and passing — one Bun test per AC, `testId` references match manifest
- [ ] Integration tests passing — Bun in-process WebSocket round-trip for the inbound `chat.component_event` + outbound `chat.user_event` ordering
- [ ] E2E smoke — Playwright cover-the-render: prompt → CityPicker mounted → click Submit → synthetic bubble → WeatherCard mounted with weather details
- [ ] No property-based tests required (F47 doesn't touch the seq/idempotency invariants covered by fast-check)
- [ ] No conformance-suite required (F47 doesn't introduce a new registry — reuses F37/F40 registry infrastructure)

## Dependencies

- **Requires:** M5-T1 (F37 component registry), M5-T3 (F40 PrimeVue DataTable registry), M5-T4 (F41 playground app skeleton), M5-T5 (F42 agent bridge), M5-T6 (F43 suggestive prompts + chat panel), M4-T1 (F19 event capture — reuses `eventCapture.capture`), M4-T3 (F24 server-side event application — reuses for `chat.user_event` outbound type)
- **Requires:** The detailed 6-step plan at `/Users/pk/.claude/plans/abstract-zooming-hellman.md` is the authoritative implementation reference.
- **Blocks:** F47 unblocks user-driven agent turns. No downstream tasks in the active manifest depend on F47; M6 (Deployment) can proceed in parallel.
- **Status of requires:** ALL upstream tasks are ✅ Complete as of 2026-09-08. No blockers.

## Documentation References

- Detailed implementation plan: `/Users/pk/.claude/plans/abstract-zooming-hellman.md` (6-step plan, authoritative)
- Manifest: `docs/requirements/specs/manifest.json` → F47 is currently in the deferred-backlog list ("JWT auth + identity propagation"). **See Notes below — manifest F{n} assignment is a follow-up.**
- Per-feature spec: `docs/requirements/specs/features/feature-047-component-event-interactivity.md` (to be authored separately if/when F47 is reclaimed from the deferred bucket)
- Architecture: `docs/requirements/specs/architecture.md` §4-phase lifecycle → Interact phase is what this task lands
- Locked decisions: `docs/requirements/idea/consolidated-requirements.md` §B (no explicit decision covers the component-event path; the synthetic-prompt approach is derived from the fire-and-forget `--print` invocation in `chat-handler.ts` lines 176-188)
- F43 follow-up memory entries: `genicui-f43-component-in-chat.md`, `genicui-f43-bridge-followup.md`, `genicui-f43-prompts-panel.md`, `genicui-f43-mcp-permissions-and-prop-shape.md`

## Notes

**Manifest F{n} assignment — open follow-up:**
The current manifest slot F47 holds the deferred backlog entry "JWT auth + identity propagation". Reclaiming F47 for this task requires renumbering F47→F48 in the deferred backlog and shifting all downstream deferred references (F48-F60) by +1. This is out of scope for this task file (per user direction 2026-09-08) — the manifest patch should be a separate commit, ideally authored alongside the per-feature spec `feature-047-component-event-interactivity.md`. Track as a manifest-maintenance follow-up; do not silently ship the rename with this task.

**Why not a Milestone (M6+)?**
This work spans 5-7 days and 4 sub-tasks — comfortably inside the existing M5 milestone window (W7 per roadmap.md). It depends entirely on existing M5 tasks (all ✅) and reuses F19/F24 from M4. A new Milestone would force a "1+ week" framing that doesn't match the actual scope. Adding M5-T7 extends the existing milestone cleanly.

**Why not a Backlog item?**
The user's scenario (City picker → Weather card, and earlier the calculator flow) requires this path. Deferring to post-MVP would leave the playground unable to demo user-driven agent turns, which is the entire point of the F43 chat-as-render-surface work.

**Why the synthetic-prompt approach (not stdin `tool_result`)?**
The Claude Code subprocess is spawned fire-and-forget per turn via `Bun.spawn` with `--print` (chat-handler.ts lines 176-188). Forwarding component events as `tool_result` on stdin would require a much larger refactor (stdin pipe + per-turn state tracking + a wire format for the result stream). The synthetic-prompt approach reuses the existing `--resume <claudeSessionId>` plumbing and preserves conversation context.

**Risks / open questions:**
1. **Subprocess kill ordering** — must `await proc.exited` after `kill()` before spawning the follow-up, otherwise a stray stdout line could leak into the next `handleParsedLine`. Plan awaits this.
2. **Event ordering** — synthetic `user_event` is broadcast synchronously before `await runChatTurn(...)`, so the client sees it before the next turn's events.
3. **Claude Code `--resume` semantics** — include enough context in the synthesized prompt so the agent doesn't rely on session memory alone.
4. **Multiple mounted components** — the synthetic prompt names one `componentId`. Acceptable for v1; the synthetic user bubble shows the right context.
5. **`DataTable` event parity** — out of scope for this PR but the architecture should not block it. Document as a follow-up.
6. **Legacy clients** — unknown `user_event` type is ignored by the existing switch (handleEvent falls through), so legacy clients without this PR don't crash — they just don't see the synthetic bubble.
