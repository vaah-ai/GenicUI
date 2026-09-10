# GenicUI — Developer Experience (DX) Design

This doc captures how a developer installs GenicUI, writes components for it, and wires it to an AI agent. It's written from the perspective of someone using the framework in a real project — not from the framework's internals.

If you want to know "what does GenicUI feel like to use?", read this. If you want to know "how is GenicUI built?", read [architecture.md](./architecture.md) and [four-agnostic.md](./four-agnostic.md) instead.

---

## The positioning

GenicUI is a **generative agentic UI framework** that installs into any AI project to:

1. **Render custom UI components** driven by an AI agent
2. **Bridge the agent's decisions to the user's interface** so components and conversation stay in sync

The framework is:

- **Journey-agnostic** — works for any conversational flow (ecommerce, support, ops, etc.)
- **Component-agnostic** — components are the unit of UI, agents choose what to render
- **Library-agnostic** — wraps Vue/React/Svelte/vanilla components from any library
- **Agent-agnostic** — works with any MCP-capable agent (Claude Code, GPT, custom)

This doc focuses on DX. The "what" and "why" of the contract surface lives in [four-agnostic.md](./four-agnostic.md). The "what we learned building it" lives in [lessons-learned.md](./lessons-learned.md).

---

## The three personas

DX has to be good for three distinct developers, because they show up at the framework from different directions:

### 1. Framework consumer

**Who they are:** Developer with an existing AI project (Next.js + Vercel AI SDK, Nuxt + custom backend, Claude Code workflow, FastAPI + React). They want to add generative UI without rewriting their stack.

**What they care about:**
- Does `npm install` actually work, or do they need to fight their package manager?
- Will GenicUI fight with Next.js / Nuxt / Vite conventions or respect them?
- Can they get a working demo in under 30 seconds?
- Can they swap GenicUI out later if they want?

**What they don't care about:**
- The MCP protocol details
- How the SSE stream is implemented
- What the broadcaster does

### 2. Component author

**Who they are:** Developer building UI components for GenicUI to expose to agents. They have library expertise (PrimeVue, ShadCN, Flowbite, etc.) and want their components to be usable by AI agents.

**What they care about:**
- Can they use their existing component library as-is?
- Can they declare the component's contract (props, actions, state) in one place?
- Does the TypeScript stay in sync with the schema?
- Can they hot-reload and see the agent's behavior change?

**What they don't care about:**
- How the agent discovers components
- Where state is stored
- How transport works

### 3. Agent author

**Who they are:** Developer wiring an AI agent to use GenicUI components. They have an MCP-capable agent (Claude Code, GPT via function calling, custom HTTP endpoint) and want it to render UI.

**What they care about:**
- Do standard MCP tools work?
- Can the agent discover components without manual config?
- Is the agent's reasoning trace observable?

**What they don't care about:**
- How the framework renders components on the frontend
- Which frontend library is used
- Where state lives

---

## The three horizons

DX also varies across time:

| Horizon | Goal | Failure mode |
|---|---|---|
| **Install** (first 5 min) | Working demo from a single command | "I can't even get past `npm install`" |
| **Day-one** (first session) | Wire their actual stack and components | "I got the demo working but can't customize it" |
| **Long-term** (weeks/months) | Scales, migrates, composes | "I'm stuck on a bug I can't debug" |

If you fail at install or day-one for the framework consumer, no other DX investment matters.

---

## Install: the single biggest lever

The single most important DX investment is making `npm install` + one command get a developer to a working demo in under 30 seconds. This collapses the current PoC's 5-process setup (Python static server + Node MCP server + WebSocket bridge + agent + browser) into one.

### The two install shapes

GenicUI supports both install shapes, converging on the same `genicui.config.ts` once installed:

**Shape A: scaffold a new app** — `create-genicui-app` for new projects
```bash
npx create-genicui-app my-app
cd my-app
npm run dev
```
At this point: chat UI is live, sample component renders, sample agent responds. The developer can poke around before committing to anything.

**Shape B: drop into existing app** — `npm install genicui` for existing projects
```bash
npm install genicui
# Add one line to nuxt.config.ts or app/layout.tsx (see per-framework sections below)
npm run dev
```
At this point: their existing app keeps working, GenicUI's chat surface is mounted, ready to use.

