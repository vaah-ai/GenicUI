# M5.2-T2-1 — Implementation Plan (in-workspace plugins, zero core edits)

> Locked task ID: **M5.2-T2-1** (no zero-pad, per user literal)
> Manifest: extends F13 (MCP) / F14 (trust boundary) / F76 (provider-registry docs); introduces a **workspace-resident** plugin pattern inside `examples/playground-ecommerce/server/providers/`. **Zero edits to `packages/`.**
> Branch: `feature/ProviderPluginArchitecture`
> Commit prefix: `feat(provider-plugins): [M5.2-T2-1] …`

---

## Key facts established during Step 2-4

1. **Workspace is incomplete.** `examples/playground-ecommerce/` only contains `__fixtures__/` + `docs/`. No `package.json`, `nuxt.config.ts`, `app/`, or `server/`. The task spec assumes these exist — they don't. **We must scaffold the workspace too.**
2. **Validation primitives live at `packages/server/src/validation/`, NOT `@genicui/core/validation`.** The task spec's claim about `@genicui/core/validation` is wrong — the primitives are internal to `@genicui/server` and not in its `exports` map. **Solution: workspace-local shallow copies** of `strip-proto-keys.ts` + `registry-validation.ts` + a workspace-local `schema-validation.ts` with its own error codes. ~120 LOC total.
3. **Workspace glob is already `examples/*`** in root `package.json:9-13`. Just creating `examples/playground-ecommerce/package.json` is enough — Bun picks it up.
4. **`chat-handler.ts:114, 406, 937`** are the three call sites of `getProviderAdaptor`. They consume the same `ProviderAdaptor` shape — workspace-scoped lookup is signature-compatible.
5. **Workspace package name:** `genicui-playground-ecommerce` (kebab-case, matches existing playground naming).
6. **Commit prefix is `feat(provider-plugins):` (not `feat(Fn):`)** — user-authorized per `genicui-planner-conventions-extended.md`.

---

## Phased implementation order

### Phase A — Workspace scaffold
- [ ] **A1.** Create `examples/playground-ecommerce/package.json` mirroring `examples/playground/package.json` + `engines.genicui: '^0.1.0'` + `genicui.plugins: ['./server/providers/boot.ts']`.
- [ ] **A2.** Create `examples/playground-ecommerce/nuxt.config.ts` (mirror existing playground config).
- [ ] **A3.** Create `examples/playground-ecommerce/tsconfig.json` (mirror existing playground tsconfig).
- [ ] **A4.** Create `examples/playground-ecommerce/start.sh` (production launcher — copy from playground).
- [ ] **A5.** Run `bun install` at repo root to confirm the workspace is picked up.

### Phase B — Workspace-local validation + types
- [ ] **B1.** Create `examples/playground-ecommerce/server/providers/types.ts` — `ProviderAdaptor`, `ProviderConfig`, `ChatEvent`, `ParsedLine`, `ProviderPluginManifest`, `ProviderPluginSpec` types. `// TODO(M5.x): import from @genicui/server once shared provider-types module lands` comment.
- [ ] **B2.** Create `examples/playground-ecommerce/server/providers/validation/` with shallow-copies of `strip-proto-keys.ts`, `registry-validation.ts`, `schema-validation.ts` (with workspace-local `GENICUI_ERROR_CODES` constants — `props_invalid: -32003`, `plugin_bearer_scrub_missing: -32010`). Plus barrel `index.ts`.
- [ ] **B3.** Tests: `validation.test.ts` confirms the three primitives behave like their core counterparts.

### Phase C — Move VaahStore adapter
- [ ] **C1.** `git mv packages/server/src/chat/providers/vaahstore.ts examples/playground-ecommerce/server/providers/vaahstore/runtime/index.ts` (731 lines).
- [ ] **C2.** `git mv packages/server/src/chat/providers/vaahstore.test.ts examples/playground-ecommerce/server/providers/__tests__/vaahstore.test.ts` (484 lines, 43 tests).
- [ ] **C3.** Update imports in moved files: `'../../validation/schema-validation.js'` → local `'../validation/index.js'`; `'../../validation/strip-proto-keys.js'` → local `'../validation/strip-proto-keys.js'`.
- [ ] **C4.** Run `bun --filter playground-ecommerce test` — assert 43/43 VaahStore tests still pass at the new location.

### Phase D — Plugin registry API
- [ ] **D1.** Implement `defineProvider(spec: ProviderPluginSpec): ProviderPluginManifest` in `examples/playground-ecommerce/server/providers/registry.ts`. Pure factory — no I/O.
- [ ] **D2.** Implement `registerProvider(id: string, factory: () => ProviderAdaptor, opts?: { requiresIsolation?: boolean }): void`:
  - Synchronous
  - Validates F14 schema at registration via `rejectOpenSchemas(providerManifest.configSchema)` — throws `RegistryValidationError` if `additionalProperties: true`
  - Rejects HTTP-shaped manifests that don't invoke `makeBearerScrubber` with workspace-local `-32010 plugin_bearer_scrub_missing` error
  - Throws on duplicate id (deterministic detection)
- [ ] **D3.** Implement `unregisterProvider(id: string): boolean`, `getProviderAdaptor(id: string): ProviderAdaptor | null`, `listProviderIds(): readonly string[]`.
- [ ] **D4.** Implement `discoverWorkspaceProviders(workspaceRoot: string): Promise<string[]>` — walks `<root>/server/providers/*/` for plugin dirs with `define.ts` exports.
- [ ] **D5.** Implement `requiresIsolation: true` Worker wrapper — when flag is set, boot the factory's inner work in a `node:worker_threads.Worker` and route `callTool` through `MessagePort`.

