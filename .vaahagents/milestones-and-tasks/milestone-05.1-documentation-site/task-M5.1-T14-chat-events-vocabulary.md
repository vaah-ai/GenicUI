# Task M5.1-T14 — Chat events vocabulary (Concepts section)

> **Milestone:** M5.1 (Documentation Site)
> **Manifest feature:** F75 (new — chat events reference)
> **Priority:** High
> **Status:** 🔵 In Progress
> **Estimated Effort:** 1 day

## Description

Document the 7 `chat.event.type` values that ride on the `__chat__` channel and are emitted by `packages/server/src/chat/providers/*.ts` (currently `claude-code.ts`). These events are **not** part of the 14 AG-UI event types documented in `concepts/frames.md`; they are a server-side extension that wraps the Claude Code CLI's `stream-json` output into a stable wire vocabulary. The playground's `useChat.handleEvent` (`examples/playground/app/composables/useChat.ts`) consumes these events, but the vocabulary itself is nowhere in the public docs.

This task closes docs-gap #13 from the docs-vs-playground analysis (memory: `genicui-docs-vs-playground-gap.md`).

## Task Goals

- Author `docs/content/2.concepts/8.chat-events.md` (~250 lines) as a reference page
- Add the new page to `docs/content/2.concepts/.navigation.yml`
- Verify `bun --filter genicui-docs build` exits 0

## Implementation Plan

### Pre-Implementation Analysis

- Read `packages/server/src/chat/providers/claude-code.ts::mapStreamJsonEvent` to enumerate the exact `event.type` strings and their `data` payload shape (this is the source of truth — do not infer from the playground code)
- Read `examples/playground/app/composables/useChat.ts::handleEvent` to confirm the playground's expected wire shape matches what the server emits
- Read `docs/content/2.concepts/5.events.md` to ensure the new page does not duplicate — it should *extend* the AG-UI event vocabulary with the chat-specific overlay
- Read `docs/content/2.concepts/2.frames.md` to confirm the `__chat__` channel is documented and the new page can link back

### Steps

1. Author `docs/content/2.concepts/8.chat-events.md` with these sections:
   - **Why chat events exist** — explain that `stream-json` from Claude Code is rich but CLI-specific; the server maps it into a stable vocabulary so any client (not just the Vue playground) can consume it
   - **End-to-end connection flow** — MANDATORY diagram/text showing the full chain. Use an ASCII sequence diagram (Claude Code MCP registration → `claude mcp add genicui` → server's `/mcp` endpoint → 4 tools `find_ui_component` / `render_component` / `update_component` / `subscribe_to_events` → catalog hit → `__chat__` channel → `chat.event` frames → `chat.event.type` ∈ {`ai_text`, `tool_call`, `tool_result`, `status`, `error`, `stderr`, `user_event`} → client `useChat.handleEvent` switch). This single section is the page's anchor — readers who finish it should be able to draw the full flow from memory.
   - **The 7 event types** — introduce the table that follows
   - **Reference table** — one row per type with: `type`, `direction`, `data` payload shape, example payload, which server provider emits it
     - `ai_text` — server → client, `data: { text: string }`, emitted by `claude-code.ts` on `stream-json` assistant text chunks
     - `tool_call` — server → client, `data: { id?, name, input | args }`, emitted when the agent invokes a tool
     - `tool_result` — server → client, `data: { id?, result }`, emitted when a tool returns
     - `status` — server → client, `data: { phase: 'init' | 'thinking' | 'complete' }`, progress markers (clients typically ignore)
     - `error` — server → client, `data: { error | message }`, attached to a running tool call or appended to prose
     - `stderr` — server → client, `data: { text: string }`, provider stderr; clients should log, not display
     - `user_event` — server → client, `data: { componentId, name, action, payload }`, synthetic bubble inserted after a chat-embedded component interaction (F43)
   - **Wire payload shape** — show the wrapping `chat.event` frame: `{ v:1, channel: '__chat__', type: 'chat.event', payload: { event: { type, data } }, seq }`
   - **Who emits** — short list mapping each type to its source file (`packages/server/src/chat/providers/claude-code.ts::mapStreamJsonEvent`); note that adding a new provider requires emitting the same 7 types
   - **How clients handle** — pseudocode showing the switch statement from `useChat.handleEvent`
   - **Cross-refs** — link to `/concepts/frames` (for `__chat__` channel), `/concepts/protocol` (for the multiplexed transport), `/api/agent-bridge` (for the agent-side view)
2. Update `docs/content/2.concepts/.navigation.yml` to register the new page in the section nav
3. Run `bun --filter genicui-docs build` to verify compilation

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `filesystem` (MCP) | File creation | Writing the markdown page |
| `sequential-thinking` | Wire-shape correctness check | If reviewer flags ambiguity in the `tool_call`/`tool_result` id-matching semantics |

## Acceptance Criteria

- AC1: New file `docs/content/2.concepts/8.chat-events.md` exists and is ≤ 250 lines
- AC2: All 7 `chat.event.type` values are documented (`ai_text`, `tool_call`, `tool_result`, `status`, `error`, `stderr`, `user_event`)
- AC3: Each event has: type, direction, payload shape, example payload, emitting server file
- AC4: Wire payload shape shows the `chat.event` envelope wrapping `event.type` + `event.data`
- AC5: Page cross-references `/concepts/frames`, `/concepts/protocol`, `/api/agent-bridge` — no broken internal links
- AC6: `bun --filter genicui-docs build` exits 0 with the new page included
- AC7: MANDATORY "End-to-end connection flow" section is present, showing the full chain from Claude Code `claude mcp add` registration through the 4 MCP tools (`find_ui_component`, `render_component`, `update_component`, `subscribe_to_events`) to the `__chat__` channel and the 7 chat-event types. Include the ASCII sequence diagram as described in Step 1.

## Completion Criteria

- [ ] All 6 acceptance criteria above pass
- [ ] `bun --filter genicui-docs build` exits green
- [ ] No code changes in `packages/` or `examples/playground/` — purely docs content

## Testing Checklist

- [ ] Manual review — page renders in dev server at `/concepts/chat-events`
- [ ] Cross-link check — `/concepts/frames` and `/concepts/protocol` links resolve to existing pages
- [ ] Build check — `bun --filter genicui-docs build` exits 0

## Sub Tasks

None. Single-author, single-day task.

## Dependencies

- **Requires:** M5.1-T1 (Docus scaffold) — completed per memory
- **Blocks:** None. Optional cross-link from `/concepts/events` would be helpful but is not a hard blocker.

## Documentation References

- Manifest: `.vaahagents/requirements/specs/manifest.json` → `features[F75]` (new)
- Per-feature: not authored — task file is sufficient per velocity directive
- Locked decisions: `.vaahagents/requirements/idea/consolidated-requirements.md` (no new decisions)
- Source of truth: `packages/server/src/chat/providers/claude-code.ts::mapStreamJsonEvent`
- Consumer reference: `examples/playground/app/composables/useChat.ts::handleEvent`

## Notes

- **Why this is a Concepts page, not an API Reference page:** Chat events are a vocabulary that anyone consuming the protocol must understand, regardless of whether they're writing a client or a server provider. Concepts section is the right home — `events.md` already covers the AG-UI side; this page covers the chat-overlay.
- **Why not call it `chat-streaming.md`:** The page documents the *vocabulary*, not a streaming-specific feature. The current chat implementation does happen to be streaming; future providers might batch.
- **ID allocation:** F75 (next after F74 used by T13).
- **Velocity check:** Single-day task, no code dependencies, builds on already-shipped M5.1-T6 (Concepts section). Safe to execute immediately.