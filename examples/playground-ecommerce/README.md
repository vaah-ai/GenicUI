# GenicUI Ecommerce Playground

A worked-example workspace for the GenicUI provider plugin architecture
(M5.2-T2-1). Ships one provider — **VaahStore** — using the workspace-
resident plugin API documented at
[`docs/content/2.concepts/9.providers.md`](../../docs/content/2.concepts/9.providers.md).

## Quick start

```bash
cd /Users/pk/Projects/GenicUI
bun install
bun --filter genicui-playground-ecommerce start.sh   # port 3042
# OR
cd examples/playground-ecommerce && bun run start.sh
```

The workspace runs on **port 3042** (sibling to `examples/playground` on
3040). Open http://localhost:3042 and pick `vaahstore` in the Providers
dropdown.

## Layout

```
playground-ecommerce/
├── app/
│   └── providers/
│       ├── types.ts         # ProviderDescriptor, ProviderWirePayload
│       └── registry.ts      # Single PROVIDERS entry (vaahstore)
├── server/
│   ├── providers/           # Workspace plugin host (this task)
│   │   ├── registry.ts      # defineProvider / registerProvider / etc
│   │   ├── boot.ts          # Registers vaahstore at workspace boot
│   │   ├── index.ts         # Barrel
│   │   ├── types.ts         # ProviderAdaptor / PluginExtraSurface types
│   │   ├── validation/      # F14 trust-boundary primitives (workspace-local)
│   │   ├── vaahstore/
│   │   │   └── runtime/     # The VaahStore adapter (12 §5 tools)
│   │   └── __tests__/       # Contract tests
│   └── plugins/
│       └── 00-boot-providers.ts    # Nuxt server plugin → boot.ts
├── __fixtures__/vaahstore/  # 12 tools' fixture JSON
├── docs/
│   └── plugin-architecture.md
├── nuxt.config.ts
├── package.json
├── scripts/
│   └── check-isolation.sh   # Gates "no edits to packages/"
├── start.sh
└── tsconfig.json
```

## Adding a new provider

See [`docs/plugin-architecture.md`](./docs/plugin-architecture.md). The
TL;DR:

1. Copy `server/providers/vaahstore/` as a template.
2. Drop a `<your-provider>/define.ts` that exports a
   `ProviderPluginManifest` (output of `defineProvider(...)`).
3. Add a registration call in `server/providers/boot.ts` — OR call
   `discoverWorkspaceProviders(import.meta.dir)`.
4. Add a descriptor entry to `app/providers/registry.ts`.

## How this differs from `examples/playground`

| Aspect | `examples/playground` | `examples/playground-ecommerce` |
|---|---|---|
| Server adapters | **Built-in** — `claude-code`, `codex` (in `packages/`) | **Workspace plugins** — `vaahstore` (in workspace) |
| Bearer tokens | None | Per-instance `makeBearerScrubber` closure |
| Fixtures | None | 12 tool fixtures in `__fixtures__/vaahstore/` |
| Discovery | Statically-imported at `@genicui/server` boot | Dynamic — `discoverWorkspaceProviders(workspaceRoot)` |
| Port | 3040 | 3042 |
| Registry tools | `claude-code` + `codex` (claude-code enabled) | `vaahstore` |
| Edit surface | Re-uses core | No edits to `packages/` ever |

## Why a separate workspace?

The `vaahstore` adapter is **substantive** — 732 lines of runtime code +
43 tests + 12 fixtures + bearer-scrub logic. Stuffing that into
`packages/server/src/chat/providers/` would violate the
provider-free-framework rule from F76 docs. Keeping it in the workspace
also makes the pattern copy-paste-able for any future third-party HTTP
provider (e.g. `@genicui/provider-stripe`).

## Workspace isolation

The repo enforces "zero edits to `packages/`" via
`scripts/check-isolation.sh`. Run it explicitly:

```bash
bun --filter genicui-playground-ecommerce check-isolation
```

CI runs it on every commit to this branch.
