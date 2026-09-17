# Ecommerce Registry

Workspace-local component catalog for the VaahStore guest-shopper journey.

## What's here

| File | Purpose |
|---|---|
| `types.ts` | `EcommerceComponentEntry` + `SeedPrompt` types. Mirrors the F37 server-side `ComponentEntry` shape with one workspace-local addition: the `import` thunk. |
| `components.ts` | The 19-entry `ECOMMERCE_REGISTRY` array. **Must stay ≤ 50 executable lines** per EJG-LAYOUT-2 (enforced by `__tests__/registry-size.test.ts`). |
| `prompts.ts` | 4 seed prompts from journey spec §7, surfaced by the playground's PromptsPanel. |

## Adding a new component

1. **Add a TypeBox schema** at the top of `components.ts` (or extract to
   a separate file if it's complex). Always `additionalProperties: false`.
2. **Add one entry** to the `ECOMMERCE_REGISTRY` array:
   ```ts
   {
     name: 'MyNewComponent',
     import: () => import('../ui/MyNewComponent.vue'),
     propsSchema: Type.Object({ /* ... */ }, { additionalProperties: false }),
     events: [{ name: 'my-event' }],
     examples: [],
   }
   ```
3. **Author the Vue file** at `../ui/MyNewComponent.vue`. It must stay
   pure: no `useFetch()`, no `from '../agent/'` imports
   (EJG-LAYOUT-1).
4. **Run the tests** — both `registry-size.test.ts` and
   `ecommerce-import-graph.test.ts` gate the change.

## The three-layer rule

```
app/components/ecommerce/
├── ui/         ← Pure Vue components. Props in, events out. NO fetching.
├── agent/      ← Data layer. Tool adapters, session, journey state machine.
└── registry/   ← Metadata only. Wires ui/ + agent/ + tool schemas.
```

`ui/` may NOT import from `agent/` and may NOT call `useFetch()`. The
`ecommerce-import-graph.test.ts` enforces both rules.

## Workspace isolation

The VaahStore provider lives at
`server/providers/vaahstore/` (workspace-resident, NOT in
`packages/server/src/chat/providers/`). The 12 TypeBox tool schemas
under that path are what the agent calls into; the 19 component
entries here are what the agent renders back. **Never move either into
`packages/`** — `scripts/check-isolation.sh` (added in M5.2-T2-1)
gates the rule.