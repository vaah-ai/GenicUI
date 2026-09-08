# GenicUI — CartViewer in three frameworks

The same component, three times. Each one wraps a different component library in a different host framework, but the **schema is identical** — same props, same actions, same agent-facing contract. The agent doesn't know (or care) which one rendered.

Use this as a reference when porting components between frameworks, or when you're deciding which library to bring into your project.

---

## The shared schema

This is the contract every CartViewer implementation honors:

```ts
{
  props: {
    cartId: { type: 'string', required: true },
    showRemoveButton: { type: 'boolean', default: true },
  },
  actions: ['removeItem', 'applyCoupon'],
  hasSubmit: true,
}
```

The framework derives TypeScript types, MCP tool definitions, agent prompt fragments, and runtime registration from this declaration. The render code is framework-specific; everything else is shared.

---

## 1. Nuxt + PrimeVue

**Install:**
```bash
npm install genicui @primevue/nuxt-module primevue
```

**Wire in** (`nuxt.config.ts`):
```ts
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

**Component** (`components/genicui/CartViewer.vue`):
```vue
<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { defineSchema, emitAction } from 'genicui';

interface Props {
  cartId: string;
  showRemoveButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showRemoveButton: true,
});

// Schema-as-source-of-truth — generates TypeScript types,
// MCP tool definitions, agent prompt fragments, and runtime
// registration. The framework handles the rest.
defineSchema({
  props: {
    cartId: { type: 'string', required: true },
    showRemoveButton: { type: 'boolean', default: true },
  },
  actions: ['removeItem', 'applyCoupon'],
  hasSubmit: true,
});

// Component-local data — fetched however the project normally does it
const items = ref<CartItem[]>([]);
const total = computed(() =>
  items.value.reduce((sum, i) => sum + i.qty * i.price, 0)
);

function handleRemove(itemId: string) {
  // Send interaction back to the agent
  emitAction('removeItem', { cartId: props.cartId, itemId });
}

function handleApplyCoupon() {
  const code = prompt('Enter coupon code');
  if (code) emitAction('applyCoupon', { cartId: props.cartId, code });
}
</script>

<template>
  <DataTable :value="items" class="gu-cart">
    <Column field="name" header="Item" />
    <Column field="qty" header="Qty" />
    <Column field="price" header="Price">
      <template #body="{ data }">
        ${{ data.price.toFixed(2) }}
      </template>
    </Column>
    <Column header="">
      <template #body="{ data }">
        <Button
          v-if="showRemoveButton"
          icon="pi pi-trash"
          severity="danger"
          text
          @click="handleRemove(data.id)"
        />
      </template>
    </Column>
  </DataTable>

  <div class="gu-cart-footer">
    <span>Total: ${{ total.toFixed(2) }}</span>
    <Button label="Apply coupon" outlined @click="handleApplyCoupon" />
  </div>
</template>
```

**Chat surface** (auto-injected at `/genicui`, or place manually):
```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>Shop</h1>
    <ChatSurface />
  </div>
</template>
```

---

## 2. Next.js + Flowbite

**Install:**
```bash
npm install genicui flowbite flowbite-react
```

**Wire in** (`app/layout.tsx`):
```tsx
import { GenicuiProvider } from 'genicui/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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

**Component** (`components/genicui/cart-viewer.tsx`):
```tsx
'use client';
import { useState, useMemo } from 'react';
import { Table, Button } from 'flowbite-react';
import { defineSchema, useAction } from 'genicui';

type Props = {
  cartId: string;
  showRemoveButton?: boolean;
};

// Schema-as-source-of-truth — same shape as the Nuxt version.
// TypeScript types come from `Props` above; the schema drives
// MCP tools, agent prompts, and runtime registration.
defineSchema<Props>({
  props: {
    cartId: { type: 'string', required: true },
    showRemoveButton: { type: 'boolean', default: true },
  },
  actions: ['removeItem', 'applyCoupon'],
  hasSubmit: true,
});

type CartItem = { id: string; name: string; qty: number; price: number };

export function CartViewer({
  cartId,
  showRemoveButton = true,
}: Props) {
  const emit = useAction();
  const [items, setItems] = useState<CartItem[]>([]);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.qty * i.price, 0),
    [items]
  );

  const handleRemove = (itemId: string) => {
    emit('removeItem', { cartId, itemId });
  };

  const handleApplyCoupon = () => {
    const code = window.prompt('Enter coupon code');
    if (code) emit('applyCoupon', { cartId, code });
  };

  return (
    <div>
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
                  <Button color="failure" size="xs" onClick={() => handleRemove(item.id)}>
                    Remove
                  </Button>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      <div className="flex justify-between items-center mt-4">
        <span className="font-bold">Total: ${total.toFixed(2)}</span>
        <Button color="light" onClick={handleApplyCoupon}>
          Apply coupon
        </Button>
      </div>
    </div>
  );
}
```

**Chat surface** (placed wherever):
```tsx
// app/chat/page.tsx
import { ChatSurface } from 'genicui/nextjs';

export default function ChatPage() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Shop with AI</h1>
      <ChatSurface />
    </main>
  );
}
```

---

## 3. SvelteKit + Skeleton

**Install:**
```bash
npm install genicui @skeletonlabs/skeleton
```

**Wire in** (`src/routes/+layout.svelte`):
```svelte
<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  import { GenicuiProvider } from 'genicui/sveltekit';
</script>

<GenicuiProvider agent={{ kind: 'claude-code', mcpConfig: '.mcp.json' }}>
  <slot />
</GenicuiProvider>
```

