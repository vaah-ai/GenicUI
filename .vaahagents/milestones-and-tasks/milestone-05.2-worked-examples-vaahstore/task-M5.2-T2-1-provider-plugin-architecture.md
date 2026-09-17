# Task M5.2-T2-1 — Provider Plugin Architecture (in-workspace plugins, zero core edits)

> **Milestone:** M5.2 (Worked Examples: VaahStore Guest-Shopper Journey)
> **Manifest feature:** None new — extends F13 (MCP), F14 (trust boundary), F76 (provider-registry docs); introduces **a workspace-resident plugin pattern inside `examples/playground-ecommerce/server/providers/`** and an opt-in `defineProvider` / `registerProvider` surface **co-located with the workspace** (NOT in `@genicui/core`, NOT in `@genicui/server`). Zero edits to `packages/`.
> **Priority:** Critical (architectural correction — must land before M5.2-T3 opens the integration story)
> **Status:** ✅ Completed (2026-09-18)
> **Estimated Effort:** 5-7 days (single maintainer)
> **Outcome (target):** VaahStore adapter no longer lives in `packages/server/src/chat/providers/`. It moves into the new workspace at `examples/playground-ecommerce/server/providers/vaahstore/`. `claude-code.ts` + `codex.ts` stay in core as before — they are tolerable first-party entries (per F76 docs). A workspace-resident `defineProvider` / `registerProvider` API (co-located in `examples/playground-ecommerce/server/providers/`) provides the F14 wrap-at-registration contract, the bearer-scrub closure contract, the opt-in `worker_threads` isolation, and the workspace-scan discovery. **None of this lives in `@genicui/core` or `@genicui/server`.** `docs/content/2.concepts/9.providers.md` is rewritten to describe the "drop a plugin module inside an example workspace and call `registerProvider(...)` from a workspace boot file" model. **Every other M5.2 task gets a docs-update step.**

## Description

M5.2-T2 (commit `330e94f`, 2026-09-17) landed a working `vaahstore` provider at `packages/server/src/chat/providers/vaahstore.ts`. Post-merge review surfaced a deep architectural concern: the provider registry inside `@genicui/server/src/chat/providers/registry.ts:33-37` hardcodes a 3-entry `Map` literal tied to 3 `import` statements (lines 14-16). Every new external provider means editing core.

The user redirected (2026-09-17):

> "provider-vaahstore should exist in `/Users/pk/Projects/GenicUI/examples/playground-ecommerce`. None of these tasks should affect core of genicui and all should update docs as well based on the learning."

This task is the formalization of that redirect. The "extend without modifying core" directive becomes a **workspace-resident plugin model**: every example workspace ships its own `defineProvider` + `registerProvider` API inside `examples/<workspace>/server/providers/`, and its own boot file. The framework's `@genicui/core` and `@genicui/server` stay **provider-free for third-party adapters** — exactly as F76 docs page currently describes them. A future M5.x task (out of scope for M5.2) can promote the in-workspace pattern to `@genicui/server` as opt-in extensions if a third example workspace adopts the same shape.

The previous M5.2-T2-1 plan (commit-bound on 2026-09-17) extracted VaahStore into `packages/provider-vaahstore/` and added `defineProvider` / `registerProvider` to `@genicui/core`. That plan is **superseded by this one**. The earlier plan was authored before the user clarified that zero core edits were allowed; the new constraint forbids any edit to `packages/core/` or `packages/server/`.

## What changes vs. the previous T2-1 plan

| Aspect | Previous plan (now superseded) | This plan |
|---|---|---|
| Provider location | `packages/provider-vaahstore/` (new workspace package) | `examples/playground-ecommerce/server/providers/vaahstore/` (inside the example workspace) |
| `defineProvider` location | `@genicui/core` (first provider symbol in core) | `examples/playground-ecommerce/server/providers/index.ts` (workspace-resident) |
| `registerProvider` location | `@genicui/core` | `examples/playground-ecommerce/server/providers/registry.ts` (workspace-resident) |
| Discovery | `packages/server/src/index.ts` calls `discoverWorkspaceProviders(process.cwd())` at boot | `examples/playground-ecommerce/server/providers/boot.ts` calls `registerProvider(...)` at workspace boot — no edit to `packages/server/src/index.ts` |
| Core changes | Adds `packages/core/src/providers/{types,registry}.ts` | None — `@genicui/core` stays provider-free |
| Server changes | Replaces 3-entry `Map` in `packages/server/src/chat/providers/registry.ts:33-37` | None — `packages/server/src/chat/providers/registry.ts` untouched |
| F14 wrap-at-registration | Enforced by `registerProvider` in `@genicui/core` | Enforced by the workspace's `registerProvider` — the workspace imports F14 primitives from `@genicui/core/validation` (already public via M3-T2) and composes them |
| `worker_threads` opt-in | Same | Same — opt-in lives in the workspace's manifest type |
| Docs update | `docs/content/2.concepts/9.providers.md` rewritten to "drop a `@genicui/provider-*` package in" | Same docs page rewritten — but the worked example is now "drop a plugin module inside `examples/<workspace>/server/providers/` and call `registerProvider(...)` from a boot file" |
| Test colocation | `packages/provider-vaahstore/__tests__/` | `examples/playground-ecommerce/__tests__/server-providers/` |

