# GenicUI — VaahStore Guest-Shopper Journey in the Playground

A worked example showing GenicUI driving an end-to-end e-commerce flow against the **VaahStore** headless commerce API. This document is a **requirement draft** (sibling to [examples-cartviewer.md](./examples-cartviewer.md)); it covers persona, journey, component inventory, agent adapter shape, and acceptance gates before the work moves to `specs/features/`.

> **Sources:**
> VaahStore docs index — [docs.vaah.dev/vaahstore/](https://docs.vaah.dev/vaahstore/) (the index loaded at time of writing; per-section `/vaahstore/api` and individual Basics subpages were returning HTTP 500 from our fetcher, so this draft assumes the conventional headless-commerce endpoint shape and flags the assumptions explicitly in §6).

---

## 1. Persona

**Guest shopper, first visit.** No account. No saved cart. No addresses. Browses, narrows, configures, checks out as guest. Returns later and asks about the order.

The guest constraint is the whole point: every existing GenicUI playground demo implicitly assumes an authenticated principal. A guest flow exercises the parts the authed flows skip — local-only cart, deferred server-cart handoff, identity-light re-entry, post-purchase account conversion.

---

## 2. Journey — Steps 1 → 9

### Step 1 — Land & browse
- **User says** anything implying shopping intent — *"show me running shoes under $120"*, *"hi, I'm looking for a gift"*, etc.
- **Agent does:**
  - Picks a default `store_id` from the VaahStore provider config (single-store mode) or from a `StoreSelector` component (multi-store mode).
  - Calls `GET /products?category=running-shoes&price_lte=12000&per_page=24` — VaahStore prices assumed to be minor units (cents) until verified.
  - Renders **`ProductGrid`** (DataTable with image, title, brand Tag, price, stock Tag — paginated, empty/loading states matching the existing `OrdersTable` pattern).
  - Persists the query in `localStorage` keyed by `sessionId` (set on first visit, persisted across browser sessions).
- **Component emits:** `product_selected` (product id).

### Step 2 — Narrow with filters
- **User clicks** FilterChips above the grid, or types *"only size 10, red or blue"*.
- **Agent does:**
  - Merges filter state with the persisted query.
  - Calls `GET /products?...&variation.color=red,blue&variation.size=10`.
  - Re-renders **`ProductGrid`** via `update_component` (JSON-Patch on `rows` + filter chips) — **no remount**, state preserved across filter changes.

### Step 3 — Product detail
- **User clicks** a card → `product_selected` → agent calls `GET /products/{id}` (joins `product-medias`, `product-variations`, `product-stocks`, `product-attributes`, brand).
- **Renders `ProductDetail`:** gallery (carousel), title, brand, price + compare-at, description, **VariationPicker** (size/color/width radio groups derived from variations), stock indicator (`Tag` severity from stock count), qty stepper, "Add to Cart" button.
- **Component emits:** `variant_changed` (debounced — agent re-fetches stock for the new variant), `add_to_cart` (variant id + qty), `add_to_wishlist`.

### Step 4 — Continue shopping or go to cart
Two paths after Add to Cart:
- **Path A — keep shopping (~70% of sessions):** `add_to_cart` → agent mounts a transient **`MiniCartToast`** (3s auto-dismiss, "Added — keep browsing or go to cart?"). The Detail stays interactive. The Toast does NOT unmount siblings.
- **Path B — open cart:** user types or clicks cart icon in AppHeader → agent mounts a full **`CartPanel`** (line items, qty steppers, subtotal, "Checkout" CTA).
- The cart is held in **agent-side session memory + localStorage**, NOT on VaahStore yet. VaahStore's `/carts` endpoint typically requires a customer or cart token — we delay `POST /carts` until Step 6 when the server needs to compute totals/taxes/shipping.
- **Component emits:** `qty_changed`, `remove_item`, `checkout_clicked`.

### Step 5 — Pre-checkout identity gate
- **User clicks Checkout** or types *"I'm ready to buy"*.
- Agent pauses and asks **one explicit question — no auto-create-account**:
  > "Quick check — continue as guest, or sign up to save this order to your account? Either way takes 10 seconds."
- Rendered as **`CheckoutIdentityPrompt`** (Card with two Buttons). Both paths are guest-friendly — "Sign up" creates a VaahStore customer *after* checkout, never blocks the purchase.
- **Component emits:** `continue_as_guest` (default) | `signup_then_checkout` (collects email first, order still proceeds).

### Step 6 — Server-side cart handoff
**The key guest-flow beat.** Agent materializes the in-session cart to VaahStore:
- `POST /carts` (VaahStore's guest-cart endpoint with `store_id` + cart token from localStorage; **fallback** if VaahStore only supports customer carts: create a transient `is_guest=1` customer record per Customer Groups doc).
- For each line item: `POST /carts/{cart}/items` with `{ product_variation_id, quantity }`.
- VaahStore responds with line totals, applied taxes, applied discounts.

**Agent renders `CheckoutForm`** (one screen, four collapsible sections):
1. **Contact** — email (prefilled if signed-up path), phone (optional).
2. **Shipping address** — VaahStore `/addresses` schema: name, line1, line2, city, state, postal_code, country, phone. Save-as-default checkbox (hidden for guest).
3. **Shipping method** — radio group from `GET /shipments?store_id=...&cart_total=...`.
4. **Payment method** — radio group from `GET /store-payment-methods?store_id=...`.

Each field uses PrimeVue `InputText` / `Dropdown` / `RadioButton`. Validation errors render inline below the field with a PrimeVue `Message`.

- **Component emits:** `checkout_field_changed` (debounced, for live shipping recalc), `payment_method_selected`, `place_order`.

### Step 7 — Place order & confirmation
- **User clicks Place Order** — agent runs in order:
  - `POST /addresses` (guest address)
  - `POST /orders` (with cart id, shipping id, payment id)
  - `POST /orders/{id}/payments` (if payment requires explicit confirmation, e.g. bank transfer)
  - `POST /orders/{id}/shipments` (creates the shipment record)
- Each step shown in **`OrderProcessing`** — a step list with PrimeVue `Steps` (Cart → Address → Order → Payment → Shipment) where each step turns green as the call returns. If any step fails, that step turns red with the API error inline and a "Retry" button — no full restart.
- On full success: renders **`OrderConfirmation`** (Order #, ETA from shipment, payment status Tag, "Track this order" button, "Create an account to track it later" CTA for the guest path).
- For guest, the order id + email are now in localStorage keyed by `sessionId`.

### Step 8 — Return visit & tracking
- **Time passes. User returns, opens the playground, types** *"where's my order?"* or *"did my package ship?"*.
- Agent reads `sessionId` + `lastOrderId` + `lastOrderEmail` from localStorage.
- **Identity verification first:** *"What's the email you used at checkout?"* — render **`OrderLookupPrompt`** (one InputText + Button). For guest, the email IS the auth.
- Calls `GET /orders/{id}?email=...` (VaahStore's order-by-email lookup; **fallback** if VaahStore doesn't expose this: a one-time signed token emailed at checkout — out of scope for the playground demo).
- Renders **`ShipmentTracker`** — PrimeVue `Timeline` with `Orders Statuses Logics` transitions (Placed → Paid → Packed → Shipped → Delivered), each with timestamp + carrier + tracking #. Plus a small **`OrderSummaryCard`** with items + total.

### Step 9 — Optional account conversion
- After confirmation, show a non-blocking **`AccountUpgradePrompt`** in the chat: *"Save this order and your address for next time? Create an account in 10 seconds."*
- If clicked: `POST /customers` with the checkout email + a chosen password, then `POST /customers/{id}/orders/{id}/claim` (or `PATCH /orders/{id} {customer_id}` depending on VaahStore's API) to attach the order.
- After this the user is no longer a guest — Step 8's email gate goes away on their next visit.

---

## 3. What this exercises in GenicUI

| GenicUI primitive | Where it shows up |
|---|---|
| `render_component` (fresh `componentId`) | Every new screen: Grid, Detail, Cart, Checkout, Confirmation, Tracker |
| `update_component` (existing `componentId`) | Step 2 filter narrowing — same `ProductGrid` reshaped, not remounted |
| Component-emitted events → agent tool calls | `product_selected`, `variant_changed`, `add_to_cart`, `qty_changed`, `checkout_clicked`, `place_order`, `track_order` |
| Per-componentId state survival | Step 3→4: `ProductDetail` stays mounted while `MiniCartToast` appears over it |
| Multi-component same conversation | `AppHeader` (cart icon) + `ProductGrid` + `MiniCartToast` all live simultaneously |
| `localStorage` as agent memory | `sessionId`, `lastOrderId`, `lastOrderEmail` persist across browser sessions |
| Chat-panel embed | Step 5 identity gate + Step 6 checkout form also appear inside `ChatPanel`'s `ToolCallAccordion` — user can fill them from either surface |
| Conditional routing | Guest vs signup path at Step 5; live vs deferred server-cart at Step 6 |
| Trust-boundary validation | Every VaahStore tool call is wrapped with `wrapWithValidation` (TypeBox schema) per F14 |

---

## 4. File layout

```
examples/playground/app/components/ecommerce/
├── README.md                       # what lives here, why, how to extend
├── index.ts                        # barrel export — registry, agent, ui surfaces
│
├── ui/                             # Pure Vue components. No data layer. No MCP. No fetch.
│   ├── ProductGrid.vue
│   ├── ProductDetail.vue
│   ├── ProductCard.vue             # extracted for reuse (grid + wishlist + order summary)
│   ├── VariationPicker.vue         # extracted from ProductDetail
│   ├── FilterChips.vue
│   ├── StockBadge.vue
│   ├── PriceTag.vue
│   ├── MiniCartToast.vue           # 3s transient, doesn't unmount siblings
│   ├── CartPanel.vue
│   ├── CartLineItem.vue            # extracted for reuse
│   ├── CheckoutIdentityPrompt.vue  # guest vs signup
│   ├── CheckoutForm.vue
│   ├── CheckoutField.vue           # labeled input + inline error (extracted)
│   ├── OrderProcessing.vue         # Steps component, per-step status
│   ├── OrderConfirmation.vue
│   ├── ShipmentTracker.vue
│   ├── OrderSummaryCard.vue
│   ├── OrderLookupPrompt.vue
│   └── AccountUpgradePrompt.vue
│
├── agent/                          # the brains
│   ├── prompts.ts                  # seed prompts for PromptsPanel
│   ├── tools.ts                    # VaahStore tool schemas (TypeBox) — agent-callable
│   ├── tool-runtime.ts             # thin fetch wrapper around VAHSTORE_BASE_URL
│   ├── intents.ts                  # component-event → next-tool-call mapping
│   ├── session.ts                  # localStorage session (sessionId, lastOrderId, lastOrderEmail)
│   └── journey.ts                  # the 9-step state machine — drives Steps 1→8
│
├── registry/                       # wires agent + ui → GenicUI primitives
│   ├── components.ts               # 18 component entries (name → import, schema, events)
│   ├── prompts.ts                  # re-exports agent/prompts.ts for PromptsPanel
│   └── README.md                   # how a new VaahStore component joins the catalog
│
└── __tests__/
    ├── journey.spec.ts             # drives Steps 1→8 against mocked VaahStore
    ├── session.spec.ts             # localStorage round-trip
    ├── intents.spec.ts             # event → tool-call mapping
    └── components/                 # Vue Test Utils per component
```

### Layer rules

- **`ui/` is dumb on purpose.** Each `.vue` file takes props in, emits events out, owns no fetch logic. If a file ever calls `useFetch` or imports from `agent/`, it belongs in `agent/`.
- **`ui/` cannot call `useFetch` directly.** All data flows in via props or out via `emit`. The MCP event bus already exists (`component-event-bus.ts` from F43 broadcast work).
- **`registry/` does not own logic.** Only wires names to imports + event lists. If a registry file grows past 50 lines, the logic probably belongs in `agent/`.

### Single edit outside `components/ecommerce/`

`examples/playground/app/components/resolve-mounted-component.ts` gains one branch:

```ts
import { ECOMMERCE_REGISTRY } from './ecommerce/registry/components';

const registries = [/* existing */, ECOMMERCE_REGISTRY];
```

Everything else — `RenderedComponent.vue`, the MCP broadcast, the agent bridge, the chat panel — already works with arbitrary component registries.

---

## 5. New VaahStore provider adapter

`packages/server/src/chat/providers/vaahstore.ts` — mirrors the existing claude-code adapter pattern.

- Reads `VAHSTORE_BASE_URL`, `VAHSTORE_STORE_ID`, `VAHSTORE_BEARER_TOKEN` from env.
- Exposes ~12 typed tool schemas the agent can call:

| Tool | VaahStore endpoint | Schema name |
|---|---|---|
| `list_products` | `GET /products` | `TListProducts` |
| `get_product` | `GET /products/{id}` | `TGetProduct` |
| `get_variations` | `GET /products/{id}/variations` | `TGetVariations` |
| `check_stock` | `GET /product-stocks?...` | `TCheckStock` |
| `create_cart` | `POST /carts` | `TCreateCart` |
| `add_to_cart` | `POST /carts/{cart}/items` | `TAddToCart` |
| `list_shipping` | `GET /shipments?...` | `TListShipping` |
| `list_payment_methods` | `GET /store-payment-methods?...` | `TListPaymentMethods` |
| `create_order` | `POST /orders` | `TCreateOrder` |
| `create_address` | `POST /addresses` | `TCreateAddress` |
| `track_order` | `GET /orders/{id}` | `TTrackOrder` |
| `claim_order` | `POST /customers/{id}/orders/{id}/claim` | `TClaimOrder` |

- Each tool is wrapped with the existing `wrapWithValidation` middleware (F14 trust-boundary pattern — 4 ACs, 62 tests) so untrusted LLM output is schema-checked before hitting the wire.
- Same `RenderedComponent.vue` resolution path as CityPicker / WeatherCard / Calculator — entries in `examples/playground/app/providers/registry.ts` map component name → PrimeVue import.
- `import.meta.env.VITE_VAAHSTORE_LIVE === '1'` swaps mocked fixture responses for live calls. Defaults to fixtures so the demo works without credentials.

---

## 6. Open assumptions (must be verified before implementation)

These are flagged because the actual `/vaahstore/api` page returned HTTP 500 from our fetcher at the time of writing. Each one becomes a `Verify` task before the corresponding code lands.

| Assumption | How to verify |
|---|---|
| VaahStore base URL is `{host}/api/vaahstore/v1/` | Read setup docs once accessible |
| VaahStore prices are minor units (cents) | Read Product Stocks docs once accessible |
| VaahStore supports a token-based guest cart at `POST /carts` | Read Carts docs once accessible. **Fallback:** create transient `is_guest=1` customer record. |
| VaahStore exposes an order-lookup-by-email endpoint | Read Orders docs once accessible. **Fallback:** one-time signed token emailed at checkout (out of scope for the playground demo). |
| VaahStore product variations expose color/size/width as filterable attributes | Read Product Variations + Attributes docs once accessible |
| Bearer-token auth is per-store | Read authentication section once accessible |
| Multi-store: VaahStore scopes storefront APIs by `store_id` | Read Stores doc once accessible |

---

## 7. Seed prompts for the PromptsPanel

Four chips that drive the journey without typing — wire through the existing `useChatInput().fillAndSubmit` pipeline:

1. **"Show me running shoes under $120"** — kicks off Step 1.
2. **"Pick size 10, red or blue"** — exercises Step 2 narrowing.
3. **"Add to cart and checkout"** — Steps 3 → 7 in one shot, defaulting to guest path.
4. **"Where's my order?"** — Step 8 (requires a prior session in localStorage).

---

## 8. Out of scope (post-MVP)

- **Real payment integration** (Stripe/PayPal/Braintree) — mocked in fixtures, real gateway integration is a separate feature.
- **Persistent order history** beyond a single browser session — `localStorage` is the bound.
- **Inventory holds** during browsing — VaahStore's `check_stock` is advisory; we don't reserve until `POST /carts/{cart}/items`.
- **Returns & refunds UI** — VaahStore supports the endpoints but Journey 1 doesn't exercise them.
- **Multi-currency / i18n** — single-currency, single-locale.
- **Wishlist (Journey 3)** — referenced in Step 3 but not the headline demo.
- **Admin analytics (Journey 2)** — separate `components/admin/` sibling layout.

---

## 9. Acceptance gates (draft — to be locked into `specs/features/` once verified)

### Journey-level

- **EJG-AC1 (Steps 1→7):** A guest user can complete a purchase end-to-end against mocked VaahStore fixtures without ever creating an account.
- **EJG-AC2 (Step 8):** Closing the browser, reopening, and typing *"where's my order?"* resolves the prior order via `sessionId` + `lastOrderEmail`.
- **EJG-AC3 (Step 9):** The post-checkout account-upgrade CTA converts a guest into an authed customer; the previously-placed order is attached to the new account via `claim_order`.

### Component-level (excerpt — full set in spec files)

- **EJG-COMP-1 (ProductGrid):** Filter change emits `filter_changed`; agent receives it, fetches filtered products, calls `update_component` with the same `componentId` — DOM persists, no remount.
- **EJG-COMP-2 (ProductDetail):** Stock indicator updates within 300ms of `variant_changed` (debounced).
- **EJG-COMP-3 (MiniCartToast):** Mounts over `ProductDetail` without unmounting it; auto-dismisses after 3s; can be dismissed early by user click.
- **EJG-COMP-4 (OrderProcessing):** Each step in `Steps` reflects the API call status independently; a failed step shows the API error inline and a "Retry" button.
- **EJG-COMP-5 (ShipmentTracker):** Renders the `Orders Statuses Logics` timeline with timestamp + carrier + tracking number per transition.

### Adapter-level

- **EJG-ADAPT-1:** With `VITE_VAAHSTORE_LIVE=0` (default), all 12 tools return fixture data. With `VITE_VAAHSTORE_LIVE=1` and env vars set, the same tool calls hit live VaahStore endpoints.
- **EJG-ADAPT-2:** Every tool call runs through `wrapWithValidation` — invalid LLM output is rejected with `-32003 props_invalid` before any HTTP request.
- **EJG-ADAPT-3:** VaahStore's bearer token never appears in client logs, server log output, or `RenderedComponent` props (verified by inspecting fixture + live log output).

### Layout-level

- **EJG-LAYOUT-1:** No file under `components/ecommerce/ui/` imports from `agent/` or calls `useFetch` (enforced by a single import-graph test).
- **EJG-LAYOUT-2:** `registry/components.ts` stays under 50 lines of logic — any logic above that belongs in `agent/`.
- **EJG-LAYOUT-3:** All 18 components are wired through the existing `resolve-mounted-component.ts` with one branch added — no other playground file is touched.

---

## 10. Reading order for the implementer

1. **Read this doc + [examples-cartviewer.md](./examples-cartviewer.md).** Same shape, different scope — cartviewer proves the schema-as-source-of-truth pattern across Nuxt/Next/SvelteKit; this doc proves the multi-step journey + state-machine pattern within a single host.
2. **Read [architecture.md](../idea/architecture.md) and [four-agnostic.md](../idea/four-agnostic.md).** Journey / component / library / provider-agnostic contract + `sideEffects` + Submit semantics — they govern how every `agent/intents.ts` decision gets made.
3. **Verify the assumptions in §6** before any `agent/tool-runtime.ts` work — read the VaahStore docs once `/vaahstore/api` and the Basics subpages are reachable.
4. **Start with:** `ecommerce/README.md` (the three-layer rule), `ecommerce/registry/components.ts` (the 18 component entries), `ecommerce/agent/journey.ts` (the state machine stub), `ecommerce/ui/ProductGrid.vue` (the first concrete component). Once those four land and the playground still boots + renders a `ProductGrid` via the existing `render_component` flow, the rest is mechanical.