**Component** (`src/lib/genicui/CartViewer.svelte`):
```svelte
<script lang="ts">
  import { Table, TableBody, TableBodyRow, TableBodyCell } from '@skeletonlabs/skeleton';
  import { defineSchema, emitAction } from 'genicui';

  type Props = {
    cartId: string;
    showRemoveButton?: boolean;
  };

  let { cartId, showRemoveButton = true }: Props = $props();

  // Same schema as the Nuxt and Next.js versions.
  defineSchema({
    props: {
      cartId: { type: 'string', required: true },
      showRemoveButton: { type: 'boolean', default: true },
    },
    actions: ['removeItem', 'applyCoupon'],
    hasSubmit: true,
  });

  type CartItem = { id: string; name: string; qty: number; price: number };
  let items: CartItem[] = $state([]);

  let total = $derived(
    items.reduce((sum, i) => sum + i.qty * i.price, 0)
  );

  function handleRemove(itemId: string) {
    emitAction('removeItem', { cartId, itemId });
  }

  function handleApplyCoupon() {
    const code = window.prompt('Enter coupon code');
    if (code) emitAction('applyCoupon', { cartId, code });
  }
</script>

<Table>
  <TableHead>
    <TableHeadCell>Item</TableHeadCell>
    <TableHeadCell>Qty</TableHeadCell>
    <TableHeadCell>Price</TableHeadCell>
    <TableHeadCell></TableHeadCell>
  </TableHead>
  <TableBody>
    {#each items as item (item.id)}
      <TableBodyRow>
        <TableBodyCell>{item.name}</TableBodyCell>
        <TableBodyCell>{item.qty}</TableBodyCell>
        <TableBodyCell>${item.price.toFixed(2)}</TableBodyCell>
        <TableBodyCell>
          {#if showRemoveButton}
            <button class="btn btn-sm btn-error" onclick={() => handleRemove(item.id)}>
              Remove
            </button>
          {/if}
        </TableBodyCell>
      </TableBodyRow>
    {/each}
  </TableBody>
</Table>

<div class="flex justify-between items-center mt-4">
  <span class="font-bold">Total: ${total.toFixed(2)}</span>
  <button class="btn btn-sm variant-soft" onclick={handleApplyCoupon}>
    Apply coupon
  </button>
</div>
```

**Chat surface** (`src/routes/+page.svelte`):
```svelte
<script lang="ts">
  import { ChatSurface } from 'genicui/sveltekit';
</script>

<main class="container mx-auto p-4">
  <h1 class="text-3xl font-bold mb-4">Shop with AI</h1>
  <ChatSurface />
</main>
```

---

## What's the same, what changes

| Aspect | Nuxt + PrimeVue | Next.js + Flowbite | SvelteKit + Skeleton |
|---|---|---|---|
| **Package** | `genicui` | `genicui` | `genicui` |
| **Adapter entry** | Nuxt module in config | `<GenicuiProvider>` in layout | `<GenicuiProvider>` in layout |
| **Component style** | `.vue` SFC | `.tsx` function component | `.svelte` component |
| **Action API** | `emitAction('x', {...})` | `const emit = useAction(); emit('x', {...})` | `emitAction('x', {...})` |
| **Schema** | `defineSchema({...})` in `<script setup>` | `defineSchema<Props>({...})` at module top | `defineSchema({...})` in `<script>` |
| **Reactivity** | `ref`, `computed`, `reactive` | `useState`, `useMemo` | `$state`, `$derived` |
| **Library syntax** | PrimeVue components | flowbite-react components | Skeleton/Tailwind classes |
| **Chat surface** | `<ChatSurface>` or `/genicui` | `<ChatSurface />` | `<ChatSurface />` |

What **stays identical** across all three:
- The `defineSchema` declaration
- The MCP tool definitions exposed to the agent
- The agent's system prompt fragments
- The action names (`removeItem`, `applyCoupon`)
- The prop names (`cartId`, `showRemoveButton`)
- The component lifecycle (mount, update, unmount, summarize)
- The Submit button behavior (driven by `hasSubmit: true`)

An agent rendered CartViewer in Nuxt, then renders the same component in Next.js, then in SvelteKit — the user sees the same component, the agent sees the same tools, the developer wrote the same schema. Only the render code differs.

---

## The same exercise for a different component

The same three-framework pattern applies to any component. Try writing `DrillCard` for all three — it's even simpler than CartViewer (no data table, just a card + button). The schema:

```ts
{
  props: {
    productId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    price: { type: 'number', required: true },
    imageUrl: { type: 'string' },
  },
  actions: ['addToCart', 'viewDetails'],
  hasSubmit: false,  // Add to cart IS the interaction — no Submit needed
}
```

Notice `hasSubmit: false` — the framework won't render a Submit button below DrillCard because the action (`addToCart`) IS the user's intent. The agent doesn't need to be asked "what do you want to do next?" after Add to cart — the action is the answer. See [four-agnostic.md](./four-agnostic.md) for the Submit semantics.

---

## Reading order

If you're porting components between frameworks:

1. Start with the schema — copy it verbatim, only change render code
2. Use the framework's idioms for reactivity (`ref`/`useState`/`$state`)
3. Use the framework's idioms for action emission (`emitAction` vs `useAction()`)
4. Don't touch the schema unless the contract genuinely needs to change

If the schema changes, regenerate TypeScript types (`npx genicui generate-types`) and the agent prompt fragments update automatically.