This is the same dual install shape Next.js uses (`create-next-app` for new projects, `npm install next` for existing ones). It works because the framework has a strong default that's also flexible.

### The 5-line minimum

Regardless of host framework, the absolute minimum is:

1. Install the package
2. Add GenicUI to the host config (1-5 lines depending on framework)
3. Add one component (either from the registry or custom)
4. Run the dev server
5. Open the chat surface in a browser

That's it. Five steps, ~10 lines of config total, working demo.

---

## Day-one: wiring the actual stack

After the demo works, the developer needs to swap in their actual stack. Each swap is independent — they can stop at any step and have a working system.

### Step 1: Replace the sample agent

The demo agent is whatever GenicUI ships for testing. The developer replaces it with their real agent via `genicui.config.ts`:

```ts
export default {
  agent: {
    // Option A: local Claude Code subprocess (most common)
    kind: 'claude-code',
    mcpConfig: '.mcp.json',
  },

  // Option B: HTTP endpoint
  // kind: 'http',
  // endpoint: 'https://my-agent.example.com/run',
  // auth: { bearer: process.env.MY_AGENT_TOKEN },

  // Option C: custom Nuxt server route you control
  // kind: 'custom',
  // module: './server/my-agent',
};
```

The agent protocol is MCP. Any MCP-capable agent works without GenicUI-specific glue.

### Step 2: Replace the sample component

Sample components are useful for demo but useless in production. The developer either writes their own (see "Authoring components" below) or installs from the registry:

```bash
npx genicui add @genicui/cart-viewer
npx genicui add @genicui/product-grid
npx genicui add @genicui/checkout-form
```

Each `add` command installs a component as a local file (not a runtime dependency) — same model as `shadcn add`. The component is fully editable, fully owned. Registry components are starting points, not lock-in.

### Step 3: Customize

After replacing the agent and components, the developer customizes:
- Component schemas (props, actions, hasSubmit)
- Component rendering (using their library of choice)
- Chat surface placement (auto-injected or manually placed)
- Agent prompt fragments (auto-generated from schemas, but overridable)

Each of these is a one-file change. Nothing requires touching GenicUI's internals.

---

## Authoring components

This is the most important DX for the component author persona. The contract has to be: **write a Vue or React component using your existing library, declare its contract in one place, done.**

### The shape: schema-as-source-of-truth

The component author writes ONE declaration. The framework generates four outputs:

```ts
defineSchema({
  props: {
    cartId: { type: 'string', required: true },
    showRemoveButton: { type: 'boolean', default: true },
  },
  actions: ['removeItem', 'applyCoupon'],
  hasSubmit: true,
});
```

**Outputs:**
1. **TypeScript types** — `export type CartViewerProps = { cartId: string; showRemoveButton?: boolean }`
2. **MCP tool definition** — `{ name: 'render_component', inputSchema: { properties: { componentName: { const: 'CartViewer' }, props: { ... } } } }`
3. **Agent prompt fragment** — `"CartViewer: displays a shopping cart. Props: cartId (required). Actions: removeItem, applyCoupon. Has Submit button."`
4. **Runtime registry entry** — wires the component into the framework's mount/unmount lifecycle

The schema is the contract. TypeScript types, MCP tools, agent prompts, and runtime behavior all derive from it. No drift. No manual sync.

### Nuxt + PrimeVue example

```vue
<!-- components/genicui/CartViewer.vue -->
<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { defineSchema, emitAction } from 'genicui';

const props = defineProps<{
  cartId: string;
  showRemoveButton?: boolean;
}>();

defineSchema({
  props: {
    cartId: { type: 'string', required: true },
    showRemoveButton: { type: 'boolean', default: true },
  },
  actions: ['removeItem', 'applyCoupon'],
  hasSubmit: true,
});

function handleRemove(itemId: string) {
  emitAction('removeItem', { cartId: props.cartId, itemId });
}
</script>

<template>
  <DataTable :value="items">
    <Column field="name" header="Item" />
    <Column field="qty" header="Qty" />
    <Column field="price" header="Price" />
    <Column header="">
      <template #body="{ data }">
        <Button
          v-if="showRemoveButton"
          icon="pi pi-trash"
          severity="danger"
          @click="handleRemove(data.id)"
        />
      </template>
    </Column>
  </DataTable>
</template>
```

