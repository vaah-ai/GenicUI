# Task M5-T6 — Suggestive Prompts + Registry Selector

> **Milestone:** M5 (Registry: Component Registry + PrimeVue Adapter)
> **Manifest feature:** F43 (Suggestive prompts and registry selector for playground)
> **Priority:** High
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2-3 days

## Description

Add suggestive prompts, registry selector, and chat integration to the playground app (M5-T4). This wires up the full demo flow: user clicks a prompt → agent bridge calls LLM → LLM calls MCP tools → component renders in the browser.

Each registry's `registry.json` includes an `examplePrompts` array of human-written, demo-focused prompts. The UI renders these as "Try it" chips.

## Task Goals

- `examplePrompts` array added to `registry.json` (PrimeVue: 5-6 prompts)
- Registry selector dropdown (loads available registries from server)
- "Try it" prompt chips in the left panel
- Click → sends as chat message via WebSocket → agent bridge → LLM → render
- Chat history panel showing previous prompts and responses

## Implementation Plan

### Steps

1. Add `examplePrompts` array to `registries/primevue/registry.json` (5-6 prompts)
2. Add server endpoint to list available registries (`GET /api/registries`)
3. Implement registry selector dropdown in playground UI
4. Implement "Try it" prompt chips that load from registry's `examplePrompts`
5. Wire up prompt click → WebSocket chat message → agent bridge
6. Implement chat history panel (shows previous prompts and responses)
7. Add WebSocket handler for `chat` message type on server
8. Add server-side `chat-handler.ts` that bridges UI prompts to agent bridge
9. Write integration tests: click prompt → component renders
10. Verify end-to-end flow with `bun run test`

## Acceptance Criteria

- [ ] `examplePrompts` array exists in PrimeVue `registry.json` with 5-6 prompts
- [ ] Registry selector dropdown loads available registries from server
- [ ] "Try it" prompt chips render from registry's `examplePrompts`
- [ ] Clicking a prompt sends it as a chat message via WebSocket
- [ ] Agent bridge receives the prompt, calls LLM, executes MCP tool calls
- [ ] Rendered component appears in the render surface
- [ ] Chat history panel shows previous prompts
- [ ] `bun run test` exits green

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] End-to-end flow works: click prompt → component renders

## Dependencies

- **Requires:** M5-T4 (F41 — playground app), M5-T5 (F42 — agent bridge)
- **Blocks:** Nothing (this is the final M5 task)
