# Task M5.2-T4 — Ecommerce UI components (ui/ Vue layer)

> **Milestone:** M5.2 (Worked Examples: VaahStore Guest-Shopper Journey)
> **Manifest feature:** None new — extends F16 (render_component) + F21 (GenicElement); 18 `.vue` files at `examples/playground-ecommerce/app/components/ecommerce/ui/`
> **Priority:** High
> **Status:** ⚪ Not Started
> **Estimated Effort:** 3 days

## Description

Land the **18 Vue components** named in `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md` §4 under `examples/playground-ecommerce/app/components/ecommerce/ui/`. Each `.vue` file is **dumb by design** — props in, events out, no fetch, no MCP, no agent logic. All 18 stubs registered in M5.2-T3 (`registry/components.ts`) get filled in here.

This task is where the **component-level acceptance criteria** (EJG-COMP-1 through EJG-COMP-5 from the journey spec §9) are satisfied — specifically the behaviours that need to be verified in code, not just verified by reading a config: no-remount on filter, debounced stock update, MiniCartToast 3s auto-dismiss without sibling unmount, OrderProcessing per-step retry, ShipmentTracker timeline.

## Task Goals

- Land 18 `.vue` files at `examples/playground-ecommerce/app/components/ecommerce/ui/` matching the §4 file list
- Each component takes props in and emits events out — verified by reading any one of them
- No file under `ui/` imports from `../agent/` or calls `useFetch` — verified by the M5.2-T3 import-graph test (EJG-LAYOUT-1)
- Component-level ACs from §9 implemented in code:
  - **EJG-COMP-1** — `ProductGrid` filter change emits `filter_changed`; agent receives it and calls `update_component` with the same `componentId` (no remount)
  - **EJG-COMP-2** — `ProductDetail` stock indicator updates within 300ms of `variant_changed` (debounced)
  - **EJG-COMP-3** — `MiniCartToast` mounts over `ProductDetail` without unmounting it; auto-dismisses after 3s; user-click dismiss supported
  - **EJG-COMP-4** — `OrderProcessing` Steps reflect per-API-call status independently; failed step shows inline API error + Retry button
  - **EJG-COMP-5** — `ShipmentTracker` renders the `Orders Statuses Logics` timeline with timestamp + carrier + tracking # per transition
- PrimeVue 4 components used throughout (DataTable, Steps, Timeline, Tag, Button, Card, RadioButton, InputText, Dropdown, Message) — same registry the existing playground uses

## Implementation Plan

> ⚠️ Analyze this plan thoroughly before implementing. Invoke relevant skills and MCP servers as needed.

### Pre-Implementation Analysis

- Read the existing `examples/playground/app/components/OrdersTable.vue` end-to-end — it's the closest precedent (a DataTable-backed component that emits events to the chat-panel agent)
- Read the existing `examples/playground/app/components/Calculator.vue` and `CityPicker.vue`/`WeatherCard.vue` (M5-T7 work) for the emit-to-chat-panel pattern
- The journey spec §4 spells out all 18 filenames + their reusability notes (e.g. `ProductCard` extracted for grid + wishlist + order summary; `CheckoutField` extracted for labeled-input + inline-error). Follow the extraction guidance — it reduces code volume
- `ui/` is the dumb layer — every `useFetch` is **banned**. All data flows via props. The M5.2-T3 import-graph test will reject any violation automatically

### Steps

