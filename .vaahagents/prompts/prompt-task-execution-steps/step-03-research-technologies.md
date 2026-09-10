---
step: 3
title: Research Technologies
phase: Planning
---

# Step 3: Research Technologies

**MANDATORY — DO NOT SKIP.** Every task must go through this step.

For any technology or pattern not yet familiar in this task:

**Invoke `fetch` MCP server** to retrieve official documentation for the exact version in use.

**Invoke the relevant skill** for each technology involved — even if you think you already know the answer:

- Invoke `nuxt` skill before writing Nuxt or Nitro code.
- Invoke `tailwindcss` or `tailwind-design-system` skill before writing Tailwind CSS styles.
- Invoke `next-best-practices` skill when evaluating Next.js patterns (for reference, not implementation).
- Invoke `shadcn` skill when evaluating design system patterns.
- Invoke `primevue` skill before writing PrimeVue components.
- Invoke `playwright` skill before writing E2E tests.
- Invoke `fastapi` skill before writing Python backend code (for Cloudflare Worker bindings).

Note integration patterns between technologies relevant to this task:

- **Bun + Elysia + WebSocket** — server runtime, HTTP framework, and transport
- **TypeBox** — runtime validation (must use `Value.Check()` for all inbound data)
- **fast-json-patch** — JSON-Patch engine (must use `{ mutate: false }`)
- **Web Components + Shadow DOM** — browser-side rendering isolation
- **Vue 3** — framework shim layer (subpath exports from `@genicui/client/vue`)
- **Cloudflare Workers + Durable Objects** — deployment target

Research the MCP SDK (`@modelcontextprotocol/sdk`) for the exact version (`^1.0.0`) to confirm:
- Tool definition API
- Transport options (stdio, Streamable HTTP)
- Resource handling for MCP Apps (`ui://` resources)