### Phase E — Boot file & wire-up
- [ ] **E1.** Create `examples/playground-ecommerce/server/providers/boot.ts` — `unregisterProvider('vaahstore'); registerProvider('vaahstore', () => createVaahstoreProvider(process.env))`.
- [ ] **E2.** Create `examples/playground-ecommerce/server/plugins/00-boot-providers.ts` — Nuxt server plugin that imports `boot.ts` so it runs once at server start.

### Phase F — Client mirror
- [ ] **F1.** Create `examples/playground-ecommerce/app/providers/types.ts` — copy of playground's `types.ts` (only the `ProviderDescriptor` interface).
- [ ] **F2.** Create `examples/playground-ecommerce/app/providers/registry.ts` — single-entry `PROVIDERS = [vaahstoreDescriptor]` + `getProviderById`, `DEFAULT_PROVIDER_ID`.

### Phase G — Contract tests
- [ ] **G1.** `examples/playground-ecommerce/server/providers/__tests__/registry.test.ts` — `defineProvider` + `registerProvider` + `unregisterProvider` + `getProviderAdaptor` + `listProviderIds` round-trip.
- [ ] **G2.** `__tests__/wrap-at-registration.test.ts` — `additionalProperties: true` rejection + bearer-scrub missing rejection + duplicate-id rejection. Plus 10K fast-check property run.
- [ ] **G3.** `__tests__/worker-isolation.test.ts` — fake-isolated stub with real `node:worker_threads.Worker` + `MessagePort` round-trip.
- [ ] **G4.** `__tests__/discovery.test.ts` — `discoverWorkspaceProviders` over a 3-fake-package tmpdir fixture.

### Phase H — Docs rewrite
- [ ] **H1.** Rewrite `docs/content/2.concepts/9.providers.md` per the 7-subsection template (provider-free framework / defineProvider factory / F14 wrap / bearer-scrub / discovery / worker isolation / worked example).
- [ ] **H2.** Author `examples/playground-ecommerce/README.md` — workspace structure + plugin pattern + cross-link.
- [ ] **H3.** Author `examples/playground-ecommerce/docs/plugin-architecture.md` — companion doc (per docs-update mandate).

### Phase I — Workspace isolation gate
- [ ] **I1.** Create `examples/playground-ecommerce/scripts/check-isolation.sh` — asserts `git diff packages/` shows ONLY VaahStore source deletion + `git diff examples/playground/` empty + `git diff package.json` empty.
- [ ] **I2.** Add `scripts.check-isolation` to `examples/playground-ecommerce/package.json`.
- [ ] **I3.** Run script — must exit 0.

### Phase J — Final verification
- [ ] **J1.** `bun install` at root — workspace picked up.
- [ ] **J2.** `bun --filter playground-ecommerce test` — 43 VaahStore + new contract tests + worker-isolation test all green.
- [ ] **J3.** `bun --filter @genicui/server test` — chat-handler tests still pass (zero regression).
- [ ] **J4.** `bun --filter genicui-docs build` — docs build green.
- [ ] **J5.** `bun run lint` at root — ESLint clean.
- [ ] **J6.** `bun --filter playground-ecommerce check-isolation` — exits 0.

---

## Critical files & lines (reference)

- `packages/server/src/chat/providers/vaahstore.ts` (731 lines — source to move)
- `packages/server/src/chat/providers/vaahstore.test.ts` (484 lines — 43 tests)
- `packages/server/src/chat/providers/registry.ts:33-37` (the 3-entry `Map` literal — MUST NOT be touched)
- `packages/server/src/chat/chat-handler.ts:114, 406, 937` (consumer call sites — signature-compatible)
- `packages/server/src/validation/strip-proto-keys.ts` (28 lines — to be copied)
- `packages/server/src/validation/registry-validation.ts` (~117 lines — to be copied)
- `packages/server/src/validation/schema-validation.ts` (~95 lines — to be adapted, with workspace-local error codes)
- `docs/content/2.concepts/9.providers.md` (to rewrite)

---

## Decisions (locked)

1. **Validation primitives:** workspace-local shallow copies, not deep imports.
2. **Type duplication:** workspace-local `ProviderAdaptor` interface with `TODO(M5.x)` comment.
3. **Worker isolation:** `node:worker_threads` (Bun has Node compat). Default off.
4. **Discovery:** both modes supported (explicit `boot.ts` + optional `discoverWorkspaceProviders`).
5. **Boot file location:** `examples/playground-ecommerce/server/plugins/00-boot-providers.ts` (Nuxt auto-load convention).
6. **Test runner:** `bun test`. Tests colocalized in `__tests__/`.
7. **Commit message:** `feat(provider-plugins): [M5.2-T2-1] …`.

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Workspace not picked up by Bun | Verify with `bun install` after Phase A |
| Validation copy drifts from core | Attribution comment + workspace tests mirror core |
| Worker test flakes on CI | Use deterministic `Worker` + `MessageChannel` + short timeout |
| Chat-handler regression | Run `@genicui/server` test suite at J3 — must stay green |
| Docs build fails | Run `bun --filter genicui-docs build` at J4 — must exit 0 |

---

## Estimated effort

| Phase | Effort |
|---|---|
| A (workspace scaffold) | 0.5 day |
| B (validation + types) | 0.5 day |
| C (move VaahStore) | 0.5 day |
| D (plugin registry) | 1 day |
| E (boot + wire-up) | 0.25 day |
| F (client mirror) | 0.25 day |
| G (contract tests) | 1 day |
| H (docs rewrite) | 0.5 day |
| I (isolation gate) | 0.25 day |
| J (verification) | 0.25 day |
| **Total** | **5 days** |

Matches the task's 5-7 day estimate.