What the component author writes:
- A normal Vue SFC with PrimeVue components
- A `defineSchema` call declaring props, actions, and hasSubmit
- Click handlers that call `emitAction` to send interactions back to the agent

What GenicUI generates:
- TypeScript types from the schema
- MCP tool definitions
- Agent prompt fragments
- Runtime registration

What GenicUI does NOT touch:
- The component's visual design
- The component's internal state
- The component's data fetching logic

### Next.js + Flowbite example

```tsx
// components/genicui/cart-viewer.tsx
'use client';
import { Table, Button } from 'flowbite-react';
import { defineSchema, useAction } from 'genicui';

type Props = {
  cartId: string;
  showRemoveButton?: boolean;
};

defineSchema<Props>({
  props: {
    cartId: { type: 'string', required: true },
    showRemoveButton: { type: 'boolean', default: true },
  },
  actions: ['removeItem', 'applyCoupon'],
  hasSubmit: true,
});

export function CartViewer({ cartId, showRemoveButton = true }: Props) {
  const emit = useAction();

  return (
    <Table>
      <Table.Head>
        <Table.HeadCell>Item</Table.HeadCell>
        <Table.HeadCell>Qty</Table.HeadCell>
        <Table.HeadCell>Price</Table.HeadCell>
        <Table.HeadCell></Table.HeadCell>
      </Table.Head>
      <Table.Body>
        {items.map((item) => (
          <Table.Row key={item.id}>
            <Table.Cell>{item.name}</Table.Cell>
            <Table.Cell>{item.qty}</Table.Cell>
            <Table.Cell>${item.price.toFixed(2)}</Table.Cell>
            <Table.Cell>
              {showRemoveButton && (
                <Button color="failure" onClick={() => emit('removeItem', { cartId, itemId: item.id })}>
                  Remove
                </Button>
              )}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
```

Same schema. Same actions. Same contract. The only differences are the framework's component syntax (`.vue` vs `.tsx`) and the underlying library (PrimeVue vs Flowbite).

### What the component author never touches

- The SSE implementation
- The broadcaster / event queue
- The chat surface rendering
- The MCP server (GenicUI provides it)
- The agent's system prompt construction (GenicUI generates it from schemas)

The component is a normal Vue/React component in their existing project. GenicUI's role is invisible until something needs the agent.

---

## The chat surface

The chat surface is where the user types messages and the agent renders components. GenicUI provides it as a drop-in component (React) or auto-injected route (Nuxt). Developers can:

- **Use it as-is** — `<ChatSurface />` in React, or `/genicui` route in Nuxt
- **Embed it in existing layouts** — drop the component into their own page
- **Rebuild it from primitives** — GenicUI ships `<MessageList>`, `<MessageInput>`, `<ComponentRenderer>` for full customization

The third option is important for apps that already have a chat UI. GenicUI doesn't force a design — it provides the transport and the rendering primitives, the developer owns the visual.

### Default placement

**Nuxt:** auto-injected at `/genicui` route, or `<ChatSurface>` component for custom placement.

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>My Ecommerce Site</h1>
    <ChatSurface />
  </div>
</template>
```

**Next.js:** `<ChatSurface>` component placed wherever they want.

```tsx
// app/chat/page.tsx
import { ChatSurface } from 'genicui/nextjs';

