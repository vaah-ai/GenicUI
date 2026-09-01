---
step: 4
title: Analyze Related Code
phase: Planning
---

# Step 4: Analyze Related Code

**Invoke `filesystem` MCP server** to read files in affected areas.

Read in parallel:

- Existing components, modules, or functions this task extends or modifies
- Adjacent test files for the code being touched
- Relevant utility or helper files

For GenicUI monorepo structure (production):

- `packages/core/src/` — framework-agnostic logic (protocol, schema, mcp, events, patch, types)
- `packages/server/src/` — WebSocket + HTTP server, tool handlers, transport
- `packages/client/src/` — browser-side client (ws-client, web-component, vue, postmessage)
- `registries/primevue/` — component registry (DataTable adaptor)
- `examples/nuxt-primevue/` — working dev environment

For PoC code (current working state):

- `poc/server/*.mjs` — MCP server, chat handler, registry, lifecycle, bridge
- `poc/adaptors/*.mjs` — component adaptors (Counter, TodoList, CartViewer)
- `poc/web/*.mjs` — chat surface client

Note: coding style, naming conventions, import patterns, prop/type interfaces, error handling patterns already in use.

- PoC uses `.mjs` (ESM), production uses `.ts` with strict TypeScript
- `console.log` redirected to `stderr` in MCP server (stdout is MCP transport)
- All validation uses Zod in PoC, TypeBox `Value.Check()` in production
- JSON-Patch with `{ mutate: false }` — never mutate state in place

**Invoke `sequential-thinking` MCP server** if this task involves an architectural decision or complex integration.