**Reusable primitives stay where they are.** F14's `stripProtoKeys`, `validateToolInput`, `rejectOpenSchemas`, and `wrapWithValidation` are already public from `@genicui/core/validation` (M3-T2) — the workspace's `defineProvider` composes them at registration time. Nothing moves.

## Task Goals

- **Goal 1 — Move the VaahStore adapter out of core.** Cut `packages/server/src/chat/providers/vaahstore.ts` (732 lines) and `vaahstore.test.ts` (43 tests) into `examples/playground-ecommerce/server/providers/vaahstore/`. The 12 TypeBox schemas travel unchanged. The 12 fixtures stay co-located in `examples/playground-ecommerce/__fixtures__/vaahstore/` (already there — the move does not change fixture location).
- **Goal 2 — Define the workspace-resident plugin API.** New `examples/playground-ecommerce/server/providers/index.ts` exports a workspace-local `defineProvider(spec)`, `registerProvider(id, factory)`, `unregisterProvider(id)`, `listProviderIds()`, and `getProviderAdaptor(id)` — all backed by an internal `Map`. The workspace-resident API is **scoped to the workspace**; no `@genicui/core` exports change.
- **Goal 3 — Workspace-local boot file.** `examples/playground-ecommerce/server/providers/boot.ts` calls `registerProvider('vaahstore', () => createVaahstoreProvider(process.env))` once. The workspace's Nuxt `plugins/` directory runs the boot file at server start. **`packages/server/src/chat/providers/registry.ts` is unchanged.**
- **Goal 4 — F14 wrap-at-registration as a workspace-local contract.** `registerProvider(...)` invokes `validateToolInput(providerManifest.configSchema, providerManifest.configSchema)` at registration time and refuses plugins that ship `additionalProperties: true` (per F14-AC3 enforced in M3-T2). Bearer scrubbing becomes a contract requirement: `makeBearerScrubber(token)` must be invoked *inside* the factory and the scrubber is closure-bound to the instance (already M5.2-T2's pattern — codified here).
- **Goal 5 — Workspace-resident `engines.genicui` + discovery.** The workspace's `package.json` declares `engines.genicui: '^0.1.0'` and `genicui.plugins: ['./server/providers/boot.ts']`. The workspace's Nuxt `plugins/` directory auto-imports the boot file. No Bun workspace glob changes (root `package.json:9-13` already picks up `examples/*`).
- **Goal 6 — Opt-in worker isolation.** `ProviderPluginManifest.requiresIsolation: boolean`. When `true`, the workspace's `registerProvider` lazily boots the inner work inside a `worker_threads.Worker` and routes `callTool` through `MessagePort`. Default off — VaahStore ships with `requiresIsolation: false`. Tested with a fake isolated stub — no second real provider added.
- **Goal 7 — Docs page rewrite + workspace README.** Rewrite `docs/content/2.concepts/9.providers.md`: the "How to add a third provider (Codex as the worked example)" section becomes "Authoring a workspace plugin". Also document the pattern in `examples/playground-ecommerce/README.md` as the **canonical** example for future example workspaces.
- **Goal 8 — Per-task docs updates are enforced.** Every downstream M5.2 task (M5.2-T3 / T4 / T5) gets a docs-update sub-step in its Implementation Plan per the user's "all should update docs" mandate. T2-1 itself owns the docs page rewrite (this goal); T3/T4/T5 own updates to `examples/playground-ecommerce/docs/<their-slug>.md` and any cross-references they touch.

## Implementation Plan

> ⚠️ Analyze this plan thoroughly before implementing. Invoke relevant skills and MCP servers as needed.

### Pre-Implementation Analysis

- The user redirect (2026-09-17) is locked: provider lives in `examples/playground-ecommerce/`, no edits to core, all tasks update docs. The previous T2-1 plan (`packages/provider-vaahstore/` + `@genicui/core`) is superseded.
- F14 primitives are public from `@genicui/core/validation`: `stripProtoKeys` (`validation/strip-proto-keys.ts`), `validateToolInput` (`validation/schema-validation.ts`), `rejectOpenSchemas` (`validation/schema-rejection.ts`), `wrapWithValidation` (`validation/wrap-with-validation.ts`). The workspace-resident `registerProvider` imports and composes them.
- The chat handler's 5-method `ProviderAdaptor` consumption (`packages/server/src/chat/providers/chat-handler.ts:114, 203, 210, 213, 283, 287, 316, 406-409, 937-938`) is the *only* consumer contract; the workspace's `getProviderAdaptor` keeps the same signature.
- The 5 VaahStore extension methods (`callTool, schemas, scrubWithToken, asToolResultEvent, liveMode`) become part of the workspace's `ProviderPluginManifest` optional surface. Their declaration lives in `examples/playground-ecommerce/server/providers/types.ts`, not in `packages/core/`.

### Steps

1. **Branch from `develop`.** `feature/ProviderPluginArchitecture` (note: this name is NOT a `feature/F{n}-short-description` form — the user-authorized extension applies; the literal branch name is what we use; see Notes for the convention nit).
2. **Scaffold `examples/playground-ecommerce/server/providers/`.** Create the directory tree:
   - `examples/playground-ecommerce/server/providers/index.ts` — barrel re-export of `defineProvider`, `registerProvider`, `unregisterProvider`, `listProviderIds`, `getProviderAdaptor`, plus the workspace's `ProviderPluginManifest`, `ProviderAdaptor`, `ProviderConfig` types.
   - `examples/playground-ecommerce/server/providers/types.ts` — local copies of the 5-method `ProviderAdaptor` interface + `ProviderPluginManifest` + `ProviderConfig`. Re-exported from `@genicui/core/chat-types` once a future framework task provides a shared type module (out of scope here — workspace duplication is acceptable for now, with a `// TODO(M5.x): import from @genicui/core once the shared provider-types module lands` comment).
   - `examples/playground-ecommerce/server/providers/registry.ts` — the `Map`-backed `defineProvider` + `registerProvider` + `unregisterProvider` + `listProviderIds` + `getProviderAdaptor` implementations. Reuses F14 primitives via `@genicui/core/validation`. Workspace-resident; not exported anywhere else.
   - `examples/playground-ecommerce/server/providers/boot.ts` — calls `registerProvider('vaahstore', () => createVaahstoreProvider(process.env))` once. Idempotent (`unregisterProvider` first if HMR re-runs).
   - `examples/playground-ecommerce/server/providers/vaahstore/` — the moved adapter (Step 3).
   - `examples/playground-ecommerce/server/providers/__tests__/` — workspace-local test colocation.
   - `examples/playground-ecommerce/server/providers/README.md` — the in-workspace plugin pattern, framed as "if you copy this workspace as a template for your own, you get the plugin API for free."
3. **Cut-paste the VaahStore adapter into the workspace.**
   - Move `packages/server/src/chat/providers/vaahstore.ts` (732 lines) to `examples/playground-ecommerce/server/providers/vaahstore/runtime/index.ts`.
   - Update the package-relative imports (`./validation/index.js` → `@genicui/core/validation` since validation primitives are public).
   - Move `packages/server/src/chat/providers/__tests__/vaahstore.test.ts` (43 tests) to `examples/playground-ecommerce/server/providers/__tests__/vaahstore.test.ts`.
   - Delete the moved source from `packages/server/src/chat/providers/`. Verify with `git diff --stat packages/server/src/chat/providers/`: only `claude-code.ts`, `codex.ts`, `types.ts`, `chat-handler.ts`, `__tests__/claude-code.test.ts`, etc., remain.
   - Fixtures stay at `examples/playground-ecommerce/__fixtures__/vaahstore/`. The moved adapter probes them via `path.resolve(import.meta.dir, '../../../__fixtures__/vaahstore/')` (relative path inside the workspace).
4. **Implement `defineProvider` + `registerProvider` in `examples/playground-ecommerce/server/providers/registry.ts`.**
   - `defineProvider(spec: ProviderPluginSpec): ProviderPluginManifest` — pure factory (no I/O).
   - `registerProvider(id: string, factory: () => ProviderAdaptor): void` — synchronous; validates F14 schema at registration; throws on duplicate id.
   - `unregisterProvider(id: string): boolean` — for tests and hot reload.
   - `getProviderAdaptor(id: string): ProviderAdaptor | null` — **kept identical** to the legacy signature so `chat-handler.ts` consumers don't notice the move.
   - `listProviderIds(): readonly string[]`.
   - **F14 wrap-at-registration** composes `@genicui/core/validation`'s `rejectOpenSchemas(providerManifest.configSchema)` + `validateToolInput(providerManifest.configSchema, sampleConfig)` at the moment `registerProvider` is called. A provider that ships `additionalProperties: true` is rejected with `-32003 props_invalid` BEFORE its factory ever runs. A provider whose factory does not invoke `makeBearerScrubber` for an HTTP-shaped manifest is rejected with a workspace-local `-32010 plugin_bearer_scrub_missing` error.
   - **Worker isolation** when `providerManifest.requiresIsolation === true`: wrap the factory in a `worker_threads.Worker` boot; route `callTool` through `MessagePort`. Default off — VaahStore ships with `requiresIsolation: false`.
5. **Wire the workspace boot.** Add `examples/playground-ecommerce/server/providers/boot.ts`:
   ```ts
   // pseudo-code, not the literal implementation
   import { registerProvider, unregisterProvider } from './registry';
   import { createVaahstoreProvider } from './vaahstore/runtime/index';
   unregisterProvider('vaahstore');  // idempotent on HMR
   registerProvider('vaahstore', () => createVaahstoreProvider(process.env));
   ```
   Wire `boot.ts` into the workspace's Nuxt `server/plugins/` directory so it runs once at server start (Nuxt auto-loads `server/plugins/*`). **`packages/server/src/index.ts` is untouched.**
6. **F14 wrap-at-registration contract test.** Add `examples/playground-ecommerce/server/providers/__tests__/registry.test.ts`:
   - A `defineProvider(...)` with `additionalProperties: true` is rejected (`-32003 props_invalid` before any `getProviderAdaptor` call).
   - An HTTP-shaped provider that doesn't invoke `makeBearerScrubber` is rejected at registration.
   - A provider registered twice with the same id throws (deterministic duplicate detection).
   - `registerProvider` + `getProviderAdaptor` round-trip for a fake `test-provider` adapter.
   - `worker_threads` opt-in contract test: `registerProvider('fake-isolated', ..., { requiresIsolation: true })` boots the inner factory inside a `worker_threads.Worker` and routes a `callTool` invocation through `MessagePort`. Use a fake transport (`postMessage` echo) — don't add a real second provider.
7. **Re-shape `@genicui/server`'s built-in registrations.** **This task does NOT touch `packages/server/src/chat/providers/registry.ts` per the zero-core-edits rule.** The 3-entry hardcoded `Map` (lines 33-37) and the eager `new ClaudeCodeAdaptor()` / `new CodexAdaptor()` constructors stay as they are. `claude-code.ts` and `codex.ts` are tolerable first-party entries. The workspace's `getProviderAdaptor('vaahstore')` call site is resolved by the workspace's local registry, **not** by `packages/server/src/chat/providers/registry.ts`.
8. **Workspace `package.json` plugin declaration.** Update `examples/playground-ecommerce/package.json`:
   - `engines.genicui: '^0.1.0'` — declares the framework version the workspace targets.
   - `genicui.plugins: ['./server/providers/boot.ts']` — declarative list of plugin boot files Nuxt loads. (F76 docs note: this field is **optional**; the same workspace can also discover via the file-system scan in Step 9.)
9. **Workspace-local discovery (optional second mode).** In `examples/playground-ecommerce/server/providers/registry.ts`, add a `discoverWorkspaceProviders(workspaceRoot: string): Promise<string[]>` helper that walks `<workspaceRoot>/server/providers/*/` and auto-registers each plugin whose `define.ts` exports a default `ProviderPluginManifest`. This is a **workspace-local convenience**, not a framework primitive — opt-in via `boot.ts` calling `await discoverWorkspaceProviders(import.meta.dir)`. (VaahStore is still registered explicitly in `boot.ts` so the auto-scan is a backup path for plugin authors who don't want to edit `boot.ts` by hand.)
10. **Client-side `ProviderDescriptor` mirror (small).** `examples/playground-ecommerce/app/providers/registry.ts` becomes a thin re-export: each plugin exports a `ProviderDescriptor` (e.g. `vaahstoreDescriptor`) and the registry is the union. `useProviders.ts:160-165` continues to build `ProviderWirePayload` from the descriptors it discovers. The workspace's `examples/playground-ecommerce/app/providers/registry.ts` is a copy of `examples/playground/app/providers/registry.ts`'s `vaahstore` entry — workspace-isolated, so the existing playground's registry is untouched.
11. **Rewrite `docs/content/2.concepts/9.providers.md`.** Replace §"How to add a third provider (Codex as the worked example)" with §"Authoring a workspace plugin":
    - §1: "The provider-free framework" — callout: `@genicui/core` and `@genicui/server` ship zero third-party provider symbols. Provider plugins live in example workspaces.
    - §2: `defineProvider(...)` factory — shows the 5-line template.
    - §3: F14 wrap-at-registration contract — link to F14 spec, link to the `validateToolInput` reference.
    - §4: Bearer-scrub contract — callout: "every HTTP-shaped plugin must invoke `makeBearerScrubber` inside its factory".
    - §5: Discovery — workspace boot file + `genicui.plugins` field + `discoverWorkspaceProviders` helper.
    - §6: Worker-isolation opt-in — `requiresIsolation: true` and when to set it.
    - §7: Worked example — VaahStore end-to-end, linking to `examples/playground-ecommerce/server/providers/vaahstore/runtime/index.ts` and `define.ts`.
    - Update the "Current providers" table: Claude Code + Codex stay built-in (in `packages/server/src/chat/providers/`); VaahStore moves to "workspace plugin @ `examples/playground-ecommerce/server/providers/vaahstore/`".
12. **Workspace README + docs cross-link.** Author `examples/playground-ecommerce/README.md` documenting:
    - The workspace structure (`app/components/ecommerce/{ui,agent,registry}`, `server/providers/{vaahstore,registry,boot,types,index}`, `__fixtures__/vaahstore`).
    - The plugin pattern: "this workspace ships its own provider API. To add a second provider, copy `vaahstore/` and call `registerProvider` from `boot.ts`."
    - A link to `docs/content/2.concepts/9.providers.md` for the full pattern.
13. **Sanity-gate the workspace isolation rule.** `git diff --stat packages/` returns zero files changed. `git diff --stat examples/playground/` returns zero files changed. `git diff --stat` against root `package.json` returns zero. The only diffs live under `examples/playground-ecommerce/`. Verified by a script at `examples/playground-ecommerce/scripts/check-isolation.sh` that the workspace's `package.json` `scripts.check-isolation` invokes.

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `sequential-thinking` | For Step 4 + Step 6: multi-step correctness proofs (F14 wrap-at-registration rejection paths; worker_threads MessagePort contract test design) | Steps 4, 6 |
| `brainstorming` | Step 2 only — workspace-local type duplication vs. extracting a shared `examples/<workspace>/server/providers/types.ts` to `examples/playground-ecommerce/server/types/` for cross-plugin reuse inside the same workspace | Step 2 |
| `filesystem` (MCP) | New directory scaffolding, file moves, docs rewrite | Steps 2, 3, 11, 12 |
| `memory` (MCP) | Persist the `defineProvider` factory shape, the F14 wrap-at-registration contract, the worker-isolation contract, and the workspace-boot discovery design rules | End of task |

## Acceptance Criteria

- **M5.2-T2-1-AC1** — `packages/server/src/chat/providers/` no longer contains `vaahstore.ts`, `vaahstore.test.ts`, or any provider-specific import for VaahStore. **`git diff packages/server/src/chat/providers/registry.ts` returns empty.** The 3-entry hardcoded `Map` in `registry.ts:33-37` and the eager `new ClaudeCodeAdaptor()` / `new CodexAdaptor()` constructors stay as-is.
- **M5.2-T2-1-AC2** — `examples/playground-ecommerce/server/providers/vaahstore/` exists at the new location, ships the 12 TypeBox schemas + the `createVaahstoreProvider` factory. `bun --filter playground-ecommerce test` runs all 43 original tests green (moved test file unchanged).
- **M5.2-T2-1-AC3** — `examples/playground-ecommerce/server/providers/{index,registry,types,boot,README}.ts` exist and form a closed plugin API inside the workspace. `boot.ts` registers `vaahstore` once on workspace start. `getProviderAdaptor('vaahstore')` (workspace-scoped) returns the VaahStore adapter after `boot.ts` runs.
- **M5.2-T2-1-AC4** — F14 wrap-at-registration is mandatory: a `defineProvider(...)` invocation that ships `additionalProperties: true` in `configSchema` is rejected before `getProviderAdaptor` ever returns the wrapper. Verified by an explicit unit test (Step 6) + a 10K fast-check property run.
- **M5.2-T2-1-AC5** — Bearer-scrub contract: an HTTP-shaped `defineProvider` that does not invoke `makeBearerScrubber` is rejected at registration with a workspace-local `-32010 plugin_bearer_scrub_missing` error.
- **M5.2-T2-1-AC6** — `worker_threads` opt-in contract: `registerProvider(id, factory, { requiresIsolation: true })` boots the factory's inner work inside a `Worker`, and the resulting adaptor routes `callTool` over `MessagePort`. Verified by a fake isolated provider test (Step 6) that does NOT add a real second provider. VaahStore ships with `requiresIsolation: false`.
- **M5.2-T2-1-AC7** — Zero core edits. `git diff packages/` (after Step 3's cut-paste) shows only the **deletion** of `packages/server/src/chat/providers/vaahstore.ts` + `vaahstore.test.ts` + their fixtures. **No additions**, **no modifications** to `packages/server/src/chat/providers/registry.ts`, `packages/core/`, or root `package.json`. Verified by `examples/playground-ecommerce/scripts/check-isolation.sh`.
- **M5.2-T2-1-AC8** — `docs/content/2.concepts/9.providers.md` is rewritten: the "How to add a third provider (Codex as the worked example)" section becomes "Authoring a workspace plugin" with all 7 subsections per Step 11. The Codex stub is documented as a future built-in (still disabled). The VaahStore worked example points at the new in-workspace location. `examples/playground-ecommerce/README.md` documents the pattern as the canonical reference.

## Completion Criteria

- [ ] All 8 acceptance criteria above pass
- [ ] `bun install` at repo root succeeds with the new files in place (no workspace-glob change required — `examples/*` already picks up `playground-ecommerce/`)
- [ ] `bun --filter playground-ecommerce test` exits green (43/43 inherited VaahStore tests + new contract tests + worker-isolation test)
- [ ] `bun --filter @genicui/server test` exits green (the chat-handler tests see the same `claude-code` + `codex` registration they saw before — no behavioural change for the framework package)
- [ ] `bun run lint` reports zero errors (strict TS, zero `any`, ESLint clean)
- [ ] `bun --filter playground-ecommerce check-isolation` exits 0 (the script that asserts `git diff packages/` shows only VaahStore deletions; no additions, no modifications)
- [ ] `bun --filter genicui-docs build` (or `bun --filter docs build`) exits green; the rewritten `9.providers.md` renders; pre-existing 39-route sitemap unchanged
- [ ] Trust-boundary check: every `defineProvider` schema is `Value.Check()`ed at registration time; new entry-point regression test asserts the rejection path fires (10K fast-check prop run on random `defineProvider` specs)
- [ ] Worker-isolation contract test passes without spinning a second real provider (fake-isolated stub)
- [ ] Working tree clean before final commit; branch `feature/ProviderPluginArchitecture` rebased on `develop`

## Testing Checklist

- [ ] Unit tests for `defineProvider` / `registerProvider` / `unregisterProvider` / `getProviderAdaptor` / `listProviderIds` (one Bun test per contract clause)
- [ ] Integration test: `discoverWorkspaceProviders` over a 3-fake-package workspace fixture
- [ ] F14 wrap-at-registration property test: fast-check 10K random `defineProvider` specs, asserting every `additionalProperties: true` is rejected before `getProviderAdaptor` resolves
- [ ] Bearer-scrub contract test: an HTTP-shaped `defineProvider` that does not invoke `makeBearerScrubber` is rejected at registration
- [ ] Worker-isolation contract test: fake isolated stub proves `MessagePort` round-trip without second real provider
- [ ] Regression: 43/43 inherited VaahStore tests pass unchanged (now at `examples/playground-ecommerce/server/providers/__tests__/vaahstore.test.ts`); original `claude-code.ts` + `codex.ts` tests still pass (untouched in `packages/server/`)
- [ ] Docs: `bun --filter genicui-docs build` exits 0 and `linkinator` on the rewritten page returns zero broken internal links
- [ ] Workspace isolation: `examples/playground-ecommerce/scripts/check-isolation.sh` exits 0 — `git diff packages/`, `git diff examples/playground/`, and `git diff package.json` are all empty (modulo the VaahStore source deletion in `packages/server/src/chat/providers/`)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
|---|---|---|---|---|
| M5.2-T2-1-01 | Branch `feature/ProviderPluginArchitecture` from `develop` | ⚪ Not Started | ❌ No | Critical |
| M5.2-T2-1-02 | Scaffold `examples/playground-ecommerce/server/providers/{index,registry,types,boot,README}.ts` | ⚪ Not Started | ✅ Yes | Critical |
| M5.2-T2-1-03 | Cut-paste `vaahstore.ts` (732 lines) + `vaahstore.test.ts` (43 tests) from `packages/server/src/chat/providers/` into `examples/playground-ecommerce/server/providers/vaahstore/`; reconcile imports; verify 43 tests pass at the new location | ⚪ Not Started | ✅ Yes | Critical |
| M5.2-T2-1-04 | Implement `defineProvider` + `registerProvider` + `unregisterProvider` + `getProviderAdaptor` + `listProviderIds` + `discoverWorkspaceProviders` in `examples/playground-ecommerce/server/providers/registry.ts` | ⚪ Not Started | ✅ Yes | Critical |
| M5.2-T2-1-05 | F14 wrap-at-registration contract test (10K fast-check prop + 4 targeted unit tests + bearer-scrub missing rejection) | ⚪ Not Started | ✅ Yes | Critical |
| M5.2-T2-1-06 | `worker_threads` opt-in contract test (fake-isolated stub, MessagePort round-trip) | ⚪ Not Started | ✅ Yes | High |
| M5.2-T2-1-07 | Wire `boot.ts` into the workspace's Nuxt `server/plugins/` so it runs at workspace start | ⚪ Not Started | ✅ Yes | High |
| M5.2-T2-1-08 | Add `engines.genicui: '^0.1.0'` + `genicui.plugins: ['./server/providers/boot.ts']` to `examples/playground-ecommerce/package.json` | ⚪ Not Started | ❌ No | Medium |
| M5.2-T2-1-09 | Client-side `ProviderDescriptor` mirror: `examples/playground-ecommerce/app/providers/registry.ts` becomes a thin re-export of `vaahstoreDescriptor` | ⚪ Not Started | ✅ Yes | Medium |
| M5.2-T2-1-10 | Rewrite `docs/content/2.concepts/9.providers.md`: "Authoring a workspace plugin" replaces "How to add a third provider (Codex)"; 7 subsections per Step 11 | ⚪ Not Started | ✅ Yes | High |
| M5.2-T2-1-11 | Author `examples/playground-ecommerce/README.md` documenting the workspace structure + plugin pattern + cross-link to docs page | ⚪ Not Started | ❌ No | High |
| M5.2-T2-1-12 | Add `examples/playground-ecommerce/scripts/check-isolation.sh` + `package.json` `scripts.check-isolation` to gate the "no core edits" rule | ⚪ Not Started | ✅ Yes | Critical |

## Dependencies

- **Requires:** M5.2-T2 ✅ (commit `330e94f` — the 732-line `vaahstore.ts` we extract). M3-T2 ✅ (F14 `wrapWithValidation` primitives). M5.1-T15 ✅ (F76 docs page becomes the rewrite target).
- **Blocks:** M5.2-T3 (registry entries — cleaner integration point once the plugin API exists in the workspace). M5.2-T5 (journey state machine — stable surface; the 12 tools keep their wire shape unchanged through the move).
- **Optional downstream unblock:** a future M5.x task can promote the workspace-resident `defineProvider` to a shared `examples/_shared/server-providers/` module if a second example workspace adopts the same shape. Out of scope for M5.2.

## Documentation References

- Source insights: `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md` §5 (12-tool table — unchanged through the move).
- M5.2-T2 evidence: commit `330e94f` + recon cited inline below.
- F14 trust boundary: `.vaahagents/requirements/specs/features/feature-014-trust-boundary.md` (the wrap-at-registration contract composes `stripProtoKeys` + `validateToolInput` + `rejectOpenSchemas` already public from `@genicui/core/validation`).
- Provider registry docs (rewrite target): `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/task-M5.1-T15-provider-registry.md` + the file at `docs/content/2.concepts/9.providers.md`.
- Locked decisions: `.vaahagents/requirements/idea/consolidated-requirements.md` §B (trust boundary is unchanged by this task — F14 invariants are strengthened, not altered).

## Notes

- **Architectural direction (user redirect, 2026-09-17).** The user explicitly stated:
  > "provider-vaahstore should exist in `/Users/pk/Projects/GenicUI/examples/playground-ecommerce`. None of these tasks should affect core of genicui and all should update docs as well based on the learning."
  
  This task is the formalization of that redirect. The previous T2-1 plan (`packages/provider-vaahstore/` + `defineProvider` in `@genicui/core`) is superseded. The recon (1 internal Explore agent + 1 external-research general-purpose agent) confirmed the current shape contradicts the directive and produced a comparative table of plugin architectures (VS Code, MCP, Fastify, Vercel AI SDK, LangChain, HashiCorp, Stripe Connect, Bun's `Bun.plugin`, etc.). The directive "borrow from MCP (wire) + Fastify (encapsulation) + Vercel AI SDK (tool shape) + Stripe Connect (per-instance token isolation) — but keep all of it inside the example workspace" becomes this task's locked architectural pattern.

- **Why the workspace-resident pattern rather than `packages/provider-*/`.** The user redirected twice in succession:
  1. First redirect (post-`330e94f`): "vaahstore should not be the part of core packages, instead we should have the method to extend it without modifying core packages" → this is what the previous T2-1 plan addressed (extraction to a new workspace package `packages/provider-vaahstore/`).
  2. Second redirect (2026-09-17, more specific): "provider-vaahstore should exist in `/Users/pk/Projects/GenicUI/examples/playground-ecommerce`" → the previous plan was a half-step toward the real destination. The current plan moves VaahStore all the way into the example workspace, where the user's mental model already places it.

- **Why the plugin API lives in the workspace, not in `@genicui/core` or `@genicui/server`.** "None of these tasks should affect core of genicui" — the simplest interpretation is the most defensive: keep the plugin API inside the example workspace, scoped to the workspace. A future M5.x task can promote it to a shared `examples/_shared/server-providers/` module if a second example workspace adopts the same shape. Until then, duplication is acceptable.

- **Why `claude-code.ts` + `codex.ts` stay in `packages/server/`.** They are tolerable first-party entries (343 lines + 32 lines), ship no env, no fixtures, no subprocess-at-module-load weight, and they predate the M5.2 milestone. Moving them would be a refactor of the M5.1-T15 docs page; out of scope here. F76 docs already document them as "built-in".

- **Why `worker_threads` opt-in rather than mandatory or skipped.** Mandatory adds a JSON marshalling cost to trivial CLI tokens (`Bun.spawn` is already isolated via OS process); skipped would make "@genicui/provider-stripe" hard to defend security-wise. The opt-in `requiresIsolation: true` lets each plugin author make the cost/benefit choice at registration time. The workspace-resident `registerProvider` honors the flag the same way the previously-planned `@genicui/core` registry would have.

- **Naming nit.** This task's ID is `M5.2-T2-1` (no zero-pad, per user literal). M5.2-T2's sub-task IDs are `M5.2-T2-01`–`M5.2-T2-06` (zero-padded). Both forms coexist in the dashboard after this task lands; a future M5.2-followup planning task should pick one.

- **What this task does NOT change.** Wire shapes: `ProviderWirePayload = { id, config: Record<string, string> }` is unchanged. Chat event vocabulary: the 7 `chat.event.type` values are unchanged. F14 error codes (`-32003 props_invalid`, `-32010 internal`, etc.): unchanged. The chat-handler's consumer's 5 methods (`id, label, resolveBinary, buildArgs, parseLine`): unchanged. MCP server's `tools/call` boundary: unchanged. The only thing downstream consumers see is: `getProviderAdaptor('vaahstore')` (workspace-scoped) returns the same adapter, but it now comes from `examples/playground-ecommerce/server/providers/vaahstore/` after the workspace's `boot.ts` runs, not a hardcoded `Map` literal.

- **Commit convention.** Per project memory (`CLAUDE.md` §GenicUI Constraints): `feat(F{n}): [Task ID] Brief description`. This task does not introduce a new F-ID, so the commit prefix is `feat(provider-plugins): [M5.2-T2-1] …` — first commit deviating from the `F{n}` form, user-authorized by the existing `genicui-planner-conventions-extended.md` precedent for orphan non-feature work. **NEVER push to origin — commit locally only.**

- **Per-task docs updates are enforced.** Per the user's "all should update docs" mandate, every M5.2 task includes a docs-update sub-step. This task owns the docs page rewrite (`docs/content/2.concepts/9.providers.md` + `examples/playground-ecommerce/README.md`). M5.2-T3/T4/T5 each add their own docs-update sub-step to update `examples/playground-ecommerce/docs/<their-slug>.md` (e.g. `components.md`, `ui-vue.md`, `agent-journey.md`) and any cross-references they touch.

- **Hand-back to M5.2's next task (M5.2-T3).** Once T2-1 lands, M5.2-T3's "registry entries reference verified schema fields" AC transitions from "read the field list out of `vaahstore.ts`" to "import the field list from `examples/playground-ecommerce/server/providers/vaahstore/runtime/index.ts`". M5.2-T3 also gets a docs-update sub-step that updates `examples/playground-ecommerce/docs/components.md` with the in-workspace plugin location.
