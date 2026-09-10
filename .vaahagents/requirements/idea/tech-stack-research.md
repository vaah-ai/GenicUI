---
title: GenicUI Tech Stack Research — 3 Options Deep Dive
description: Detailed analysis of 3 candidate tech stacks for GenicUI (Node + tRPC, Bun + Elysia, Cloudflare Workers + Durable Objects) with rationale, trade-offs, and suitability scoring
audience: Engineering leads, framework architects
date: 2026-09-01
---

# GenicUI Tech Stack Research

> **Goal:** Pick a tech stack for GenicUI — an open-source generative agentic UI framework that must be **agent-agnostic** (Anthropic/OpenAI/MCP/LangGraph), **UI-framework-agnostic** (PrimeVue/ShadCN/Skeleton/etc.), **scalable + fast** (streaming, partial updates, multi-turn), **library-quality OSS**, and **developer-friendly** (schema-as-source-of-truth, thin adaptors, easy debugging).
>
> **Background:** GenicUI wraps existing components with a standardized schema + event bridge. It exposes components to LLM agents via an MCP server. It renders components in a "conversation surface" (chat + embedded UI), supports live prop updates via SSE/WebSocket, and exposes component state for voice commands.

---

## Executive Summary

Three stack options were evaluated. All score 7-8/10. The framework should ship **Stack B (Bun + Elysia + TypeBox + WebSocket)** as the primary recommendation in docs and offer **Stack C (Cloudflare Workers + Durable Objects)** as a one-click deploy template via `wrangler`. Stack A (Node + tRPC) is best relegated to an `examples/node-host` because its audience is already comfortable wiring things up themselves.

**The biggest unresolved design decision is the UI wrapper layer** — the custom-element-underneath approach (Stack B) is the most portable but most contentious; the framework-coupled direct-wrap approach (Stack A) is the most ergonomic but most fragile. This is the architectural call to make before picking the final stack.

---

## Table of Contents

