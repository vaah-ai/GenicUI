# Task M5.1-T15 — Provider registry (Concepts section)

> **Milestone:** M5.1 (Documentation Site)
> **Manifest feature:** F76 (new — provider registry reference)
> **Priority:** High
> **Status:** 🟢 Complete
> **Estimated Effort:** 1 day

## Description

Document the client-side provider registry at `examples/playground/app/providers/` (currently `claude-code` + disabled `codex` stub) and the server-side provider adapter system at `packages/server/src/chat/providers/`. The playground persists the user's CLI path and forwards it as a `ProviderWirePayload`; the server uses it to spawn the right CLI subprocess. This bridge is **not** in the public docs — adopters building their own agent clients need to understand the wire shape and how to add a new provider.

This task closes docs-gap #14 from the docs-vs-playground analysis (memory: `genicui-docs-vs-playground-gap.md`).

## Task Goals

- Author `docs/content/2.concepts/9.providers.md` (~250 lines) as a reference page
- Add the new page to `docs/content/2.concepts/.navigation.yml`
- Verify `bun --filter genicui-docs build` exits 0

## Implementation Plan

### Pre-Implementation Analysis

- Read `examples/playground/app/providers/types.ts` to enumerate `ProviderDescriptor`, `ProviderConfigField`, `ProviderConfigFieldType` (`'text' | 'path'`), `ProviderWirePayload`
- Read `examples/playground/app/providers/registry.ts` for the current 2 providers (`claude-code` enabled, `codex` disabled stub)
- Read `examples/playground/app/composables/useProviders.ts` for the singleton persistence + wire-payload assembly logic
- Read `packages/server/src/chat/providers/` directory to enumerate the server-side provider adapters (currently `claude-code.ts`; read it to confirm the spawn flow)
- Read `docs/content/4.api/5.agent-bridge.md` to ensure the new page cross-references the LLM-provider side (which is *server-side* via `@genicui/agent-bridge`) and does not duplicate it

### Steps

1. Author `docs/content/2.concepts/9.providers.md` with these sections:
   - **What is a Provider** — define the term in the GenicUI sense: a *chat-side* integration that lets the playground send a prompt to a local CLI (Claude Code today, others tomorrow). Distinguish from `@genicui/agent-bridge` (which is *server-side* LLM providers)
   - **End-to-end connection flow** — MANDATORY diagram/text showing the full chain the way an adopter actually experiences it. Use an ASCII sequence diagram: (1) User opens the playground → dropdown loads providers from `examples/playground/app/providers/registry.ts` (`claude-code` enabled, `codex` disabled stub), (2) User picks `claude-code` and configures CLI path → `useProviders` persists to `localStorage['genicui-playground:providers:v2']`, (3) User types prompt + clicks send → `chat.message` frame sent on `__chat__` with `{ prompt, registry, provider: { id: 'claude-code', config: { cliPath } } }`, (4) Server's chat handler reads `provider` from the frame and routes to `packages/server/src/chat/providers/claude-code.ts`, (5) The adapter spawns the `claude` subprocess with `cliPath` + prompt, (6) `mapStreamJsonEvent` translates the CLI's `stream-json` lines into the 7 `chat.event.type` values (see `/concepts/chat-events`), (7) Frames flow back over the `__chat__` channel → `useChat.handleEvent` switch statement. This single section is the page's anchor — readers who finish it should be able to draw the full bridge from memory.
   - **The two halves of a provider** — client registry (`examples/playground/app/providers/`) + server adapter (`packages/server/src/chat/providers/`)
   - **The 2 current providers** — table: `claude-code` (Anthropic Claude Code CLI, enabled) + `codex` (OpenAI Codex CLI, disabled "coming soon")
   - **`ProviderDescriptor` interface** — TypeScript shape: `id`, `label`, `description`, `configFields[]`, `disabled?`
   - **`ProviderConfigField` types** — `text` (free-form string) vs `path` (file-path input with platform hints)
   - **`ProviderWirePayload` wire shape** — the JSON sent in every `chat.message` frame: `{ id, config: Record<string, string> }`
   - **How the playground selects + persists providers** — `localStorage['genicui-playground:providers:v2']` schema, hydration guards, `getWirePayload()` assembly
   - **How the server spawns the CLI** — diagram: provider `claude-code` → `ProviderWirePayload` arrives in `chat.message` → `packages/server/src/chat/providers/claude-code.ts` spawns `claude` subprocess with the config → `mapStreamJsonEvent` translates to `chat.event` frames (see `/concepts/chat-events`)
   - **How to add a third provider** — Codex as the worked example: (a) add to `examples/playground/app/providers/registry.ts`, (b) un-disable and add config fields, (c) write `packages/server/src/chat/providers/codex.ts` matching the `claude-code.ts` shape, (d) register in the server's provider registry
   - **Cross-refs** — link to `/concepts/chat-events` (the wire vocabulary), `/concepts/protocol` (the multiplexed transport), `/api/agent-bridge` (the server-side LLM side)
