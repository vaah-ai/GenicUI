# ui/ Vue Reference

> **Task:** M5.2-T4
> **Scope:** The 18 (registry has 19 with `OrderProcessing` split out) Vue components at `app/components/ecommerce/ui/` that implement the VaahStore guest-shopper journey screens.

This page is the **canonical reference** for each `.vue` file in the
`ui/` layer: file path, props summary, emitted events, and the
component-level EJG-COMP-N behaviour it implements.

## The "props-only data flow" rule

`ui/` components **never** fetch data and **never** import from
`agent/`. Data flows in through props, control flows out through
events. The structural test at
[`__tests__/ecommerce-import-graph.test.ts`](../__tests__/ecommerce-import-graph.test.ts)
([EJG-LAYOUT-1](./components.md#enforcement-tests)) enforces this
rule. If a future contributor needs data inside a `ui/` component,
the right move is to thread it through props from a parent in
`agent/` — never to import the agent.

See [`app/components/ecommerce/ui/README.md`](../app/components/ecommerce/ui/README.md)
for the consumer-facing overview.

## The 19 components

### 1. `ProductCard.vue` — extracted row

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/ProductCard.vue` |
| **Props** | `product: { id, title, brand?, price?: {amount, currency_code}, stock?, compare_at?, image_url? }` |
| **Events** | `product-selected: { id }` |
| **EJG-COMP-N** | n/a — pure extracted row, reused by `ProductGrid` + (future) wishlist + `OrderSummaryCard`. |
| **Notes** | Renders initials placeholder when no `image_url`. `<button>` so keyboard accessible. |

### 2. `ProductGrid.vue` — DataTable-backed product browse

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/ProductGrid.vue` |
| **Props** | `rows: ProductRow[]`, `filters?: FilterEntry[]`, `loading?: boolean` |
| **Events** | `product-selected: { id }`, `filter-changed: { id, active, activeIds }` |
| **EJG-COMP-N** | **EJG-COMP-1** — same `componentId` round-trip, no remount. Holds a stable `instanceId` ref so the parent's `update_component` re-binds `:value` rather than unmounting the component. |
| **Notes** | Uses PrimeVue `DataTable` + `Column`. Paginates above 12 rows. |

### 3. `ProductDetail.vue` — full product screen

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/ProductDetail.vue` |
| **Props** | `product: { id, title, brand?, description?, price?: {amount, currency_code}, compare_at?, variations?: Variation[], stock?: Record<id, number> \| number }` |
| **Events** | `variant-changed: { productId, selection }`, `add-to-cart: { productId, variationId, quantity }`, `add-to-wishlist: { productId }` |
| **EJG-COMP-N** | **EJG-COMP-2** — `variant-changed` is debounced at `VARIATION_DEBOUNCE_MS = 250ms` (well under 300ms). Stock indicator re-renders when the agent pushes updated props via `update_component`. |
| **Notes** | Uses `VariationPicker` + `StockBadge` + `PriceTag`. Qty stepper via `InputNumber`. |

### 4. `VariationPicker.vue` — radio group for size/color/width

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/VariationPicker.vue` |
| **Props** | `variations: Variation[]` |
| **Events** | `variant-changed: { size?, color?, width? }` |
| **EJG-COMP-N** | n/a (debounce is in `ProductDetail`). |
| **Notes** | Groups variations by axis (size → color → width). Auto-selects first option per axis. |

### 5. `FilterChips.vue` — pill row

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/FilterChips.vue` |
| **Props** | `filters: { id, label, active }[]` |
| **Events** | `filter-changed: { id, active, activeIds }` |
| **EJG-COMP-N** | supports EJG-COMP-1. |
| **Notes** | Pill button with `aria-pressed` for screen readers. |

### 6. `StockBadge.vue` — extracted Tag with severity-by-stock-count

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/StockBadge.vue` |
| **Props** | `count: number` (integer ≥ 0) |
| **Events** | — |
| **EJG-COMP-N** | EJG-COMP-2 (rendered by `ProductDetail`). |
| **Notes** | Bands: `0` → danger / Out of stock; `1-3` → warn / `Only N left`; `4-10` → info; `> 10` → success. |

### 7. `PriceTag.vue` — extracted price + compare-at

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/PriceTag.vue` |
| **Props** | `amount: number`, `currency?: string` (ISO-4217, default 'USD'), `compareAt?: number \| null` |
| **Events** | — |
| **EJG-COMP-N** | n/a |
| **Notes** | Decimal amounts per M5.2-T1 verification (VaahStore stores `currency.code` as decimals, NOT minor units). Cached `Intl.NumberFormat` per currency. |

### 8. `MiniCartToast.vue` — transient "Added to cart" notification

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/MiniCartToast.vue` |
| **Props** | `productName: string` |
| **Events** | `dismiss: {}`, `go-to-cart: {}` |
| **EJG-COMP-N** | **EJG-COMP-3** — auto-dismiss at `AUTO_DISMISS_MS = 3000`. User-click dismiss supported. Sibling-mounted (renders as a separate mount under the chat panel; the underlying `ProductDetail` is NOT unmounted). |
| **Notes** | `<Transition>` for fade-out. Watch on `productName` resets the timer for repeat-adds. |

### 9. `CartPanel.vue` — full cart with line items + subtotal

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/CartPanel.vue` |
| **Props** | `items: CartItem[]` |
| **Events** | `qty-changed: { id, quantity }`, `remove-item: { id }`, `checkout-clicked: { itemCount }` |
| **EJG-COMP-N** | n/a |
| **Notes** | Empty-state message when `items.length === 0`. |

### 10. `CartLineItem.vue` — extracted cart row

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/CartLineItem.vue` |
| **Props** | `item: { id, title, subtitle?, quantity, unit_amount?, line_amount?, currency_code?, max_quantity? }` |
| **Events** | `qty-changed: { id, quantity }`, `remove-item: { id }` |
| **EJG-COMP-N** | n/a |
| **Notes** | Used by `CartPanel` + `OrderSummaryCard`. |

### 11. `CheckoutIdentityPrompt.vue` — Step 5 guest-vs-signup gate

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/CheckoutIdentityPrompt.vue` |
| **Props** | (none) |
| **Events** | `continue-as-guest: {}`, `signup-then-checkout: {}` |
| **EJG-COMP-N** | n/a |
| **Notes** | Two prominent buttons; "Sign up" path still proceeds to checkout first (no account-creation block). |

### 12. `CheckoutForm.vue` — Step 6 one-screen checkout

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/CheckoutForm.vue` |
| **Props** | `step?: number (0-3)`, `contact?: { email, phone }`, `shipping?: Partial<ShippingAddress>` |
| **Events** | `checkout-field-changed: { field, value, contact, shipping }` (debounced 250ms), `payment-method-selected: { methodId }`, `place-order: { contact, shipping, shippingMethod, paymentMethod }` |
| **EJG-COMP-N** | n/a |
| **Notes** | Four PrimeVue `TabPanel`s. Light client-side validation (server validates via F14). |

### 13. `CheckoutField.vue` — extracted labeled input + inline error

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/CheckoutField.vue` |
| **Props** | `label: string`, `value: string`, `error?: string` |
| **Events** | `checkout-field-changed: string` |
| **EJG-COMP-N** | n/a |
| **Notes** | Uses PrimeVue `InputText` + `Message`. Test id derives from label slug. |

### 14. `OrderProcessing.vue` — Step 7 progress steps with per-step retry

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/OrderProcessing.vue` |
| **Props** | `steps: { id, label, status: 'pending' \| 'running' \| 'success' \| 'failed', error? }[]` |
| **Events** | `step-retry: { stepId }` |
| **EJG-COMP-N** | **EJG-COMP-4** — per-step status reflects API call independently. Failed step shows inline API error + Retry button. Other steps keep their own state. |
| **Notes** | Severity by status. List-based layout (PrimeVue `Steps` doesn't fit the per-row status pattern). |

### 15. `OrderConfirmation.vue` — Step 7 success screen

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/OrderConfirmation.vue` |
| **Props** | `order: { id, eta?, total?, currency_code?, payment_status?: 'pending' \| 'authorized' \| 'paid' \| 'failed' \| 'refunded', guest?: boolean, email? }` |
| **Events** | `track-order: { orderId }`, `create-account: { orderId, email }` |
| **EJG-COMP-N** | n/a |
| **Notes** | "Create an account" CTA only renders when `order.guest === true`. |

### 16. `ShipmentTracker.vue` — Step 8 timeline

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/ShipmentTracker.vue` |
| **Props** | `events: { status: 'placed' \| 'paid' \| 'packed' \| 'shipped' \| 'delivered' \| 'cancelled' \| 'returned', at?, carrier?, tracking? }[]` |
| **Events** | — |
| **EJG-COMP-N** | **EJG-COMP-5** — renders the 5-stage `Orders Statuses Logics` (placed → paid → packed → shipped → delivered) with timestamp + carrier + tracking number per transition. |
| **Notes** | PrimeVue `Timeline` with custom marker glyphs per status. |

### 17. `OrderSummaryCard.vue` — read-only order summary

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/OrderSummaryCard.vue` |
| **Props** | `order: { id, placed_at?, lines: OrderLine[], subtotal?, shipping?, tax?, total, currency_code? }` |
| **Events** | `qty-changed: { id, quantity }`, `remove-item: { id }` (re-emits from `CartLineItem`) |
| **EJG-COMP-N** | n/a |
| **Notes** | Used by `ShipmentTracker` + `OrderConfirmation`. Renders `CartLineItem` rows + totals breakdown. |

### 18. `OrderLookupPrompt.vue` — Step 8 email-gate form

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/OrderLookupPrompt.vue` |
| **Props** | (none) |
| **Events** | `lookup-order: { email }` |
| **EJG-COMP-N** | n/a |
| **Notes** | Single `InputText` + `Button`. `<form>` submit on Enter. |

### 19. `AccountUpgradePrompt.vue` — Step 9 post-checkout CTA

| | |
|---|---|
| **Path** | `app/components/ecommerce/ui/AccountUpgradePrompt.vue` |
| **Props** | `orderId: string` |
| **Events** | `upgrade-account: { orderId }`, `dismiss: { orderId }` |
| **EJG-COMP-N** | supports **EJG-AC3** |
| **Notes** | Two buttons: "Create account" / "Not now". |

## Cross-references

- Component catalog: [`components.md`](./components.md)
- Workspace plugin API: [`plugin-architecture.md`](./plugin-architecture.md)
- Workspace README: [`../README.md`](../README.md)
- Workspace `ui/` README: [`../app/components/ecommerce/ui/README.md`](../app/components/ecommerce/ui/README.md)
- Journey spec: [`.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md`](../../../.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md) §4 + §9
- Framework providers concept doc: [`docs/content/2.concepts/9.providers.md`](../../docs/content/2.concepts/9.providers.md)
- F37 component registry: [`.vaahagents/requirements/specs/features/37-component-registry.md`](../../../.vaahagents/requirements/specs/features/37-component-registry.md)