---
title: Tech Stack Reference
purpose: Exact technology versions and documentation URLs
---

# Tech Stack

| Technology        | Version         | Documentation                                       |
| ----------------- | --------------- | --------------------------------------------------- |
| Node.js / Bun     | Current LTS     | https://bun.com/docs, https://nodejs.org/           |
| `@modelcontextprotocol/sdk` | ^1.0.0    | https://modelcontextprotocol.io/                     |
| WebSocket         | `ws` ^8.18.0    | https://github.com/websockets/ws                     |
| Zod               | (PoC validation) | https://zod.dev/                                    |
| TypeBox           | (Production)    | https://github.com/sinclairtx/typebox                |
| fast-json-patch   | (JSON-Patch)    | https://github.com/Starcounter-Jack/JSON-Patch       |
| Elysia            | (Production server) | https://elysiajs.com/                            |
| PrimeVue 4        | 4.x             | https://primevue.org/                                |
| Vue 3             | 3.x             | https://vuejs.org/                                   |
| Nuxt              | (Target framework) | https://nuxt.com/                                |
| Playwright        | (E2E testing)   | https://playwright.dev/                              |
| Cloudflare Workers | (Deploy)       | https://developers.cloudflare.com/workers/           |
| fast-check        | (Property tests) | https://github.com/dubzzz/fast-check              |

**Key integration patterns:**

- **Bun + Elysia + WebSocket** — server runtime, HTTP framework, transport
- **TypeBox `Value.Check()`** — all inbound data validation (replaces Zod in production)
- **JSON-Patch `{ mutate: false }`** — never mutate state in place
- **Web Components + Shadow DOM** — browser rendering isolation
- **Vue 3 shim** — `@genicui/client/vue` subpath export for framework integration
- **PrimeVue 4 PassThrough API** — inject GenicUI data into PrimeVue components
- **MCP SDK transports** — stdio (default) or Streamable HTTP (stateless per-request)