2. Update `docs/content/2.concepts/.navigation.yml` to register the new page
3. Run `bun --filter genicui-docs build` to verify compilation

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `filesystem` (MCP) | File creation | Writing the markdown page |
| `sequential-thinking` | Wire-payload correctness | If reviewer flags ambiguity in the `config` schema |

## Acceptance Criteria

- AC1: New file `docs/content/2.concepts/9.providers.md` exists and is ≤ 250 lines
- AC2: All 9 sections listed in Step 1 above are present
- AC3: Both current providers (`claude-code`, `codex`) are documented with their configFields
- AC4: `ProviderDescriptor`, `ProviderConfigField`, `ProviderWirePayload` are documented with TypeScript signatures
- AC5: `localStorage` key `genicui-playground:providers:v2` is referenced with the persistence schema
- AC6: Page cross-references `/concepts/chat-events`, `/concepts/protocol`, `/api/agent-bridge` — no broken internal links
- AC7: `bun --filter genicui-docs build` exits 0 with the new page included
- AC8: MANDATORY "End-to-end connection flow" section is present, showing the full bridge from playground dropdown selection through `localStorage` persistence, `chat.message` wire payload, server-side adapter routing, `claude` subprocess spawn, and `chat.event` frame translation back to the client. Include the ASCII sequence diagram as described in Step 1.

## Completion Criteria

- [ ] All 7 acceptance criteria above pass
- [ ] `bun --filter genicui-docs build` exits green
- [ ] No code changes in `packages/` or `examples/playground/` — purely docs content

## Testing Checklist

- [ ] Manual review — page renders in dev server at `/concepts/providers`
- [ ] Cross-link check — all 3 cross-references resolve to existing pages
- [ ] Build check — `bun --filter genicui-docs build` exits 0

## Sub Tasks

None. Single-author, single-day task.

## Dependencies

- **Requires:** M5.1-T1 (Docus scaffold) — completed per memory
- **Blocks:** None. Optional cross-link from `/api/agent-bridge` "Related concepts" section is recommended.

## Documentation References

- Manifest: `.vaahagents/requirements/specs/manifest.json` → `features[F76]` (new)
- Per-feature: not authored — task file is sufficient per velocity directive
- Locked decisions: `.vaahagents/requirements/idea/consolidated-requirements.md` (no new decisions)
- Source of truth (client): `examples/playground/app/providers/`
- Source of truth (server): `packages/server/src/chat/providers/`
- Related: `docs/content/4.api/5.agent-bridge.md` (server-side LLM providers — note the distinction)

## Notes

- **Why Concepts, not Guides:** Provider selection is a *protocol* concept (wire payload, server-side adapter), not a step-by-step tutorial. Concepts section is the right home; a "How to add Codex" recipe in the Cookbook is the right place for the worked example if one is added later.
- **Why no live `codex` walkthrough:** Codex is documented as `disabled: true` in `registry.ts` and as "coming soon" in the dropdown UI. The worked example in this page describes the *path* to enabling it, but does not require it to be enabled — staying honest with the current state.
- **Distinction from `@genicui/agent-bridge`:** That package is *server-side* (LLM provider clients like OpenAI/Anthropic). Providers in this page are *chat-side* (local CLI spawners). The two systems meet at the `chat.message` frame — the client puts `ProviderWirePayload` in the payload; the server's chat handler picks it up and routes to the right provider adapter.
- **ID allocation:** F76 (next after F75 used by T14).
- **Velocity check:** Single-day task, no code dependencies, builds on already-shipped M5.1-T6. Safe to execute immediately.