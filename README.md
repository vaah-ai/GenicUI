# GenicUI

**Generative agentic UI framework** — install into any AI project to render custom UI components and bridge them to your agent.

GenicUI lets an AI agent **render, update, and respond to** UI components inside a chat conversation. You wrap your existing component library (PrimeVue, Flowbite, ShadCN, anything) with a tiny adaptor, declare the component's contract in one place, and any MCP-capable agent — Claude Code, GPT, or your own — can discover and use it.

## What you get

- **Render custom UI from agent output** — components appear inline in the chat surface as the agent talks
- **Library-agnostic** — wrap PrimeVue, Flowbite, ShadCN, or hand-rolled components; the agent never knows which
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

## Project status

PoC — working end-to-end on macOS with Claude Code. The framework is not yet packaged for npm distribution; this repo captures the design, the working PoC, and the contract surface we're building toward.

## License

Private — internal PoC.
