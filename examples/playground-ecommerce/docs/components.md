# Components

Workspace-resident component map for the VaahStore guest-shopper journey.

This page documents the **19 catalog entries** declared in
`app/components/ecommerce/registry/components.ts`. The full Vue
implementations land in **M5.2-T4**; this task (M5.2-T3) ships the
schema + stubs + enforcement tests only.

## The three-layer split

```
app/components/ecommerce/
├── ui/         ← Pure Vue components. Props in, events out. NO fetching.
├── agent/      ← Data layer. Tool adapters, session, journey state machine.
└── registry/   ← Metadata only. Wires ui/ + agent/ + tool schemas.
```

`ui/` may NOT import from `agent/` and may NOT call `useFetch()` —
enforced by `__tests__/ecommerce-import-graph.test.ts`
([EJG-LAYOUT-1](#enforcement-tests)).

## Where the data comes from

`ui/` components receive their props from `agent/` (T5) which calls
into the **workspace-resident VaahStore provider** at
[`server/providers/vaahstore/`](./plugin-architecture.md) (NOT
`packages/server/src/chat/providers/vaahstore.ts`). The 12 TypeBox tool
schemas under that path are what the agent calls into; the 19
component entries here are what the agent renders back.

See [`plugin-architecture.md`](./plugin-architecture.md) for the
plugin API surface (F14 wrap-at-registration, bearer-scrub contract,
worker isolation opt-in).

## The 19 catalog entries

Order matches journey spec `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md` §4.

| # | Name | Layer | Props (summary) | Events emitted |
|---|---|---|---|---|
| 1 | `ProductGrid` | ui | `rows[]`, `filters?` | `product-selected`, `filter-changed` |
| 2 | `ProductDetail` | ui | `product` | `variant-changed`, `add-to-cart`, `add-to-wishlist` |
| 3 | `ProductCard` | ui | `product` | `product-selected` |
| 4 | `VariationPicker` | ui | `variations[]` | `variant-changed` |
| 5 | `FilterChips` | ui | `filters[]` | `filter-changed` |
| 6 | `StockBadge` | ui | `count` (int ≥ 0) | — |
| 7 | `PriceTag` | ui | `amount` (≥ 0), `currency?` (ISO-4217) | — |
| 8 | `MiniCartToast` | ui | `productName` (1–256 chars) | `dismiss`, `go-to-cart` |
| 9 | `CartPanel` | ui | `items[]` | `qty-changed`, `remove-item`, `checkout-clicked` |
| 10 | `CartLineItem` | ui | `item` | `qty-changed`, `remove-item` |
| 11 | `CheckoutIdentityPrompt` | ui | (none) | `continue-as-guest`, `signup-then-checkout` |
| 12 | `CheckoutForm` | ui | `step` (0–4), `contact?`, `shipping?` | `checkout-field-changed`, `payment-method-selected`, `place-order` |
| 13 | `CheckoutField` | ui | `label` (1–64), `value`, `error?` (≤ 256) | `checkout-field-changed` |
| 14 | `OrderProcessing` | ui | `steps[]` | `step-retry` |
| 15 | `OrderConfirmation` | ui | `order` | `track-order`, `create-account` |
| 16 | `ShipmentTracker` | ui | `events[]` | — |
| 17 | `OrderSummaryCard` | ui | `order` | — |
| 18 | `OrderLookupPrompt` | ui | (none) | `lookup-order` |
| 19 | `AccountUpgradePrompt` | ui | `orderId` (1–64) | `upgrade-account`, `dismiss` |

All schemas are TypeBox `Type.Object({…}, { additionalProperties: false })`
— the F14 trust-boundary rule refuses any unknown prop at runtime.

## How to add a new component

1. **Add a TypeBox schema** at the top of `components.ts` (or extract to
   a separate file if it's complex). Always `additionalProperties: false`.
2. **Add one entry** to the `ECOMMERCE_REGISTRY` array (see the
   [`registry/README.md`](../app/components/ecommerce/registry/README.md)
   for the inline-literal pattern).
3. **Author the Vue file** at `../ui/<Name>.vue`. It must stay pure:
   no `useFetch()`, no `from '../agent/'` imports.
4. **Run the tests** — both `registry-size.test.ts` and
   `ecommerce-import-graph.test.ts` gate the change.

## Event semantics

All event names are **kebab-case** (`product-selected`, `add-to-cart`)
to match the AG-UI event-name convention used in F18. The server-side
catalog in `packages/server/src/registry/` enforces the same shape.

## Enforcement tests

| Test | File | Rule |
|---|---|---|
| Import-graph | [`__tests__/ecommerce-import-graph.test.ts`](../__tests__/ecommerce-import-graph.test.ts) | `ui/*.vue` files refuse `from '../agent/'` and `useFetch(`. Asserts `files.length >= 18`. ([EJG-LAYOUT-1](#)) |
| Registry size | [`__tests__/registry-size.test.ts`](../__tests__/registry-size.test.ts) | `registry/components.ts` ≤ 50 executable lines (comments + blanks stripped). ([EJG-LAYOUT-2](#)) |

## Workspace isolation

**Never move any of these components into `packages/`.** The gate is
`scripts/check-isolation.sh` (added in M5.2-T2-1, extended in M5.2-T3
with `--base <ref>` to support T3's branch base
`feature/ProviderPluginArchitecture`). Run with:

```bash
bun --filter genicui-playground-ecommerce check-isolation \
  --base feature/ProviderPluginArchitecture
```

## Cross-references

- Journey spec: [`.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md`](../../.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md) §4
- Workspace plugin API: [`plugin-architecture.md`](./plugin-architecture.md)
- Workspace README: [`../README.md`](../README.md)
- Framework providers concept doc: [`docs/content/2.concepts/9.providers.md`](../../docs/content/2.concepts/9.providers.md)
- F14 trust-boundary: [`docs/content/2.concepts/6.trust-boundary.md`](../../docs/content/2.concepts/6.trust-boundary.md)
- F37 component registry: [`docs/specs/features/37-component-registry.md`](../../docs/specs/features/37-component-registry.md)
