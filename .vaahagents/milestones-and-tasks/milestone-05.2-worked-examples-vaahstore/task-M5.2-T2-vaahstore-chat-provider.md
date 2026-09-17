# Task M5.2-T2 — VaahStore chat provider adapter

> **Milestone:** M5.2 (Worked Examples: VaahStore Guest-Shopper Journey)
> **Manifest feature:** None new — extends existing F13 (MCP), F14 (trust boundary), F76 (provider-registry docs); new provider file at `packages/server/src/chat/providers/vaahstore.ts`
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 3 days

## Description

Ship a new chat provider adapter that exposes **12 VaahStore endpoints** as agent-callable tools. Lives at `packages/server/src/chat/providers/vaahstore.ts`, mirrors the existing claude-code / codex adapter patterns, and is registered into the `PROVIDERS` list so `M5.1-T15`'s provider-registry surface picks it up.

The adapter wraps every tool with `wrapWithValidation` (F14 — 4 ACs, 62 tests) so untrusted LLM output is schema-checked before any HTTP request. The fixture mode (`VITE_VAAHSTORE_LIVE=0`, default) lets evaluators `bun dev` the new workspace without VaahStore credentials.

## Task Goals

- Land `packages/server/src/chat/providers/vaahstore.ts` with 12 TypeBox tool schemas mirroring the table in `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md` §5
- Each tool passes through `wrapWithValidation` (F14) — invalid LLM output → `-32003 props_invalid` before any HTTP request (EJG-ADAPT-2)
- `VITE_VAAHSTORE_LIVE=0` (default) → all 12 tools return fixture data from `examples/playground-ecommerce/__fixtures__/vaahstore/`
- `VITE_VAAHSTORE_LIVE=1` + env vars set → live calls against `VAHSTORE_BASE_URL`
- Bearer token scrubbing: never appears in client logs, server stdout, or `RenderedComponent` props (EJG-ADAPT-3)
- Update `examples/playground/app/providers/registry.ts` to add a `vaahstore` entry (NOT to `examples/playground-ecommerce/` — the registry lists cross-workspace providers, see notes)

## Implementation Plan

> ⚠️ Analyze this plan thoroughly before implementing. Invoke relevant skills and MCP servers as needed.

### Pre-Implementation Analysis

- Read the existing claude-code adapter at `packages/server/src/chat/providers/claude-code.ts` end-to-end before writing — the new adapter must mirror its shape (config fields, stream parser, error envelope)
- Read `M5.1-T15` provider-registry docs (`.vaahagents/requirements/specs/manifest.json` F76) for the `ProviderWirePayload` contract — the VaahStore adapter is the second concrete provider after Claude Code
- Read M3-T2's `wrapWithValidation` source (`packages/server/src/`) — confirm the exported middleware signature, the TypeBox schema convention, and the `-32003` error envelope
- Read M5.2-T1's verification report before writing any schema — do not duplicate the verification work or guess at assumptions that T1 already resolved

### Steps

1. Create `packages/server/src/chat/providers/vaahstore.ts` with the `ProviderAdaptor` interface implemented
2. Define 12 TypeBox schemas (one per §5 table row): `TListProducts`, `TGetProduct`, `TGetVariations`, `TCheckStock`, `TCreateCart`, `TAddToCart`, `TListShipping`, `TListPaymentMethods`, `TCreateOrder`, `TCreateAddress`, `TTrackOrder`, `TClaimOrder`
3. Wrap each tool's `call` function with the existing `wrapWithValidation` middleware — verify the existing exported middleware accepts a TypeBox schema + handler
4. Implement `callTool(name, args)` with a `LIVE` switch: when `VITE_VAAHSTORE_LIVE=0` read from `__fixtures__/vaahstore/{tool-name}.json`; when `1`, fetch from `VAHSTORE_BASE_URL + endpoint` with `Authorization: Bearer ${VAHSTORE_BEARER_TOKEN}`
5. Scrub the bearer token from any error string before it bubbles out — assertion test in EJG-ADAPT-3
6. Export a `createVaahstoreProvider(env)` factory matching the `claude-code.ts` shape; do not import env directly
7. Add `vaahstore` to the `PROVIDERS` list in `examples/playground/app/providers/registry.ts` with `configFields: [VAHSTORE_BASE_URL, VAHSTORE_STORE_ID, VAHSTORE_BEARER_TOKEN, VITE_VAAHSTORE_LIVE]` and `disabled: false` (the playground provider registry lists cross-workspace providers — see Notes)
8. Author `examples/playground-ecommerce/__fixtures__/vaahstore/` with one JSON fixture per tool, sized small (≤50 lines each) but enough to drive an end-to-end Playwright run
9. Write unit tests at `packages/server/src/chat/providers/__tests__/vaahstore.test.ts` covering: each tool's happy path with fixtures, the live-mode env-var gate, F14 wrap rejects invalid input, bearer-token scrubbing (EJG-ADAPT-3)

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
| --- | --- | --- |
| `sequential-thinking` | When designing the LIVE-mode routing — single dispatch vs. per-tool branches | Step 4 |
| `brainstorming` | Only if F14's existing middleware signature doesn't accept TypeBox schemas cleanly — pick between extend-and-use vs. thin local wrapper | Step 3 |
| `filesystem` (MCP) | Create provider file + fixtures | Steps 1, 8 |
| `memory` (MCP) | Persist the `createVaahstoreProvider(env)` factory pattern once it stabilises | End of task |

## Acceptance Criteria

