# ecommerce/ui — The Dumb Layer

This directory contains the **18 Vue components** that implement the
VaahStore guest-shopper journey screens (`.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md` §4).

## The contract

`ui/` is **props in, events out**. No fetching, no agent logic, no
`useFetch()`, no `from '../agent/'` imports.

The structural test at `__tests__/ecommerce-import-graph.test.ts`
([EJG-LAYOUT-1](../__tests__/ecommerce-import-graph.test.ts)) enforces
this rule — it walks every `.vue` file in this directory and rejects
any of these patterns:

- `from '../agent/'` in any `<script setup>` block
- `useFetch(` in any `<script setup>` block

If you need data inside a component, the right move is to thread it
through props from a parent that lives in `agent/` — never to import
the agent into `ui/`.

## The 18 components

| File | Purpose | Events emitted |
|---|---|---|
| `ProductCard.vue` | Extracted row (grid + wishlist + summary) | `product-selected` |
| `ProductGrid.vue` | DataTable-backed product browse list (EJG-COMP-1) | `product-selected`, `filter-changed` |
| `ProductDetail.vue` | Full product screen + variation + stock (EJG-COMP-2) | `variant-changed`, `add-to-cart`, `add-to-wishlist` |
| `VariationPicker.vue` | Extracted radio group for size/color/width | `variant-changed` |
| `FilterChips.vue` | Pill row for filter state | `filter-changed` |
| `StockBadge.vue` | Extracted stock-count Tag (severity by count) | — |
| `PriceTag.vue` | Extracted price + compare-at formatting | — |
| `MiniCartToast.vue` | 3s auto-dismiss transient toast (EJG-COMP-3) | `dismiss`, `go-to-cart` |
| `CartPanel.vue` | Full cart with line items + subtotal | `qty-changed`, `remove-item`, `checkout-clicked` |
| `CartLineItem.vue` | Extracted cart row | `qty-changed`, `remove-item` |
| `CheckoutIdentityPrompt.vue` | Step 5 guest-vs-signup gate | `continue-as-guest`, `signup-then-checkout` |
| `CheckoutForm.vue` | Step 6 one-screen checkout (4 tabs) | `checkout-field-changed`, `payment-method-selected`, `place-order` |
| `CheckoutField.vue` | Extracted labeled input + inline error | `checkout-field-changed` |
| `OrderProcessing.vue` | Step 7 progress steps with per-step retry (EJG-COMP-4) | `step-retry` |
| `OrderConfirmation.vue` | Step 7 success screen | `track-order`, `create-account` |
| `ShipmentTracker.vue` | Step 8 timeline (EJG-COMP-5) | — |
| `OrderSummaryCard.vue` | Read-only order summary | — |
| `OrderLookupPrompt.vue` | Step 8 email-gate form | `lookup-order` |
| `AccountUpgradePrompt.vue` | Step 9 post-checkout CTA | `upgrade-account`, `dismiss` |

## Component-level ACs (EJG-COMP-N) at a glance

- **EJG-COMP-1** — `ProductGrid` emits `filter-changed`; the agent calls
  `update_component` on the same `componentId`, so the DOM persists
  (no remount).
- **EJG-COMP-2** — `ProductDetail` debounces `variant-changed` (well
  under 300ms) so the agent can re-fetch stock and re-render.
- **EJG-COMP-3** — `MiniCartToast` mounts over `ProductDetail` as a
  sibling; auto-dismisses after 3s; user-click dismiss supported.
- **EJG-COMP-4** — `OrderProcessing` per-step status reflects API
  calls independently; failed step shows inline error + Retry.
- **EJG-COMP-5** — `ShipmentTracker` renders the `Orders Statuses
  Logics` timeline (placed → paid → packed → shipped → delivered) with
  timestamp + carrier + tracking number per transition.

## Cross-references

- Journey spec: [`.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md`](../../../../.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md) §4 + §9
- Component catalog: [`docs/components.md`](../../../docs/components.md)
- Plugin API: [`docs/plugin-architecture.md`](../../../docs/plugin-architecture.md)
- Workspace README: [`../../README.md`](../../README.md)