1. Create the 4 product/browse components:
   - `ProductCard.vue` (extracted: image, title, brand Tag, price Tag, stock Tag; emits `product_selected`)
   - `ProductGrid.vue` (DataTable using `ProductCard` rows; emits `product_selected`, `filter_changed`; **EJG-COMP-1** filter-no-remount)
   - `ProductDetail.vue` (gallery carousel + VariationPicker + qty stepper + Add-to-Cart; emits `variant_changed` debounced, `add_to_cart`, `add_to_wishlist`)
   - `VariationPicker.vue` (extracted radio groups for size/color/width derived from variations prop; emits `variant_changed`)
   - `FilterChips.vue` (re-emitting `filter_changed` when a chip is toggled)
   - `StockBadge.vue` (extracted Tag with severity-by-stock-count mapping)
   - `PriceTag.vue` (extracted price + compare-at formatting — minor-units→display, per M5.2-T1's verification)
2. Create the 4 cart/checkout components:
   - `MiniCartToast.vue` (3s auto-dismiss, transient — **does not unmount siblings**; **EJG-COMP-3**)
   - `CartPanel.vue` (line items + qty steppers + subtotal + Checkout CTA; emits `qty_changed`, `remove_item`, `checkout_clicked`)
   - `CartLineItem.vue` (extracted row)
   - `CheckoutIdentityPrompt.vue` (guest vs signup gate; emits `continue_as_guest` / `signup_then_checkout`)
3. Create the 5 checkout-flow components:
   - `CheckoutForm.vue` (one screen, four collapsible sections: contact, shipping address, shipping method, payment method; emits `checkout_field_changed` debounced, `payment_method_selected`, `place_order`)
   - `CheckoutField.vue` (extracted labeled input + inline PrimeVue Message for validation errors)
   - `OrderProcessing.vue` (Steps component with Cart→Address→Order→Payment→Shipment; **EJG-COMP-4** per-step retry)
   - `OrderConfirmation.vue` (Order #, ETA, payment status Tag, Track button, AccountUpgrade CTA)
   - `AccountUpgradePrompt.vue` (post-checkout prompt; emits `upgrade_clicked`)
4. Create the 5 tracking/conversion components:
   - `ShipmentTracker.vue` (PrimeVue Timeline with Placed→Paid→Packed→Shipped→Delivered; **EJG-COMP-5**)
   - `OrderSummaryCard.vue` (items + total)
   - `OrderLookupPrompt.vue` (one InputText + Button for email-gate)
   - `OrderProcessing.vue` (covered in step 3 — listed here for completeness)
5. Author `examples/playground-ecommerce/app/components/ecommerce/ui/README.md` — the "ui/ is dumb" rule, the props-in/events-out pattern, and the import-graph enforcement pointer (EJG-LAYOUT-1)
6. Run the M5.2-T3 import-graph test after the first `.vue` file lands — verify the test catches a synthetic `from '../agent/'` import before scaling up the rest
7. Write Vue Test Utils per-component tests at `examples/playground-ecommerce/__tests__/components/{Name}.test.ts` — one happy-path test per EJG-COMP-N + a test that props-only data flow works
8. Run `bun --filter playground-ecommerce build` — green build is the integration smoke gate

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
| --- | --- | --- |
| `sequential-thinking` | When designing the no-remount logic for EJG-COMP-1 — Playwright's `key` prop vs. JSON-Patch on existing componentId | Step 1 |
| `primevue` skill | Pull up the right PrimeVue 4 component patterns (Steps vs. Timeline distinction) | Steps 1–4 |
| `vue-best-practices` skill | Composition API idioms + script-setup convention | Throughout |
| `filesystem` (MCP) | Create the 18 `.vue` files + tests | Steps 1–5, 7 |
| `memory` (MCP) | Persist the "ui/ is dumb" rule once the import-graph test passes green for the first time | End of task |

## Acceptance Criteria

- **M5.2-T4-AC1** — All 18 components from §4 exist at `examples/playground-ecommerce/app/components/ecommerce/ui/` and are registered in the M5.2-T3 registry's `import` field
- **M5.2-T4-AC2** — No file under `ui/` imports from `../agent/` or calls `useFetch` — verified by `ecommerce-import-graph.test.ts` (EJG-LAYOUT-1)
- **M5.2-T4-AC3** — **EJG-COMP-1:** `ProductGrid` filter change emits `filter_changed`; same `componentId` round-trips via `update_component` without remount — verified by a unit test that mounts, filters, and asserts the same Vue instance identity
- **M5.2-T4-AC4** — **EJG-COMP-2:** `ProductDetail` stock indicator updates within 300ms of `variant_changed` — verified by a unit test using Vue Test Utils fake timers
- **M5.2-T4-AC5** — **EJG-COMP-3:** `MiniCartToast` mounts over `ProductDetail` without unmounting it; auto-dismisses after 3s; user-click dismiss supported — verified by a unit test that mounts both, advances fake timers, asserts only `MiniCartToast` is gone
- **M5.2-T4-AC6** — **EJG-COMP-4:** `OrderProcessing` per-step status reflects API call independently; failed step shows inline API error + Retry button — verified by mocking the journey.ts callbacks
- **M5.2-T4-AC7** — **EJG-COMP-5:** `ShipmentTracker` renders the `Orders Statuses Logics` timeline with timestamp + carrier + tracking # per transition — verified by a snapshot test with 5 fixture shipments
- **M5.2-T4-AC8** — `bun --filter playground-ecommerce build` exits 0 — full Nuxt build green

## Completion Criteria

- [ ] All 8 acceptance criteria above pass
- [ ] `bun --filter playground-ecommerce test` exits green (component tests + registry-size + import-graph)
- [ ] `bun --filter playground-ecommerce build` exits 0
- [ ] `bun run lint` reports zero errors in the new workspace
- [ ] Vue Test Utils coverage target met: 80% per-component (per `testing-strategy.md`)
- [ ] Workspace isolation: `git diff` against `examples/playground/` shows zero changes

## Testing Checklist

- [ ] Unit tests: one Vue Test Utils test per EJG-COMP-N (5 ACs → 5 named tests at `__tests__/components/`)
- [ ] Structural test: `ecommerce-import-graph.test.ts` from M5.2-T3 still green (EJG-LAYOUT-1)
- [ ] Snapshot test: `ShipmentTracker` with 5 fixture shipments (EJG-COMP-5)
- [ ] Timer test: fake-timers advance for EJG-COMP-2 (300ms debounce) + EJG-COMP-3 (3s auto-dismiss)
- [ ] Build smoke: `bun --filter playground-ecommerce build` exits 0
- [ ] Regression: `bun --filter playground test` still green (no cross-workspace bleed)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
| --- | --- | --- | --- | --- |
| M5.2-T4-01 | 7 product/browse components (`ProductCard`, `ProductGrid`, `ProductDetail`, `VariationPicker`, `FilterChips`, `StockBadge`, `PriceTag`) | ⚪ Not Started | ✅ Yes | High |
| M5.2-T4-02 | 4 cart/checkout components (`MiniCartToast`, `CartPanel`, `CartLineItem`, `CheckoutIdentityPrompt`) | ⚪ Not Started | ✅ Yes | High |
| M5.2-T4-03 | 5 checkout-flow components (`CheckoutForm`, `CheckoutField`, `OrderProcessing`, `OrderConfirmation`, `AccountUpgradePrompt`) | ⚪ Not Started | ✅ Yes | High |
| M5.2-T4-04 | 2 tracking/conversion components (`ShipmentTracker`, `OrderSummaryCard`, `OrderLookupPrompt`) | ⚪ Not Started | ✅ Yes | Medium |
| M5.2-T4-05 | `ui/README.md` — the dumb-layer rule + import-graph enforcement pointer | ⚪ Not Started | ❌ No | Medium |
| M5.2-T4-06 | Vue Test Utils per-component tests covering EJG-COMP-1–5 | ⚪ Not Started | ✅ Yes | Critical |
| M5.2-T4-07 | `bun --filter playground-ecommerce build` exits 0 | ⚪ Not Started | ✅ Yes | Critical |

## Dependencies

- **Requires:** M5.2-T3 (registry entries point at `./ui/{Name}.vue` paths — these files fill the stubs)
- **Blocks:** M5.2-T5 (journey state machine drives these components; Playwright e2e mounts them)

## Documentation References

- Source: `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md` §4 (18 filenames + extraction notes) + §9 (EJG-COMP-1–5)
- Precedent: `examples/playground/app/components/OrdersTable.vue`, `Calculator.vue`, `CityPicker.vue`, `WeatherCard.vue`
- PrimeVue 4 components: `https://primevue.org` — DataTable, Steps, Timeline, Tag, Button, Card, RadioButton, InputText, Dropdown, Message
- GenicElement API: `packages/client/src/genic-element.ts` (per memory `genicui-genic-element-api-correction.md` — `render(props): void` override, props-json attr, `setRuntimeBridge` injection, import from `@genicui/client`)

## Notes

- **The "dumb ui/" rule is the milestone's strongest contract.** The import-graph test from T3 is what enforces it. If a future contributor needs the agent's data inside a component, the right move is to thread it through props from a parent that lives in `agent/` — never to import the agent into `ui/`.
- **EJG-COMP-1 (no remount on filter)** is the highest-risk component-level AC — getting the `componentId` round-trip right depends on the agent calling `update_component` (M5.2-T5) rather than `render_component` on filter change. The unit test should NOT mock the agent; it should assert the component emits `filter_changed` with the right payload and let the agent-side test (T5) verify the round-trip.
- **Honour the velocity directive:** if any single component takes more than 1 day, surface to the user and propose cutting it (e.g. collapse `StockBadge` + `PriceTag` into `ProductCard` directly if extraction isn't pulling weight).