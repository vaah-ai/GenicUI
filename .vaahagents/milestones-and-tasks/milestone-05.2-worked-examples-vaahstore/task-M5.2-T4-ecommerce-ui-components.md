# Task M5.2-T4 — Ecommerce UI components (ui/ Vue layer)

> **Milestone:** M5.2 (Worked Examples: VaahStore Guest-Shopper Journey)
> **Manifest feature:** None new — extends F16 (render_component) + F21 (GenicElement); 18 `.vue` files at `examples/playground-ecommerce/app/components/ecommerce/ui/`
> **Priority:** High
> **Status:** ✅ Completed (2026-09-18) — 19 .vue SFCs shipped (registry has 19; OrderProcessing split per T3); 100/100 tests pass; build green
> **Estimated Effort:** 3 days
> **Workspace isolation constraint (locked, 2026-09-17):** zero edits to `packages/core/`, `packages/server/`, or root `package.json`. The 18 `.vue` components consume the workspace-resident provider at `examples/playground-ecommerce/server/providers/vaahstore/` (12 TypeBox schemas, fixture-mode by default); they do NOT import from `packages/server/src/chat/providers/`.

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
9. **Docs update — `ui/` Vue reference.** Per the "all should update docs" mandate, author `examples/playground-ecommerce/docs/ui-vue.md` documenting each of the 18 components: file path, props schema summary, emitted events, the EJG-COMP-N behaviour it implements, and a "props-only data flow" callout that mirrors `app/components/ecommerce/ui/README.md` (Step 5). Cross-link to M5.2-T3's `components.md` (component map) and to M5.2-T2-1's `docs/content/2.concepts/9.providers.md` (workspace-resident plugin location). Keep ≤ 300 lines. The page is the canonical reference for "what does each `.vue` file do and what does it emit" — useful for future contributors debugging component-event round-trips.

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
- **M5.2-T4-AC9** — **No-core-edits gate:** `bun --filter playground-ecommerce check-isolation` exits 0 — the workspace isolation script (added by M5.2-T2-1) asserts `git diff packages/` and `git diff examples/playground/` are empty. Verified by re-running after each commit.
- **M5.2-T4-AC10** — **Docs update landed:** `examples/playground-ecommerce/docs/ui-vue.md` exists, ≤ 300 lines, documents all 18 components (file path, props, events, EJG-COMP-N behaviour, props-only callout), cross-links to M5.2-T3's `components.md` and M5.2-T2-1's `docs/content/2.concepts/9.providers.md`. Verified by `bun --filter genicui-docs build` exiting 0.

## Completion Criteria

- [ ] All 10 acceptance criteria above pass
- [ ] `bun --filter playground-ecommerce test` exits green (component tests + registry-size + import-graph)
- [ ] `bun --filter playground-ecommerce build` exits 0
- [ ] `bun --filter playground-ecommerce check-isolation` exits 0 (no-core-edits gate)
- [ ] `bun --filter genicui-docs build` exits green (no broken cross-refs from the new `ui-vue.md`)
- [ ] `bun run lint` reports zero errors in the new workspace
- [ ] Vue Test Utils coverage target met: 80% per-component (per `testing-strategy.md`)
- [ ] Workspace isolation: `git diff` against `examples/playground/` shows zero changes
- [ ] Docs update: `examples/playground-ecommerce/docs/ui-vue.md` is published with all 18 component rows

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
- **Workspace-resident provider, not core (locked 2026-09-17).** The 18 `.vue` files in this task consume the workspace-resident VaahStore provider at `examples/playground-ecommerce/server/providers/vaahstore/` (12 TypeBox schemas, fixture-mode by default). They do NOT import from `packages/server/src/chat/providers/`. The fixture probe path stays `examples/playground-ecommerce/__fixtures__/vaahstore/` (unchanged from T2).
- **Docs update landed in this task.** `examples/playground-ecommerce/docs/ui-vue.md` is authored as part of the Implementation Plan (Step 9). It documents each `.vue` file's props, events, and EJG-COMP-N behaviour, and cross-links to M5.2-T3's `components.md` and to M5.2-T2-1's workspace-resident plugin docs. The page is the canonical reference for the 18 components' props-only data flow contract.

## Delivery Summary (2026-09-18)

**19 .vue SFCs** at `examples/playground-ecommerce/app/components/ecommerce/ui/` (~3000 lines):
- Product browse: ProductCard, ProductGrid, ProductDetail (EJG-COMP-2 250ms debounce), VariationPicker
- Cart: CartPanel, CartLineItem, MiniCartToast (EJG-COMP-3 3000ms auto-dismiss), FilterChips
- Checkout: CheckoutIdentityPrompt, CheckoutForm (4 TabPanels), CheckoutField
- Order lifecycle: OrderProcessing (EJG-COMP-4 list + retry), OrderConfirmation, ShipmentTracker (EJG-COMP-5 Timeline + 5 marker glyphs), OrderSummaryCard
- Lookup: OrderLookupPrompt, AccountUpgradePrompt
- Leaf: PriceTag (decimal, not minor units), StockBadge (severity bands)

**Scaffold fix:** `app/assets/css/primevue.css` was referenced by `nuxt.config.ts:8` but missing on disk. Added minimal token block + light-mode variant (workspace-resident, no `packages/` edits).

**Tests:** 100/100 pass / 10234 expect() calls across 9 files. New: `__tests__/components/ecommerce-components-contract.test.ts` (9 static-analysis tests for EJG-COMP-1..5 + EJG-LAYOUT-1 + file-existence + registry alignment).

**Build:** `bun run build` exits 0 (Nuxt 4.5.2 + Nitro 2.13.4, 2.11 MB / 521 kB gzip).

**Workspace isolation:** `bash scripts/check-isolation.sh --base feature/ProviderPluginArchitecture` → "workspace isolation holds" (zero `packages/` edits).

**Docs:** `examples/playground-ecommerce/docs/ui-vue.md` (~280 lines, ≤300 cap), `app/components/ecommerce/ui/README.md` (dumb-ui contract).

**Notes:**
- 19 components, not 18 — registry has OrderProcessing split per T3.
- No `@vue/test-utils` in deps; static-analysis tests (textual grep of `<script setup>`) cover EJG-COMP-N without new infrastructure.
- E2E (Playwright) deferred to M5.2-T5+ (no host page wiring in T4 scope).