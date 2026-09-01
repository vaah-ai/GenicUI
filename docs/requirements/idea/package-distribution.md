---
title: GenicUI Package Distribution Strategy
description: Why GenicUI uses 3 core packages + N community registry packages, with subpath exports for framework shims and server bindings. The split rules and naming convention.
audience: Engineering, OSS maintainers, framework architects
date: 2026-09-01
---

# Package Distribution Strategy

> **Purpose:** This document captures the package distribution decision for GenicUI: which packages ship from day 1, which live as subpath exports, and which are community-maintained.
>
> **TL;DR:** GenicUI ships **3 core packages** + **N community registry packages**. Framework shims and server bindings are subpath exports, not separate packages.

---

## Table of Contents

1. [The anti-pattern: too many packages on day 1](#1-the-anti-pattern-too-many-packages-on-day-1)
2. [The 3-package MVP](#2-the-3-package-mvp)
3. [What lives in each package](#3-what-lives-in-each-package)
4. [Why registries are separate packages](#4-why-registries-are-separate-packages)
5. [When to split a subpath into a standalone package](#5-when-to-split-a-subpath-into-a-standalone-package)
6. [Naming convention](#6-naming-convention)
7. [Monorepo layout](#7-monorepo-layout)

---

## 1. The anti-pattern: too many packages on day 1

A common OSS mistake is to publish 12 packages at launch. The cost is real:

| Problem | Impact |
|---|---|
| Version coordination | Every breaking change ripples across N packages |
| CI overhead | N × (lint + typecheck + test + publish) |
| Discovery confusion | Users don't know which to install |
| Maintenance burden | Every PR touches multiple repos/packages |
| Repo sprawl | N separate issues, N changelogs, N READMEs |
| Slow first release | Can't ship MVP until all N are stable |

The opposite mistake — one giant `@genicui` with all framework code — also breaks (bloats every install, breaks tree-shaking). The answer is in the middle.

---

## 2. The 3-package MVP

| Package | Contains | Why |
|---|---|---|
| **`@genicui/core`** | Protocol types, schema system, JSON-Patch engine, AG-UI serializer, subscription routing, MCP tool definitions (4 tools), MCP Apps adapter, Web Component base classes | Framework-agnostic brain. Both client and server depend on this. |
| **`@genicui/server`** | Bun + Elysia + WebSocket transport, SSE fallback, MCP server bootstrap, Durable Objects adapter for Cloudflare deploy | The server. Has WebSocket lifecycle, frame multiplexing, schema validation at trust boundary |
| **`@genicui/client`** | Web Components base, framework shims (React/Vue/Svelte/Solid all in one package), browser-side subscription client, postMessage adapter for iframe mode | The client. One package, tree-shaken per framework |

**3 packages, not 12.**

---

## 3. What lives in each package

### `@genicui/core` — pure logic, no framework

```
@genicui/core/
├── src/
│   ├── protocol/        # AG-UI event types, JSON-Patch ops
│   ├── schema/          # TypeBox helpers, JSON Schema emission
│   ├── mcp/             # 4 tool definitions + MCP Apps adapter
│   ├── events/          # Subscription routing (UI → agent)
│   ├── patch/           # JSON-Patch (RFC 6902) engine
│   └── types/           # Component, Registry, Catalog types
├── package.json         # peerDependencies: typescript >= 5
└── exports: "genicui/core"
```

**Zero framework dependencies.** Pure TypeScript + TypeBox. Runs in Node, Bun, Deno, browser, worker, edge.

### `@genicui/server` — the WebSocket + HTTP server

```
@genicui/server/
├── src/
│   ├── transport/
│   │   ├── websocket.ts   # WS lifecycle, frame multiplexing
│   │   ├── sse.ts         # SSE for LLM token streaming
│   │   └── http.ts        # HTTP request/response
│   ├── bootstrap/         # mountGenicUI() for various frameworks
│   │   ├── elysia.ts      # Elysia binding (primary)
│   │   ├── nitro.ts       # Nitro/Nuxt binding
│   │   ├── fastify.ts     # Fastify plugin
│   │   ├── next.ts        # Next.js route handler
│   │   ├── sveltekit.ts   # SvelteKit +server.ts
│   │   ├── hono.ts        # Hono handler
│   │   └── express.ts     # Express middleware
│   ├── durable-objects/   # Cloudflare DO adapter
│   └── index.ts
├── peerDependencies:
│   - elysia (optional, for Elysia binding)
│   - h3 (optional, for Nitro binding)
│   - fastify (optional)
│   - next (optional)
│   - @sveltejs/kit (optional)
│   - hono (optional)
│   - express (optional)
└── exports:
    - "genicui/server"           # core
    - "genicui/server/elysia"    # each binding as subpath export
    - "genicui/server/nitro"
    - "genicui/server/fastify"
    - "genicui/server/next"
    - "genicui/server/sveltekit"
    - "genicui/server/hono"
    - "genicui/server/express"
```

**One package, subpath exports per framework.** User installs `@genicui/server` once and imports `@genicui/server/nitro` only if they want Nitro support. Tree-shaking handles the rest. No version coordination across packages.

### `@genicui/client` — browser-side render + subscription

```
@genicui/client/
├── src/
│   ├── web-component/    # Base HTMLElement class for <genic-*>
│   ├── react/            # React bindings (asChild shim, hooks)
│   ├── vue/              # Vue 3 bindings
│   ├── svelte/           # Svelte 5 bindings
│   ├── solid/            # Solid bindings
│   ├── subscription/     # subscribe_to_events client
│   ├── postmessage/      # Iframe mode adapter (MCP Apps)
│   └── ws-client.ts      # WebSocket client
├── peerDependencies:
│   - react (optional)
│   - vue (optional)
│   - svelte (optional)
│   - solid-js (optional)
└── exports:
    - "genicui/client"
    - "genicui/client/react"
    - "genicui/client/vue"
    - "genicui/client/svelte"
    - "genicui/client/solid"
    - "genicui/client/postmessage"
```

**Same pattern as server.** One package, subpath exports. Framework code is colocated, not fragmented.

---

## 4. Why registries ARE separate packages

This is the one split I'd make from day 1. The reasoning:

| Factor | `@genicui/server/*` (subpath) | `@genicul-primevue/registry` (separate package) |
|---|---|---|
| **Maintainer** | GenicUI core team | Community (PrimeVue users) |
| **Release cadence** | Tied to GenicUI core | Independent — PrimeVue can release without GenicUI |
| **Dependencies** | Peer deps on user's framework | Hard deps on PrimeVue |
| **Versioning** | GenicUI semver | Independent semver |
| **Who needs it?** | All GenicUI users | Only users who picked PrimeVue |
| **Bundle impact** | Included if imported | Only installed if chosen |

If `@genicui-server-primevue` lived inside `@genicui/server`, every GenicUI user would download PrimeVue even if they don't use it. **Registries are user-choice dependencies and must be separate packages.**

### Concrete example

```jsonc
// user-primevue-app/package.json
{
  "dependencies": {
    "@genicui/core": "^1.0.0",
    "@genicui/server": "^1.0.0",       // gets /nitro subpath
    "@genicui/client": "^1.0.0",       // gets /vue subpath
    "@genicul-primevue/registry": "^1.0.0",  // optional, PrimeVue renderer
    "primevue": "^4.0.0"               // user's own dep
  }
}
```

---

## 5. When to split a subpath into a standalone package

Three triggers, in order of importance:

### Trigger 1: Bundle size complaint
If `@genicui/client` ships React + Vue + Svelte + Solid all in one bundle and a user complains about 200KB+ of unused code, **split into `@genicui-client-react`, `@genicui-client-vue`, etc.**

**Mitigation first:** Make sure tree-shaking works. Modern bundlers should drop unused framework code. If they do, no split needed.

### Trigger 2: Independent versioning pressure
If a Vue user reports a Vue-specific bug and you need to ship a patch without touching React code, that's the signal to split.

**Mitigation first:** Use subpath exports + changesets to coordinate. If churn is high, split.

### Trigger 3: Different maintainers per framework
If a community maintainer wants to own `@genicui/client-vue` exclusively, give them their own package.

**Mitigation first:** Add CODEOWNERS. If that doesn't satisfy, split.

### Prediction
For the first 6-12 months, **3 packages + N registry packages** is the right shape. By month 12, you'll know which (if any) subpaths need promotion to standalone packages.

---

## 6. Naming convention

### Core packages: `@genicui/*`
Reserved for core-team-maintained packages.

| Package | Purpose |
|---|---|
| `@genicui/core` | Framework-agnostic logic |
| `@genicui/server` | WebSocket/HTTP server + framework bindings |
| `@genicui/client` | Browser-side rendering + framework shims |
| `@genicui/cli` | (Future) Dev tooling |

### Community registries: `@genicul-<library>/registry`

`genicul-` reads as "genicul-ate" (Latin for "to bend") — a nod to "generative" + "framework-agnostic". It signals "official-but-community-maintained".

Examples:
- `@genicul-primevue/registry`
- `@genicul-flowbite/registry`
- `@genicul-mantine/registry`
- `@genicul-shadcn/registry`
- `@genicul-skeleton/registry`

**Why not `@genicui-primevue/registry`?** Visual ambiguity: is it "GenicUI's PrimeVue plugin" or "GenicUI-PrimeVue's registry"? `genicul-` resolves that — it's clearly a registry by the community, blessed by GenicUI.

**Alternative naming conventions considered:**

| Convention | Pros | Cons | Verdict |
|---|---|---|---|
| `@genicui/*` + `@genicui-primevue/registry` | Consistent prefix | Ambiguous semantics | Reject |
| `@genicui/*` + `@genic-community/primevue-registry` | Clear separation | Long, awkward | Reject |
| `@genicui/*` + `@genicul-<lib>/registry` | Distinct, semantic | New namespace to learn | ✅ Adopt |

---

## 7. Monorepo layout

```
/Users/pk/Projects/GenicUI/        # monorepo root
├── packages/
│   ├── core/                      # @genicui/core
│   ├── server/                    # @genicui/server (+ subpaths)
│   └── client/                    # @genicui/client (+ subpaths)
├── registries/
│   └── primevue/                  # @genicul-primevue/registry
├── examples/
│   ├── nuxt-primevue/             # PoC, uses Nitro binding
│   └── sveltekit-skeleton/        # PoC, uses SvelteKit binding
├── docs/
│   └── idea/                      # research + Q&A documents
├── ai-base-prompts/               # requirements workflow prompts
├── package.json                   # workspace root
└── pnpm-workspace.yaml
```

The PoC apps become `examples/`, not the primary source. The primary source moves into `packages/`. This is the standard monorepo shape (used by Vite, Vue, Nuxt, Astro, etc.).

---

## Mapping the original package proposal to the final shape

| Original proposal | Final shape | Reason |
|---|---|---|
| `@genicui/react` | `@genicui/client/react` (subpath) | Framework shim, not separate package |
| `@genicui/vue` | `@genicui/client/vue` (subpath) | Framework shim, not separate package |
| `@genicui/svelte` | `@genicui/client/svelte` (subpath) | Framework shim, not separate package |
| `@genicui/solid` | `@genicui/client/solid` (subpath) | Framework shim, not separate package |
| `@genicui/server-nitro` | `@genicui/server/nitro` (subpath) | Server binding, not separate package |
| `@genicui/server-fastify` | `@genicui/server/fastify` (subpath) | Server binding, not separate package |
| `@genicui/server-next` | `@genicui/server/next` (subpath) | Server binding, not separate package |
| `@genicui/server-sveltekit` | `@genicui/server/sveltekit` (subpath) | Server binding, not separate package |
| `@genicui/server-hono` | `@genicui/server/hono` (subpath) | Server binding, not separate package |
| `@genicui/server-express` | `@genicui/server/express` (subpath) | Server binding, not separate package |
| `@genicui-primevue/registry` | `@genicul-primevue/registry` (separate) | User-choice dependency |
| `@genicui-flowbite/registry` | `@genicul-flowbite/registry` (separate) | User-choice dependency |

**Net result:** 12 proposed packages → 3 core packages + N registries.

---

## Summary

| Question | Answer |
|---|---|
| Need separate packages for each framework shim? | **No.** Use subpath exports inside 3 packages |
| Need separate packages for each framework binding? | **No.** Subpath exports in `@genicui/server` |
| Need separate packages for component registries? | **Yes.** Each registry is a separate package |
| Day-1 package count | **3** (core, server, client) + community registries |
| When to split subpath into package | Bundle size, independent versioning, or new maintainer |
| Naming convention | `@genicui/*` for core, `@genicul-<lib>/registry` for community registries |