- **M5.2-T2-AC1** — `packages/server/src/chat/providers/vaahstore.ts` exports `createVaahstoreProvider(env)` matching the existing adapter shape
- **M5.2-T2-AC2** — All 12 §5 tools are callable via the agent's `tools/call` MCP path and return data shaped for downstream `render_component`
- **M5.2-T2-AC3** — F14 `wrapWithValidation` middleware is applied to every tool — invalid props surface as `-32003 props_invalid` with field details (EJG-ADAPT-2)
- **M5.2-T2-AC4** — `VITE_VAAHSTORE_LIVE=0` (default) returns fixture data; setting it to `1` routes to live VaahStore (EJG-ADAPT-1)
- **M5.2-T2-AC5** — Bearer token never appears in `console.log` output, server stdout, or any error message that bubbles to the client (EJG-ADAPT-3) — verified by a unit test that captures stdout and grep-asserts absence
- **M5.2-T2-AC6** — `examples/playground/app/providers/registry.ts` has a `vaahstore` entry wired through `ProviderConfig.vue` — the provider dropdown shows it and persists config via the same `useProviders().save()` path as Claude Code
- **M5.2-T2-AC7** — Fixtures at `examples/playground-ecommerce/__fixtures__/vaahstore/` cover all 12 tools with at least one happy-path case each

## Completion Criteria

- [ ] All 7 acceptance criteria above pass
- [ ] `bun run test` at repo root exits green
- [ ] `bun --filter @genicui/server test` exits green (the new tests live in the server package)
- [ ] `bun run lint` reports zero errors
- [ ] Coverage target met: 80% core, 90% tool handlers — adapter counts as a tool handler
- [ ] Trust-boundary check: every `callTool` body sees `args` that already passed `stripProtoKeys` + `Value.Check` (verified by reading the wrapped function's first line)

## Testing Checklist

- [ ] Unit tests: one Bun test per acceptance criterion, `testId` references match manifest conventions (e.g. `M5.2-T2-AC3` → `packages/server/src/chat/providers/__tests__/vaahstore.test.ts:M5.2-T2-AC3`)
- [ ] Integration test: a single MCP `tools/call` to `list_products` returns the same shape whether `VITE_VAAHSTORE_LIVE=0` or `1` (live mode requires a recorded response fixture or skip-if-no-credentials gate)
- [ ] F14 property test: fast-check 10K random payloads — at least one invalid payload in every batch returns `-32003` before any HTTP request
- [ ] Bearer-token scrubbing test: stdout capture + grep-assert the substring `VAHSTORE_BEARER_TOKEN`'s value never appears (EJG-ADAPT-3)
- [ ] Regression: existing claude-code + codex adapter tests still pass (this task must not break the existing provider surface)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
| --- | --- | --- | --- | --- |
| M5.2-T2-01 | Scaffold `vaahstore.ts` + 12 TypeBox schema definitions | ⚪ Not Started | ✅ Yes | Critical |
| M5.2-T2-02 | Wrap each tool with `wrapWithValidation` (F14) | ⚪ Not Started | ✅ Yes | Critical |
| M5.2-T2-03 | Implement fixture-mode dispatch + 12 JSON fixtures | ⚪ Not Started | ✅ Yes | High |
| M5.2-T2-04 | Implement live-mode dispatch + bearer-token env handling | ⚪ Not Started | ✅ Yes | High |
| M5.2-T2-05 | Add `vaahstore` to `examples/playground/app/providers/registry.ts` | ⚪ Not Started | ✅ Yes | Medium |
| M5.2-T2-06 | Bearer-token scrubbing (EJG-ADAPT-3) | ⚪ Not Started | ✅ Yes | Critical |

## Dependencies

- **Requires:** M5.2-T1 (verification report — reads first to avoid speculation)
- **Blocks:** M5.2-T5 (journey state machine calls these tools), M5.2-T3 (registry entries reference verified schema fields)

## Documentation References

- Source: `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md` §5 (12-tool table) + §6 (assumptions verified by T1)
- Sibling adapters: `packages/server/src/chat/providers/claude-code.ts`, `packages/server/src/chat/providers/codex.ts`
- F14 trust boundary: `.vaahagents/requirements/specs/features/feature-014-trust-boundary.md`
- Provider registry docs: `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/task-M5.1-T15-provider-registry.md` (F76)

## Notes

- **Provider registry placement:** the `PROVIDERS` list in `examples/playground/app/providers/registry.ts` is **cross-workspace by design** — the playground's `ProviderConfig.vue` is the single UI surface where evaluators pick a provider for the *whole* environment. Adding `vaahstore` here does NOT couple the new workspace to the playground (each workspace has its own `resolve-mounted-component.ts`); it just surfaces the VaahStore provider in the chat-panel dropdown alongside Claude Code. This is the same pattern Codex already follows (registered but `disabled: true`).
- **Why not put the adapter under `examples/playground-ecommerce/`?** Because `examples/playground/` is the chat-panel host, and the chat-panel's `MCP`-facing provider dispatch reads from `packages/server/src/chat/providers/`. The new workspace is a **client-side** showcase; the server-side adapter lives with the server. This matches how `claude-code.ts` already works — the playground doesn't ship its own Claude binary.
- **Honour the velocity directive:** if F14's middleware signature doesn't accept TypeBox schemas cleanly, do NOT introduce a new wrap layer — surface the friction to the user and either extend the existing middleware (preferred) or skip live-mode dispatch in the MVP demo.