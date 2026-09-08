# Task M5.1-T8 — API Reference (5 packages + 1 registry + MCP tools)

> **Milestone:** M5.1 (Documentation Site)
> **Manifest feature:** F70 (new — API Reference)
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2 days

## Description

Author the API Reference section — the most-used section of any doc site. Six per-package pages document every public export, every TypeBox schema, every event type, and every JSON-RPC error code. Authoring follows a hybrid approach: TypeDoc / custom JSDoc extraction for the per-export signatures, hand-curated for the MCP tool JSON-RPC schemas (which are the server's *actual* API surface — its sole TS export is `createServer()`).

## Task Goals

- Author `content/4.api/1.core.md` — 9 exports from `packages/core/src/index.ts` (GenicSchema, JsonPatchEngine, InMemoryStore, SequenceGenerator, FrameEnvelopeSchema, …)
- Author `content/4.api/2.server.md` — `createServer()` only; the MCP tool JSON-RPC schemas for `find_ui_component`, `render_component`, `update_component`, `subscribe_to_events`
- Author `content/4.api/3.client.md` — GenicElement, createRuntime, RuntimeEngine, framework shims
- Author `content/4.api/4.vite-plugin.md` — `viteGenicUI`, `scanComponentFile`, registry auto-registration
- Author `content/4.api/5.agent-bridge.md` — AgentBridge, LLM providers, MCPClientImpl, buildSystemPrompt
- Author `content/4.api/6.primevue-registry.md` — 8 enforced props, 4 events, PassThrough config
- Each entry: signature, parameters (with types and defaults), return type, throws, example
- Generate with TypeDoc + post-process; verify against the actual source on every release

## Implementation Plan

### Pre-Implementation Analysis

- Read every `packages/*/src/index.ts` to enumerate public exports exactly (the canonical source of truth — never infer from the README)
- Read `packages/server/src/mcp/` to find the 4 tool handler files; extract the TypeBox input/output schemas from each
- Read `registries/primevue/src/` to find the PrimeVue DataTable schema and event definitions
- Decide on TypeDoc configuration: `typedoc.json` at the workspace root, output to `examples/docs/scripts/typedoc-output/`, post-process to MDC
- The `@genicui/server` API surface is *not* TypeScript exports — it's the **MCP tool JSON-RPC schema**. Documenting this means importing the TypeBox schemas into markdown via MDC's `:import` directive or hand-curating them; either way, the truth source is `packages/server/src/mcp/`

### Steps

1. Configure TypeDoc at workspace root (`typedoc.json`):
   - `entryPoints`: `packages/core/src/index.ts`, `packages/client/src/index.ts`, `packages/vite-plugin/src/index.ts`, `packages/agent-bridge/src/index.ts`
   - Note: `@genicui/server` is NOT included — it's documented via MCP tool schemas (see step 4)
   - Output: `examples/docs/scripts/typedoc-output/`
2. Add a post-process script (`examples/docs/scripts/typedoc-to-mdc.ts`) that converts TypeDoc HTML/Markdown into Docus-friendly MDC with the `code-block` syntax + `:icon` annotations
3. Generate TypeDoc output: `bunx typedoc`; commit the output as a CI artifact (regenerated per release)
4. Author `content/4.api/1.core.md`:
   - Frontmatter: title "Core API", description "Public exports from `@genicui/core`.", `navigation.icon: lucide-box`
   - Per-export entries (TypeDoc-derived): GenicSchema, createGenicSchema, SequenceGenerator, envelope, validateChannel, FrameBuffer, FrameEnvelopeSchema, JsonPatchEngine, InMemoryStore, + types
   - Each entry: signature, parameter table, return type, throws, 1-paragraph description, runnable example
5. Author `content/4.api/2.server.md`:
   - Frontmatter: title "Server API", description "`createServer()` + MCP tool schemas.", `navigation.icon: lucide-server`
   - `createServer(config)` entry: signature, config schema, return type
   - Per-tool sections: `find_ui_component`, `render_component`, `update_component`, `subscribe_to_events`
   - Each tool section: input schema (TypeBox → MDC `code-block`), output schema, JSON-RPC error codes that may be returned (cite -32001..-32010), example request, example response, common gotchas
   - Error code reference table (one per row)
6. Author `content/4.api/3.client.md`:
   - Frontmatter: title "Client API", description "Public exports from `@genicui/client`.", `navigation.icon: lucide-monitor`
   - TypeDoc-derived: GenicElement (Web Component base class), createRuntime, RuntimeEngine
   - Plus framework shim reference: `@genicui/client/vue` (`useGenicComponent`, `<GenicProvider>`, `v-genic`)
   - Each entry: signature, parameter table, lifecycle hooks, example
7. Author `content/4.api/4.vite-plugin.md`:
   - Frontmatter: title "Vite Plugin API", description "Public exports from `@genicui/vite-plugin`.", `navigation.icon: lucide-hammer`
   - TypeDoc-derived: `viteGenicUI`, `scanComponentFile`
   - Plus: registry auto-registration (`genui-registry.json` emission), HMR behavior
   - `vite.config.ts` example
8. Author `content/4.api/5.agent-bridge.md`:
   - Frontmatter: title "Agent Bridge API", description "Public exports from `@genicui/agent-bridge`.", `navigation.icon: lucide-plug`
   - TypeDoc-derived: AgentBridge, AgentBridgeError, createLLMProvider, MCPClientImpl, buildSystemPrompt
   - LLM provider adapters: Anthropic, OpenAI, custom fetch
   - MCP client: connect, list-tools, call-tool, disconnect
   - Full agent-bridge example
9. Author `content/4.api/6.primevue-registry.md`:
   - Frontmatter: title "PrimeVue Registry API", description "Public exports from `@genicul-primevue/registry`.", `navigation.icon: lucide-table`
   - 8 enforced props (rows, columns, paginator, lazy, totalRecords, sortField, sortOrder, filters) — each with TypeBox schema
   - 4 events (row_selected, row_unselected, page_changed, sort_changed) — each with payload schema
   - PassThrough config example
   - Loading + mounting example
10. Add a CI job (`.github/workflows/docs-api-ref.yml`) that:
    - Runs `bunx typedoc` on every PR
    - Diffs the output against the committed baseline
    - Fails the PR if exports were added/removed without an API doc update
11. Run `bun --filter docs build`; verify all 6 pages build with no broken links
12. Spot-check 5 random entries against the actual source code; verify zero drift

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `context7` MCP | TypeDoc configuration + Docus MDC import syntax | Steps 1, 2 |
| `filesystem` MCP | Read every `packages/*/src/index.ts` to verify exports | Pre-Implementation + Step 12 |
| `sequential-thinking` skill | Multi-step correctness proof for the TypeDoc → MDC post-processor (idempotency, signature drift) | Step 2 |

## Acceptance Criteria

- AC1: All 6 pages render with correct titles, descriptions, icons, and entry tables
- AC2: Every public export of `core`, `client`, `vite-plugin`, `agent-bridge` is documented (verified against `index.ts`)
- AC3: All 4 MCP tools have full input/output schemas + example request/response in `2.server.md`
- AC4: All JSON-RPC error codes (-32001..-32010) are listed with their meaning
- AC5: PrimeVue registry docs list all 8 props + 4 events with their schemas
- AC6: TypeDoc output is regenerated on every release (CI enforced)
- AC7: Each entry has a runnable example
- AC8: `bun --filter docs build` exits 0 with no broken links
- AC9: Lighthouse score ≥ 90 per page
- AC10: Drift check: spot-check 5 random entries against source — zero drift

## Completion Criteria

- [ ] All 10 acceptance criteria above pass
- [ ] `bun --filter docs build` succeeds
- [ ] `bun --filter docs lint` exits 0
- [ ] `typedoc.json` committed
- [ ] Post-processor script `typedoc-to-mdc.ts` committed
- [ ] CI workflow `.github/workflows/docs-api-ref.yml` merged
- [ ] Generated TypeDoc baseline committed under `examples/docs/scripts/typedoc-output/`

## Testing Checklist

- [ ] CI: TypeDoc regeneration on every PR; drift detected
- [ ] Manual: read each page; verify depth + clarity
- [ ] Link-check: every internal `[[link]]` resolves
- [ ] Visual: Lighthouse score per page
- [ ] Accessibility: axe-core scan per page
- [ ] No property tests (N/A — content)
- [ ] No trust-boundary touch (N/A — these docs DESCRIBE the API, they don't implement or modify it)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
|---|---|---|---|---|
| M5.1-T8-01 | Configure TypeDoc + post-processor | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T8-02 | Author `1.core.md` (9 exports) | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T8-03 | Author `2.server.md` (createServer + 4 MCP tool schemas) | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T8-04 | Author `3.client.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T8-05 | Author `4.vite-plugin.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T8-06 | Author `5.agent-bridge.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T8-07 | Author `6.primevue-registry.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T8-08 | CI workflow + drift detection | ⚪ Not Started | ✅ Yes | High |

## Dependencies

- **Requires:** M5.1-T1 (scaffold), M5.1-T3 (IA), M5.1-T6 (Concepts pages reference API Reference)
- **Soft dependency:** M5.1-T2 (cites per-feature specs), all package code (F1–F64) must be stable
- **Blocks:** M5.1-T9 (Cookbook recipes link into API Reference), M5.1-T11 (search indexes API Reference), M5.1-T12 (deploy requires API Reference to be authoritative)

## Documentation References

- TypeDoc: https://typedoc.org/
- Docus MDC imports: https://content.nuxt.com/usage/markdown
- MCP tool JSON-RPC: `.vaahagents/requirements/specs/features/feature-NNN-*.md` (post-T2)
- Per-package source: `packages/core/src/index.ts`, `packages/server/src/index.ts`, `packages/client/src/index.ts`, `packages/vite-plugin/src/index.ts`, `packages/agent-bridge/src/index.ts` (post-T2)
- Industry reference: Vue.js API reference https://vuejs.org/api/ (anatomy of a good auto-generated API ref)

## Notes

- **`@genicui/server` is special.** Its only TS export is `createServer()` — its real API surface is the MCP tool JSON-RPC schemas. Documenting it as TypeScript exports would mislead readers. Use the hand-curated JSON-RPC table approach.
- **TypeDoc drift is the #1 doc-site killer.** Without CI enforcement, the API Reference rots within weeks. The drift-detection workflow is non-negotiable.
- **Don't pad with examples that don't work.** Every example must be copy-paste-runnable. If it's aspirational, label it clearly.
- **Cross-link Concepts and API Reference.** Concepts explains mechanism; API Reference lists signatures. Each Concepts page should link to the corresponding API Reference entries; each API Reference entry should link back to the Concepts page that explains it.
- **Tone: terse, table-heavy.** API Reference is reference material, not prose. Tables > paragraphs.
- **Spot-check 5 entries per release** before tagging — drift is sneaky.