1. [Stack A: Node.js + tRPC + Zod + Hono + SSE](#stack-a)
2. [Stack B: Bun + Elysia + TypeBox + WebSocket](#stack-b)
3. [Stack C: Cloudflare Workers + Durable Objects + MCP-on-Workers](#stack-c)
4. [Comparison Matrix](#comparison-matrix)
5. [Recommendation](#recommendation)

---

<a id="stack-a"></a>
## Stack A: Node.js 20 LTS + TypeScript 5.6 + tRPC v11 + Zod 3 + Hono on Node SSE

**Suitability Score: 7/10** — Conservative mainstream choice that maximizes addressable audience for an OSS library.

### Stack Composition
| Layer | Choice |
|---|---|
| Runtime | Node.js 20 LTS |
| Language | TypeScript 5.6 |
| RPC | tRPC v11 |
| Validation | Zod 3 |
| HTTP framework | Hono |
| Transport | Server-Sent Events (SSE) |
| UI wrapper | `defineComponent(schema)` factory (Vue SFC / React FC / Svelte component) |
| State flow | Per-session Node.js `events.EventEmitter` |
| Testing | Vitest, `@playwright/test` |
| Build | `tsx` (dev), `tsup` (ESM/CJS dual-package) |
| Versioning | `changesets` |

### Rationale
- **Node.js 20 LTS is the runtime every JS/TS developer already has installed**, every CI system supports, and every doc snippet runs on
- **tRPC v11 gives end-to-end type safety** from MCP server → host → UI wrapper without a codegen step — matches the "schema as source of truth" DX requirement
- **Zod 3 is the de-facto validation library** and pairs with `zod-to-json-schema` to produce MCP-compatible JSON Schemas for Claude, OpenAI, and any LangGraph tool-calling agent that consumes tool definitions
- **Hono as the HTTP layer is framework-agnostic** and runs identically on Node, Bun, Deno, Cloudflare Workers, and Vercel Edge — same MCP server artifact deployable across runtimes without rewrites
- **SSE is sufficient for streaming component prop updates** because GenicUI emits small JSON deltas, not binary frames
- **SSE has automatic reconnect, native HTTP/1.1 proxy support, and EventSource compatibility in browsers**

### UI Wrapper Pattern
```ts
// Thin factory that takes any framework component and returns a GenicUI component
defineComponent({
  id: 'CartViewer',
  schema: z.object({ cartId: z.string() }),
  events: z.object({ removeItem: z.object({ itemId: z.string() }) }),
  frameworks: {
    vue: CartViewerVue,
    react: CartViewerReact,
    svelte: CartViewerSvelte,
  },
});
```

### Trade-offs

#### Cons
1. **SSE 6-connection limit per browser tab to same origin (HTTP/1.1)** — real-world issue for multi-tab GenicUI hosts that need many parallel component update streams; mitigated by HTTP/2 multiplexing but requires explicit reverse-proxy config
2. **Node.js cold-start on serverless platforms (Lambda, Vercel Serverless) is 200-400ms** — kills "low latency" claim for first-request streaming; mitigated by keeping Node server long-lived (Fly, Railway) or moving to Bun/Workers
3. **tRPC is server-coupled and leaks its RPC metaphor into client code** — for a library whose primary surface is JSON-RPC over MCP, this is a conceptual mismatch that requires an adapter layer to convert tRPC procedures into MCP tools
4. **The "one wrapper per framework" adapter approach multiplies maintenance surface** — every Vue/React/Svelte major bump risks a wrapper rewrite; this is the deepest structural risk
5. **Zod 3 vs Zod 4 fragmentation** — ecosystem is mid-migration to Zod 4 (faster, smaller); pinning to Zod 3 in 2026 means shipping a deprecated dep, while Zod 4 still has rough edges in some adapter libs
6. **Hono-on-Node is fine but rarely chosen in 2026** — devs expect Hono to imply edge runtime, so positioning confuses the market

### Strengths
- ✅ Broadest addressable audience
- ✅ Lowest first-install friction
- ✅ Largest contributor muscle memory
- ✅ Mature, stable dependencies

---

<a id="stack-b"></a>
## Stack B: Bun 1.2 + Elysia 1.x + TypeBox + ws (Bun native WebSocket) + Vite 6

**Suitability Score: 8/10** — Modern fast-iteration choice built for the agent + streaming use case.

### Stack Composition
| Layer | Choice |
|---|---|
| Runtime | Bun 1.2 |
| Language | TypeScript 5.6 |
| Framework | Elysia 1.x |
| Validation | TypeBox (first-class Elysia integration) |
| Transport | WebSocket (Bun native) |
| UI wrapper | Web Components (custom elements) + framework shims |
| State flow | Typed `Channel<TState>` abstraction (MobX-like proxy) |
| Build | `tsup` |
| Testing | Bun's built-in test runner + `happy-dom` |
| Lint/format | `biome` |
| Dev | Vite 6 via `bun --bun vite` |

### Rationale
- **Bun 1.2's native WebSocket, built-in SQLite, built-in `Bun.serve()`, and 3x faster cold-start than Node** make it the natural runtime for a "live, streaming, partial-update-heavy" framework
- **Elysia 1.x ships first-class TypeBox integration** — `t.Object(...)` → `validator` → typed `Context`. **Cleanest schema-as-source-of-truth story** in any JS framework: a single TypeBox schema becomes:
  1. The MCP tool definition
  2. The SSE event validator
  3. The tRPC-like typed client contract
  4. The runtime validation

  …with zero serialization between them.
- **WebSocket is the right transport** because GenicUI needs bidirectional state flow: agent → component prop updates AND component → agent event emissions; SSE is unidirectional and would force two parallel connections (one SSE down, one HTTP POST up), which is a known footgun
- **Bun's native `ws` upgrade + Elysia's `ws()` plugin gives full-duplex over a single connection** with multiplexed channels (one socket per conversation, many component streams inside)
- **Vite 6 is the only realistic choice for dev/HMR** regardless of stack, and works perfectly with Bun via `bun --bun vite`
- **Web Components (custom elements) as the lowest-common-denominator render target**, then thin framework shims wrap them into Vue/React/Svelte native ergonomics — more portable than direct SFC/FC wrapping and survives framework version bumps better

### UI Wrapper Pattern
```ts
// Web Component defined once, framework-agnostic
class GenicUIElement extends HTMLElement {
  static schema = Type.Object({ cartId: Type.String() });
  static events = Type.Object({ removeItem: Type.Object({ itemId: Type.String() }) });
  // ...lifecycle, prop diffing, event emission
}
customElements.define('genic-cart-viewer', GenicUIElement);

// Vue shim
export const CartViewer = defineComponent({
  props: { cartId: String },
  setup(props) {
    return () => h('genic-cart-viewer', { cartId: props.cartId });
  },
});
```

### Trade-offs

#### Cons
1. **Bun is production-stable but still has rough edges with native npm packages** (Prisma, sharp, some ML libs) — GenicUI itself probably doesn't need those, but consumers installing GenicUI into a project that does will hit friction
2. **WebSocket over reverse proxy (nginx, Cloudflare proxy, corporate firewalls) is notoriously fragile** — many enterprise networks strip or hang WS upgrades; an HTTP/2 + WebTransport future-proofing path is needed but WebTransport isn't in Safari stable yet
3. **Custom Elements as the lowest render target means GenicUI cannot take advantage of framework-native optimizations** (Vue reactivity, React concurrent mode, Svelte compiled output) — every prop update triggers a re-render of the whole custom element unless we manually implement a reconciler, which is non-trivial
4. **TypeBox is less widely known than Zod**, shrinking the contributor pool and increasing onboarding docs burden; Zod 4 is closing the perf gap, weakening TypeBox's main 2024-2025 selling point
5. **Bun's WebSocket implementation differs from Node's `ws` package** in subtle ways (per-message deflate, subprotocol negotiation); any cross-runtime library code has to abstract these carefully
6. **"Use Web Components underneath" decision is contentious** and may alienate Vue/React/Svelte purists who expect their idioms to be first-class, not wrapped

### Strengths
- ✅ Fastest cold-start (3x Node)
- ✅ Cleanest schema-as-source-of-truth (TypeBox)
- ✅ Best transport fit (WebSocket for bidirectional state)
- ✅ Most portable wrapper layer (Web Components survive framework bumps)
- ✅ Polished dev experience (Vite + Bun)
- ✅ "This is a 2026 framework for 2026 agents" positioning

---

<a id="stack-c"></a>
## Stack C: Cloudflare Workers + Durable Objects + @modelcontextprotocol/sdk on Workers + Hono + Zod

**Suitability Score: 8/10** — Edge-first choice that turns GenicUI's distributed-conversation nature into a deployment primitive rather than a deployment problem.

### Stack Composition
| Layer | Choice |
|---|---|
| Runtime | Cloudflare Workers |
| State | Durable Objects (DO) with hibernation + SQLite-backed storage |
| MCP transport | `@modelcontextprotocol/sdk` Workers-compatible transport |
| HTTP framework | Hono |
| Validation | Zod (Workers ecosystem standard) |
| Transport | Cloudflare Realtime (parties) for UI fan-out + DO WebSocket for agent channel |
| UI host | Pages + Vite for dev; any frontend on Cloudflare Pages or Workers Static Assets |
| Dev server | `wrangler dev` with DO local emulation via `workerd` |
| Testing | Vitest with `@cloudflare/vitest-pool-workers`; Miniflare for offline; Playwright for e2e |

### Rationale
- **Each conversation session maps to a Durable Object (DO)** — gives GenicUI single-writer-per-session semantics for free — exactly the right model for multi-turn agent conversations where in-flight state mutations from prop updates, event emissions, and tool calls must serialize
- **DOs provide hibernation** — conversation can pause for hours while user thinks, then resume with zero cold-start
- **WebSocket Hibernation API** — inbound WS events wake the DO only when needed, and the agent → UI stream persists across disconnects
- **SQLite-backed storage (built-in as of late 2024)** for conversation history
- **`@modelcontextprotocol/sdk` ships Workers-compatible transport**; the `agents` reference pattern from Cloudflare's open-source agent SDKs (`agents/mcp`) is purpose-built for exactly this shape: MCP server as a Worker, sessions as DOs, streaming via DO WebSocket
- **One-line deploy:** `wrangler deploy` gives GenicUI a deployable one-liner that no other stack matches

### Architecture Pattern
```
Each conversation = one Durable Object
  ├── Single-writer semantics (no race conditions)
  ├── SQLite-backed history
  ├── WebSocket Hibernation API (resume from anywhere)
  ├── Subscribes to agent MCP tool calls
  ├── Fans out component updates via Cloudflare Realtime (parties)
  └── Auto-pause via hibernation when user idle
```

### Trade-offs

#### Cons
1. **Vendor lock-in to Cloudflare is severe** — Durable Objects, Hibernation API, Realtime, and SQLite-in-DO are Cloudflare-only primitives; if GenicUI becomes popular, the community will demand a Node/Bun fallback and we'll have to reimplement DO semantics (single-writer, hibernation, WS-resume) — effectively building our own actor runtime
2. **Workers CPU-time limit (30s on paid, 10s on free) caps the complexity of a single agent tool call** — long-running agent loops (LangGraph reAct with 20+ steps) need chunked execution across requests, which the DO can do but adds non-trivial orchestration code
3. **Zod-on-Workers works but bundle size matters** (Workers have 1MB compressed limit on free, 10MB on paid); shipping Zod 3 + MCP SDK + agent adapters must stay under budget; constrains how much adapter we can bundle
4. **`agents/mcp` reference pattern is great but labeled experimental by Cloudflare** — building GenicUI's core abstraction on top of it means accepting that breaking changes can come from below at any time
5. **Local development story is acceptable (`wrangler dev`) but noticeably worse than `vite dev` or `bun --hot`** — DO local emulation has known bugs around WebSocket hibernation, and iteration loop on edge code is slower than on long-lived Node/Bun servers
6. **Cost model surprises** — Durable Objects bill per-request AND per-GB-second of storage; conversation-heavy app can rack up DO costs quickly, and users will blame GenicUI's docs/positioning rather than Cloudflare's pricing

### Strengths
- ✅ Best-in-class state model for multi-turn conversations (single-writer DO)
- ✅ Zero cold-start resume (hibernation)
- ✅ Edge-first deployment
- ✅ One-line deploy (`wrangler deploy`)
- ✅ Per-session persistence for free
- ✅ Cloudflare Realtime for one-to-many UI fan-out

---

## Comparison Matrix

| Dimension | Stack A (Node + tRPC) | Stack B (Bun + Elysia) | Stack C (Workers + DO) |
|---|---|---|---|
| **Cold start** | 200-400ms (Node) | ~50ms (Bun) | <10ms (Workers) |
| **Resume from pause** | Manual | Manual | Native (hibernation) |
| **State model** | Stateless + external DB | Stateless + external DB | Per-session DO (single-writer) |
| **Type safety** | Strong (tRPC + Zod) | Strongest (TypeBox + Elysia) | Strong (Zod + Hono) |
| **Schema-as-source-of-truth** | Good | **Best** | Good |
| **Schema → JSON Schema** | Zod-to-JSON-Schema (manual) | TypeBox native | Zod-to-JSON-Schema (manual) |
| **Transport** | SSE (HTTP/1.1 issues) | WebSocket (bidirectional) | WebSocket + Realtime |
| **Multi-tab concern** | SSE 6-conn limit | WebSocket: native multiplexing | DO: one per session |
| **Wrapper layer** | Framework-coupled | Web Components (portable) | Iframe or Web Components |
| **Vendor lock-in** | None | None | **Severe** (Cloudflare-only primitives) |
| **Self-host requirement** | Required | Required | Optional (edge-first) |
| **Dev iteration speed** | Fastest (`tsx`/`vite`) | Fast (Bun + Vite) | Slower (`wrangler dev` + DO emulation bugs) |
| **Bundle size constraint** | None | None | **1-10MB compressed** |
| **OSS positioning** | Familiar | Novel | Polarizing |
| **Contributor pool size** | **Largest** | Medium | Smallest |
| **Score** | 7/10 | **8/10** | 8/10 |

---

## Recommendation

### Primary Recommendation: **Stack B (Bun + Elysia + TypeBox + WebSocket)**

**Rationale:**
- Best fit for the streaming + bidirectional state use case
- Cleanest schema-as-source-of-truth story
- Fastest cold-start without vendor lock-in
- Web Components underneath → most portable wrapper layer
- "2026 framework for 2026 agents" positioning

### Deploy Template: **Stack C (Cloudflare Workers + Durable Objects)**

**Rationale:**
- One-line deploy (`wrangler deploy`) lowers adoption friction
- Per-session DO = ideal state model for multi-turn conversations
- Ship as `wrangler init genicui-app --template genicui/cloudflare`
- Acknowledge vendor lock-in clearly; provide Stack B fallback in docs

### Legacy Backstop: **Stack A (Node + tRPC)**

**Rationale:**
- Largest contributor pool, broadest audience
- Ship as `examples/node-host/` for legacy adopters
- Not the primary recommendation; clear positioning avoids confusing the market (Hono-on-Node is rare in 2026)

### Open Architectural Decision: UI Wrapper Layer

Before finalizing, the team must decide:

| Wrapper Strategy | Pros | Cons | Pairs With |
|---|---|---|---|
| **Web Components underneath + framework shims** | Most portable; survives framework bumps; clean abstraction | Manual reconciler; loses framework-native optimizations; may alienate purists | Stack B |
| **Framework-coupled direct wrap (per-framework SFC/FC)** | Most ergonomic in each idiom | Highest maintenance (one wrapper per major bump); multiplicative effort | Stack A |
| **Iframe-sandboxed widgets (MCP Apps style)** | Maximum isolation; standard-compliant with SEP-1865; lost native DOM access | Iframe overhead; postMessage complexity; not "library-agnostic" in host DOM sense | Stack C |

**Recommended:** Web Components underneath + framework shims (Stack B pairing), with an iframe adapter as an MCP Apps compatibility layer.

### Next Steps
1. Decide wrapper strategy
2. Pick Stack B as primary; ship Stack C as `wrangler` template
3. Build PoC validation:
   - 5 components in 3 frameworks (Vue/React/Svelte)
   - One MCP tool working end-to-end (`render_component`)
   - One streaming pattern validated (`update_component`)
4. Then proceed to feature planning and full implementation
