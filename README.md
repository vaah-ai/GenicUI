<div align="right">

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvaah-ai%2FGenicUI&project-name=genicui-docs&root-directory=docs&build-command=bun+run+build&output-directory=.output%2Fpublic)
[![Live Site](https://img.shields.io/badge/Live%20Site-genicui.dev-7c3aed)](https://genicui.dev)

</div>

# GenicUI

**The protocol that lets AI agents use your UI.**

MCP-native. Library-agnostic. Render PrimeVue, Mantine, shadcn, MUI — the UI library stays yours.

GenicUI is a protocol layer that lets any AI agent render, update, and respond to real UI components in your existing application. You wrap your component library (PrimeVue, Mantine, shadcn, Skeleton, anything) with a tiny adapter, declare the component's contract in one place, and any MCP-capable agent — Claude Code, GPT, or your own — can discover and use it.

## What you get

- **Render custom UI from agent output** — components appear inline in the chat surface as the agent talks
- **Library-agnostic** — wrap PrimeVue, Mantine, shadcn, or hand-rolled components; the agent never knows which
- **Agent-agnostic** — works with any MCP-capable agent via standard MCP tools (`find_ui_component`, `render_component`, `update_component`, `subscribe_to_events`)
- **Journey-agnostic** — ecommerce, support, ops, internal tools — the same framework
- **Schema-as-source-of-truth** — one declaration generates TypeScript types, MCP tool definitions, and agent prompt fragments

## Install

```bash
# Option A: scaffold a new project
npx create-genicui-app my-app && cd my-app && npm run dev

# Option B: drop into an existing project
npm install genicui
```

## Try the PoC

This repo includes a working PoC. To run it locally:

```bash
bash start.sh
# Then open http://localhost:8080/poc/web/
```

The PoC has a chat surface, three sample components (Counter, TodoList, CartViewer), and a multi-turn Claude Code backend. See [poc/README.md](poc/README.md) for details.

## Documentation

The full design and contract surface lives in [docs/idea/](docs/idea/):

- **[Overview](docs/idea/README.md)** — what GenicUI is and how it's positioned
- **[Architecture](docs/idea/architecture.md)** — system design, component interaction, data flow
- **[Four-Agnostic Design](docs/idea/four-agnostic.md)** — the contract surface (journey/component/library/provider agnostic, sideEffects, subscriptions, Submit semantics)
- **[Developer Experience](docs/idea/dx.md)** — install paths, authoring flow, debugging DX
- **[CartViewer in 3 Frameworks](docs/idea/examples-cartviewer.md)** — same component in Nuxt+PrimeVue, Next.js+Flowbite, SvelteKit+Skeleton
- **[Lessons Learned](docs/idea/lessons-learned.md)** — what the PoC build taught us
- **[Adaptor Specification](docs/idea/adaptor-spec.md)**, **[Agent Protocol](docs/idea/agent-protocol.md)** — interface contracts
- **[Research Index](docs/idea/research-index.md)** — 7 research documents + synthesis
- **[Foundational Q&A](docs/idea/foundational-qa.md)** — OSS viability, naming, tagline, tech stack defense
- **[Package Distribution](docs/idea/package-distribution.md)** — 3 core packages + N community registries
- **[Competitive Relevance](docs/idea/competitive-relevance-qa.md)** — competitor matrix + locked tagline + use cases

## Package structure

This is a monorepo managed via npm workspaces:

```
packages/
└── core/                ← @genicui/core
    ├── src/
    │   ├── index.ts     ← Shared types and constants (VERSION)
    │   └── index.test.ts ← Unit tests (F1-AC1 to F1-AC3)
    ├── package.json     ← ESM, strict TypeScript, zero runtime deps
    ├── tsconfig.json    ← ES2022 target, ESNext module, strict
    └── eslint.config.js ← No `any` types enforced
```

| Package | Description | Status |
|---|---|---|
| `@genicui/core` | Shared types and constants | Implemented (M1-T1) |

## Testing

The test suite covers three layers:

| Layer | Location | Runner | Scope |
|---|---|---|---|
| Package unit tests | `packages/core/src/` | `bun test` | F1-AC1 to F1-AC3 |
| PoC unit tests | `poc/server/*.test.mjs`, `poc/adaptors/*.test.mjs` | `bun test` | Registry, lifecycle, broadcaster, chat parser |
| E2E tests | `e2e/*.spec.ts` | `npx playwright test` | Chat surface, component render, event bridge, full flow |

```bash
# Run all tests
bun test                        # unit + package tests
npx playwright test             # E2E (starts PoC server via global-setup)

# Run a specific layer
bun test packages/core/         # @genicui/core only
bun test poc/server/            # PoC server unit tests
npx playwright test e2e/chat-surface.spec.ts  # single E2E spec
```

## Project status

PoC — working end-to-end on macOS with Claude Code. The framework is not yet packaged for npm distribution; this repo captures the design, the working PoC, and the contract surface we're building toward.

**Completed:** `@genicui/core` package skeleton (M1-T1), PoC server unit tests, E2E test suite.

## License

Private — internal PoC.