export default function ChatPage() {
  return <ChatSurface />;
}
```

Both share the same props API (`sessionId`, `onAction`, `components`) and the same internal event model.

---

## Per-framework install paths

The framework-specific differences are concentrated in ONE file: the adapter. Everything else (component authoring, schema, agent integration) is framework-agnostic.

### Nuxt + PrimeVue

```bash
npm install genicui @primevue/nuxt-module primevue
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@primevue/nuxt-module',
    'genicui/nuxt',
  ],
  primevue: {
    options: { theme: { preset: Aura } },
  },
  genicui: {
    agent: { kind: 'claude-code', mcpConfig: '.mcp.json' },
    components: '~/components/genicui',
  },
});
```

The `genicui/nuxt` module:
- Registers server routes under `/api/genicui/*`
- Auto-imports composables (`useAction`, `useChatSession`)
- Watches `~/components/genicui/` for hot-reload
- Injects `<ChatSurface>` as an auto-imported component

### Next.js + Flowbite

```bash
npm install genicui flowbite flowbite-react
```

```tsx
// app/layout.tsx
import { GenicuiProvider } from 'genicui/nextjs';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GenicuiProvider
          agent={{ kind: 'claude-code', mcpConfig: '.mcp.json' }}
          components="./components/genicui"
        >
          {children}
        </GenicuiProvider>
      </body>
    </html>
  );
}
```

The `GenicuiProvider`:
- Opens the SSE connection
- Provides React context for `useAction`, `useChatSession`, `useComponentState`
- Auto-loads components from the configured directory
- Manages session lifecycle

### Side-by-side: what changes vs. what stays the same

| Aspect | Nuxt + PrimeVue | Next.js + Flowbite |
|---|---|---|
| **Package** | `genicui` | `genicui` |
| **Adapter entry** | Nuxt module in `nuxt.config.ts` | `<GenicuiProvider>` in root layout |
| **Component style** | `.vue` SFC | `.tsx` function component |
| **Action API** | `emitAction('addToCart', {...})` | `const emit = useAction(); emit('addToCart', {...})` |
| **Schema declaration** | `defineSchema({...})` inside `<script setup>` | `defineSchema<Props>({...})` at module top-level |
| **Chat surface** | Auto-injected at `/genicui` or `<ChatSurface>` | `<ChatSurface />` component |
| **Hot reload** | Nuxt HMR | Next.js Fast Refresh |
| **Server routes** | Module registers `/api/genicui/*` | Route Handlers under `/api/genicui/*` |
| **Auto-imports** | Nuxt's auto-import system | React context |

What stays the same:
- Schema declaration shape (`defineSchema`)
- Action emission contract (`emit('action', payload)`)
- MCP tool definitions exposed to the agent
- Component lifecycle (mount, update, unmount, summarize)
- Submission flow (Submit button + `summarize`)
- Storage model (browser state + session store)

The component author writes the same code. The agent author sees the same MCP tools. Only the framework's adapter file is different.

---

## The agent's view

From the agent's perspective, GenicUI looks like any other MCP server:

```json
{
  "mcpServers": {
    "genicui": {
      "command": "npx",
      "args": ["genicui", "mcp"]
    }
  }
}
```

Once pointed at GenicUI, the agent gets these MCP tools:

| Tool | Purpose |
|---|---|
| `find_ui_component(query)` | Semantic search over the component registry |
| `render_component(name, props)` | Render a component in the chat surface |
| `update_component(id, partialProps)` | Live-update a mounted component's props |
| `unmount_component(id)` | Remove a component from the chat surface |
| `get_component_state(id)` | Read a component's current state |
| `subscribe_to_events(filter)` | Subscribe to a filtered stream of component events |

The agent's system prompt is auto-augmented with a description of each available component, generated from their schemas:

```
You have access to the following UI components via the GenicUI MCP server:

CartViewer — displays a shopping cart with line items.
  Props: cartId (required string), showRemoveButton (boolean, default true)
  Actions: removeItem({cartId, itemId}), applyCoupon({cartId, code})
  Has Submit button.

DrillCard — displays a single product card with image and price.
  Props: productId (required string), name (required string), price (required number), imageUrl (string)
  Actions: addToCart({productId, quantity}), viewDetails({productId})
  No Submit button.
```

The agent decides what to render based on the user's request. No GenicUI-specific protocol to learn — just standard MCP.

---

## Debugging DX

When something breaks, the developer needs to see what happened. Today's debugging path (tail Node logs, correlate SSE events with browser state manually) is the #1 developer complaint in adjacent frameworks.

GenicUI ships a dev-mode browser panel:

- **Live SSE events** — color-coded by type (`ai_text`, `tool_call`, `component_rendered`, etc.)
- **Mounted components** — current state, props, last action fired
- **Agent turn timeline** — which turns happened, which components rendered, which actions fired, response times
- **Click-to-inspect** — any event shows the full payload; any component shows its history
- **Filter by component, event type, or session** — find the thing you care about

Access via `<ChatSurface devtools>` prop or keyboard shortcut. Production builds strip the devtools entirely.

---

## What GenicUI does NOT do

The framework has clear boundaries. Knowing what's NOT in scope is part of good DX:

- **No opinion on the chat surface design.** The default is functional, not pretty. Developers customize or rebuild.
- **No hosted service.** Local-first; deploy where you want.
- **No agent framework lock-in.** MCP is the only requirement. Any MCP-capable agent works.
- **No component library lock-in.** Vue or React, PrimeVue or ShadCN or vanilla — the framework adapts.
- **No custom IDE.** Use browser devtools and VSCode. Don't expect GenicUI-specific tooling beyond the dev panel.
- **No state management library.** Browser state is browser state; session state is a Map; component authors can use Pinia/Zustand/whatever inside their components.

These are explicit choices. Each "not in scope" item is a deliberate decision to let the developer choose.

---

## Comparison with adjacent frameworks

| Aspect | GenicUI | CopilotKit | Vercel AI SDK | LangChain |
|---|---|---|---|---|
| Install | Single package, one config line | Heavier setup | Lightweight | Heavy, opinionated |
| Frontend lock-in | None (Vue/React/Svelte) | React only | React + Next.js | None |
| Agent lock-in | MCP only (any agent) | Specific agent frameworks | Vercel AI SDK agents | LangChain-specific |
| Component model | Schema-as-source-of-truth | Wraps React components | UI stream protocol | None |
| Component library | Any (PrimeVue, Flowbite, etc.) | Limited | Any | Any |
| Eject-ability | High (one package, replaceable) | Medium | Medium (Vercel deploy) | Low |
| Component authoring | `defineSchema({...})` + render | HOC + render | Tool + UI mapping | N/A |

The standout property: **you can use GenicUI with your existing component library without forking it**. PrimeVue components stay PrimeVue components. ShadCN components stay ShadCN. GenicUI is the bridge, not the substrate.

---

## Long-term DX

The install and day-one DX investments are the most visible. Long-term DX is about not painting developers into corners.

### Component registry

```bash
npx genicui add @genicui/cart-viewer
```

Registry components are installed as local files (not runtime deps) — like `shadcn add`. Developers can edit, fork, or delete them freely. Registry = starting point, not lock-in.

### Migrations

When the GenicUI contract version bumps, `npx genicui migrate` upgrades user code automatically:

```bash
npx genicui migrate
# → reads genicui.config.ts
# → diffs against current schema
# → applies codemod transformations
# → reports changes
```

Like `next/codemod`. The framework takes responsibility for keeping user code current.

### Observability

Optional, opt-in. Tracks:
- Which components were rendered (count, frequency)
- How long each component lived (mount to unmount)
- User interactions per component (clicks, submits)
- Error rates (failed renders, action errors)
- Agent turn durations

Output to console, OpenTelemetry, or a hosted dashboard (if they opt in). Local-first, never required.

### Type safety end-to-end

If the agent calls `render_component("CartViewer", { cartId: 123 })` with the wrong type, the runtime catches it before render. Errors at the boundary, not deep inside the component tree.

The schema is the type system. TypeScript types, runtime validation, MCP tool definitions — all derived from one declaration.

---

## What we'd do differently if starting over

A few things we'd change in hindsight:

- **Build the schema DSL first, not the chat surface.** The schema is the contract that everything else depends on. We built the chat surface first because it was visible, but the schema is what makes the framework composable.
- **MCP from day one.** Using MCP (not a custom protocol) was right from the first commit — it gave us agent-agnosticism for free. Worth doubling down.
- **Devtools earlier.** The #1 dev complaint in the PoC was "I can't see what the agent is doing." Devtools should have been Phase 1, not Phase 5.
- **Single-process dev sooner.** The current 5-process PoC setup was the #1 install friction. Single Node process should have been the rule from day one.

These are tracked in [lessons-learned.md](./lessons-learned.md) with more detail.

---

## Reading order

If you're new to GenicUI and want to understand the DX:

1. **This doc** — what it feels like to use the framework
2. **[four-agnostic.md](./four-agnostic.md)** — the contract surface that DX exposes
3. **[lessons-learned.md](./lessons-learned.md)** — what we learned building the PoC
4. **[architecture.md](./architecture.md)** — the original design pitch (note: predates some decisions)
5. **The code** (`poc/`) — small enough to read in one sitting

If you're deciding whether to use GenicUI, read this doc + [four-agnostic.md](./four-agnostic.md). That's enough to know if the framework fits your project.
