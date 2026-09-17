# Task M5.2-T5 — Agent journey state machine + Playwright end-to-end smoke

> **Milestone:** M5.2 (Worked Examples: VaahStore Guest-Shopper Journey)
> **Manifest feature:** None new — extends F42 (agent-bridge), F43 (chat events), F76 (provider registry); files at `examples/playground-ecommerce/app/components/ecommerce/agent/`
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2 days
> **Workspace isolation constraint (locked, 2026-09-17):** zero edits to `packages/core/`, `packages/server/`, or root `package.json`. The agent layer in this task calls the workspace-resident VaahStore provider at `examples/playground-ecommerce/server/providers/vaahstore/` via the workspace's local `getProviderAdaptor('vaahstore')`; it does NOT touch `packages/server/src/chat/providers/`.

## Description

Wire up the **9-step guest-shopper journey** as a state machine on the agent side, then verify it end-to-end with Playwright. The agent layer lives at `examples/playground-ecommerce/app/components/ecommerce/agent/` and follows the four-file split from `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md` §4:

- `prompts.ts` — seed prompts for the workspace's PromptsPanel
- `intents.ts` — component-event → next-tool-call mapping (the "what does the agent do when this event fires" table)
- `session.ts` — localStorage session (`sessionId`, `lastOrderId`, `lastOrderEmail`, cart-in-progress)
- `journey.ts` — the 9-step state machine that drives Steps 1→8 and the Step 9 optional conversion

Then **Playwright end-to-end smoke** verifies EJG-AC1, EJG-AC2, EJG-AC3 against the M5.2-T2 fixtures and the M5.2-T4 components. This is the milestone's **integration gate**.

## Task Goals

- Land `examples/playground-ecommerce/app/components/ecommerce/agent/{prompts,intents,session,journey}.ts` matching §4
- `prompts.ts` provides the 4 seed prompts from §7 to the workspace's PromptsPanel (same `useChatInput().fillAndSubmit` pipeline as `M5-T6`'s chips)
- `intents.ts` maps every event emitted by the M5.2-T4 components to the next tool call (e.g. `product_selected` → `get_product` + `render_component(ProductDetail)`; `filter_changed` → `list_products` + `update_component(ProductGrid)`)
- `session.ts` persists `sessionId` (UUID generated on first visit, persisted across browser sessions), `lastOrderId`, `lastOrderEmail`, and the in-progress cart line items across reloads (per §2 Step 1)
- `journey.ts` drives Steps 1→8 and the Step 9 optional conversion; tracks which step the user is on so the agent's prompt can be context-aware ("you have 2 items in your cart, want to checkout?")
- **Playwright journey smoke** at `examples/playground-ecommerce/e2e/journey.spec.ts` exercises EJG-AC1, EJG-AC2, EJG-AC3 against mocked VaahStore fixtures — the milestone's gate-closes-green event

## Implementation Plan

> ⚠️ Analyze this plan thoroughly before implementing. Invoke relevant skills and MCP servers as needed.

### Pre-Implementation Analysis

- Read `M5-T5` agent-bridge (`.vaahagents/milestones-and-tasks/milestone-05-registry/task-M5-T5-agent-bridge.md`) and `M5-T6` suggestive-prompts / chip-fill-and-submit pipeline (`task-M5-T6-suggestive-prompts-and-registry-selector.md`) — the new workspace's `prompts.ts` must use the **same** `useChatInput().fillAndSubmit` pipeline that the existing playground's chips use (no custom input handling)
- Read `M5-T7` CityPicker + WeatherCard precedent for the event → tool-call round-trip (`task-M5-T7-component-event-interactivity.md`) — the new workspace's `intents.ts` mirrors that pattern for 18 components
- The journey state machine is a **plain TypeScript reducer**, not a separate library — same shape as `M5-T7`'s `journey.ts` (no external state-machine lib needed)
- Playwright e2e follows the existing pattern at `examples/playground/e2e/` (the memory note `genicui-m5-1-t13-mantine-walkthrough.md` shows the precedent for cross-workspace Playwright runs)

### Steps

1. Author `agent/prompts.ts` — 4 string constants matching §7, exported as `SEED_PROMPTS: string[]`, surfaced via the workspace's PromptsPanel
2. Author `agent/session.ts` — `loadSession()` reads `localStorage['genicui-ecommerce-session:v1']` (or creates one with `sessionId = crypto.randomUUID()`), `saveSession()`, `clearSession()`, plus typed accessors for `lastOrderId` / `lastOrderEmail`. No business logic — just persistence
3. Author `agent/intents.ts` — a single `mapEventToIntent(event, session): ToolCall[]` function that returns the next MCP tool calls. Table:
   - `product_selected(productId)` → `[get_product]` + `render_component(ProductDetail, { productId })`
   - `filter_changed(filters)` → `[list_products]` + `update_component(ProductGrid, { rows, filters }, componentId)` — **EJG-COMP-1** no-remount
   - `variant_changed(variationId)` → debounced `[check_stock]` + `update_component(ProductDetail, { stock }, componentId)` — **EJG-COMP-2**
   - `add_to_cart({ variationId, qty })` → session-side: append to cart, `render_component(MiniCartToast, { autoDismissMs: 3000 })` — **EJG-COMP-3**
   - `checkout_clicked()` → `render_component(CheckoutIdentityPrompt)`
   - `continue_as_guest()` → `render_component(CheckoutForm)`
   - `place_order({ form })` → journey.ts runs the 4-step API chain + `render_component(OrderProcessing, { steps })` — **EJG-COMP-4** per-step retry
   - `track_order(email)` → `[track_order]` + `render_component(ShipmentTracker)` — **EJG-COMP-5**
   - `upgrade_clicked()` → `[claim_order]` + session-clears the email-gate
4. Author `agent/journey.ts` — `JourneyState = { step: 1..9, cart: CartLineItem[], ... }` + `transition(state, event): JourneyState` + `runJourney(state, agent)` that walks the 9 steps. Uses `intents.ts` for the dispatch table
5. Author `agent/README.md` — the four-file split, the session-storage shape, the journey-state-diagram (ASCII), and a "how to add a new step" guide
6. Wire `journey.ts` into the workspace's chat-panel — the workspace's `useChat().handleEvent` calls `journey.runJourney(state, agent)` on every `chat.message` event from the M5.2-T2 provider
7. Write unit tests at `examples/playground-ecommerce/__tests__/agent/`: `session.test.ts` (localStorage round-trip across simulated reload), `intents.test.ts` (every event → expected tool-call list), `journey.test.ts` (9-step happy path with mocked agent)
8. Author `examples/playground-ecommerce/e2e/journey.spec.ts` — Playwright spec exercising:
   - **EJG-AC1:** visit `/`, type *"show me running shoes under $120"* via the chat input, click a product, click Add to Cart, click Checkout, continue as guest, fill the form, click Place Order — assert the confirmation renders with an Order # and the agent never asked for an account
   - **EJG-AC2:** close the browser context, open a new one, visit `/`, type *"where's my order?"* — assert the prior order resolves via `lastOrderEmail` without any sign-in
   - **EJG-AC3:** after Step 8, click the AccountUpgrade CTA — assert a new VaahStore customer is created (fixture call) and `claim_order` attaches the prior order
9. Wire the e2e into the workspace's `package.json` (`"e2e": "playwright test"`) and ensure `bun --filter playground-ecommerce e2e` exits 0 in the milestone's smoke gate
10. Run `bun --filter playground-ecommerce test && bun --filter playground-ecommerce e2e && bun --filter playground-ecommerce build` — all three green
11. **Docs update — agent journey reference.** Per the "all should update docs" mandate, author `examples/playground-ecommerce/docs/agent-journey.md` documenting the agent layer: the four-file split (`prompts.ts` / `intents.ts` / `session.ts` / `journey.ts`), the 9-step state-machine diagram (ASCII), the `intents.ts` event-to-tool-call mapping table (linking to M5.2-T2-1's `docs/content/2.concepts/9.providers.md` for the workspace-resident plugin location and to M5.2-T4's `ui-vue.md` for the emit-side counterparts), and the session-storage shape (`localStorage['genicui-ecommerce-session:v1']`). Keep ≤ 350 lines. Cross-link to M5.2-T3's `components.md` (component map) and to M5.2-T2-1's `examples/playground-ecommerce/README.md` (workspace overview). The page becomes the canonical reference for "how does the agent decide what tool to call next" — useful for future contributors extending the journey with new steps.

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
| --- | --- | --- |
| `sequential-thinking` | Designing the journey state machine — when does a step advance? How does the agent recover from a partial Step 6 server-cart handoff? | Steps 4, 6 |
| `brainstorming` | If the Playwright spec grows past ~150 lines, step back and pick between a single spec per AC vs. a parameterised `test.describe` | Step 8 |
| `playwright` skill | Author the e2e spec — locator patterns, `localStorage` access via `evaluate`, browser context isolation for EJG-AC2 | Step 8 |
| `systematic-debugging` skill | If the Playwright run reveals a timing-dependent bug — debounce in intents.ts, race in session.ts | Step 10 |
| `filesystem` (MCP) | Create agent/ files + tests + e2e spec | Steps 1–9 |
| `memory` (MCP) | Persist the 9-step journey diagram once it stabilises — future journey-shaped examples will copy this structure | End of task |

## Acceptance Criteria

- **M5.2-T5-AC1** — `agent/{prompts,intents,session,journey}.ts` exist with the §4 layout and pass `bun --filter playground-ecommerce test`
- **M5.2-T5-AC2** — `prompts.ts` provides 4 seed prompts reachable from the workspace's PromptsPanel via `useChatInput().fillAndSubmit`
- **M5.2-T5-AC3** — `session.ts` round-trips `sessionId` + `lastOrderId` + `lastOrderEmail` across simulated browser reloads
- **M5.2-T5-AC4** — `intents.ts` covers all 9 component-event types listed in the journey spec's per-step "Component emits" sections
- **M5.2-T5-AC5** — `journey.ts` walks Steps 1→9 against a mocked agent in a unit test
- **M5.2-T5-AC6** — **EJG-AC1:** Playwright journey test completes Steps 1→7 as a guest without any account-creation prompt
- **M5.2-T5-AC7** — **EJG-AC2:** Playwright test re-opens the browser context, asks *"where's my order?"*, and the prior order resolves via `lastOrderEmail` (no sign-in)
- **M5.2-T5-AC8** — **EJG-AC3:** Playwright test clicks the `AccountUpgradePrompt`, asserts the customer record is created and `claim_order` attaches the prior order
- **M5.2-T5-AC9** — `bun --filter playground-ecommerce e2e` exits 0
- **M5.2-T5-AC10** — `bun --filter playground-ecommerce test && bun --filter playground-ecommerce e2e && bun --filter playground-ecommerce build` all green (full milestone smoke)
- **M5.2-T5-AC11** — **No-core-edits gate:** `bun --filter playground-ecommerce check-isolation` exits 0 — the workspace isolation script (added by M5.2-T2-1) asserts `git diff packages/` and `git diff examples/playground/` are empty. Verified by re-running after each commit.
- **M5.2-T5-AC12** — **Docs update landed:** `examples/playground-ecommerce/docs/agent-journey.md` exists, ≤ 350 lines, documents the four-file split + 9-step state diagram + event-to-tool-call mapping, cross-links to M5.2-T2-1's `docs/content/2.concepts/9.providers.md` (workspace-resident plugin location) and M5.2-T4's `ui-vue.md` (emit-side counterparts). Verified by `bun --filter genicui-docs build` exiting 0.

## Completion Criteria

- [ ] All 12 acceptance criteria above pass
- [ ] `bun --filter playground-ecommerce test` exits green
- [ ] `bun --filter playground-ecommerce e2e` exits green
- [ ] `bun --filter playground-ecommerce build` exits 0
- [ ] `bun --filter playground-ecommerce check-isolation` exits 0 (no-core-edits gate)
- [ ] `bun --filter genicui-docs build` exits green (no broken cross-refs from the new `agent-journey.md`)
- [ ] Workspace isolation: `git diff` against `examples/playground/` shows zero changes (the e2e is in the new workspace, not the existing one)
- [ ] Regression: `bun --filter playground test` + `bun --filter playground build` still green
- [ ] Coverage target met: 80% per `testing-strategy.md`
- [ ] Trust-boundary check: every `journey.runJourney` call sees args that already passed F14 `wrapWithValidation` (verified by reading the workspace-resident `createVaahstoreProvider`'s signature, which wraps every `callTool` body via the F14 wrap-at-registration contract enforced in M5.2-T2-1)
- [ ] Docs update: `examples/playground-ecommerce/docs/agent-journey.md` is published with the 9-step state diagram and event-to-tool-call table

## Testing Checklist

- [ ] Unit tests: `session.test.ts`, `intents.test.ts`, `journey.test.ts` — one Bun test per AC, `testId` references match
- [ ] Property test: fast-check 10K random event sequences — `journey.transition` never crashes, always lands on a defined step or a documented terminal state
- [ ] Integration test: a single Playwright run covers EJG-AC1 + EJG-AC2 + EJG-AC3 (browser-context isolation between AC2 and AC1 is the trick)
- [ ] E2E smoke: the Playwright run captures a video + screenshot for each AC's success state (stored at `examples/playground-ecommerce/e2e/__screenshots__/`)
- [ ] Conformance: every `render_component` call in `journey.ts` uses a name that exists in M5.2-T3's `registry/components.ts` (compile-time enforced by `import type`)
- [ ] Regression: the existing `examples/playground/e2e/` suite still passes (the new workspace does not break the existing one)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
| --- | --- | --- | --- | --- |
| M5.2-T5-01 | Author `agent/prompts.ts` (4 seed prompts) | ⚪ Not Started | ❌ No | Medium |
| M5.2-T5-02 | Author `agent/session.ts` (localStorage round-trip) | ⚪ Not Started | ✅ Yes | High |
| M5.2-T5-03 | Author `agent/intents.ts` (event → tool-call table) | ⚪ Not Started | ✅ Yes | Critical |
| M5.2-T5-04 | Author `agent/journey.ts` (9-step state machine) | ⚪ Not Started | ✅ Yes | Critical |
| M5.2-T5-05 | Author `agent/README.md` (four-file split + state diagram) | ⚪ Not Started | ❌ No | Medium |
| M5.2-T5-06 | Wire `journey.ts` into the workspace's chat-panel handler | ⚪ Not Started | ✅ Yes | High |
| M5.2-T5-07 | Playwright `journey.spec.ts` (EJG-AC1, EJG-AC2, EJG-AC3) | ⚪ Not Started | ✅ Yes | Critical |
| M5.2-T5-08 | Full smoke: `test && e2e && build` all green | ⚪ Not Started | ✅ Yes | Critical |

## Dependencies

- **Requires:** M5.2-T2 (chat provider tools), M5.2-T3 (registry entries — `intents.ts` references component names), M5.2-T4 (UI components emit the events `intents.ts` consumes)
- **Blocks:** End of milestone. No downstream tasks. This is the gate that closes M5.2.

## Documentation References

- Source: `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md` §4 (agent/ layout), §7 (seed prompts), §9 (EJG-AC1, EJG-AC2, EJG-AC3, EJG-COMP-1–5)
- Agent-bridge precedent: M5-T5 + `packages/agent-bridge/`
- Chip-fill-and-submit pipeline: M5-T6 (`task-M5-T6-suggestive-prompts-and-registry-selector.md`)
- Event-to-tool-call pattern: M5-T7 (`task-M5-T7-component-event-interactivity.md`) — CityPicker + WeatherCard
- Playwright precedent: `examples/playground/e2e/` + `examples/mantine/e2e/` (M5.1-T13 walkthrough)
- GenicUI vs playground gap: memory `genicui-docs-vs-playground-gap.md` — the new workspace uses the same patterns as the playground, so it shares the same gap profile (the gap is documented, not hidden)

## Notes

- **The state machine is plain TypeScript**, not XState / Zustand. Same precedent as `M5-T7`'s `journey.ts`. If a future task ever needs more than ~200 lines, surface to user — don't introduce a dependency.
- **EJG-AC2's "close the browser, reopen"** is the trickiest e2e step. Playwright's `browser.newContext()` gives isolation; the test must (a) complete EJG-AC1 in context A, (b) capture `localStorage` payload from A, (c) seed that payload into context B's `localStorage` before page-load (via `addInitScript`), (d) visit `/` in context B and assert the order resolves. This pattern is reused from `M5.1-T13`'s Mantine walkthrough.
- **Honour the velocity directive:** if the Playwright spec exceeds 200 lines, split into 3 separate files (`journey-ac1.spec.ts`, `journey-ac2.spec.ts`, `journey-ac3.spec.ts`) rather than one big file — same tests, easier debugging, parallel CI.
- **What this task is NOT:** it does not introduce a new GenicUI feature, a new MCP tool, a new transport, a new trust-boundary primitive, or a new package. It is purely additive — wiring existing primitives (F13/F14/F16/F17/F18/F37/F42/F43/F76) into a coherent end-to-end showcase. If any of those primitives proves insufficient, surface to the user — the right answer is a new manifest feature, not a workaround.
- **Workspace-resident provider, not core (locked 2026-09-17).** `intents.ts` calls the workspace-resident VaahStore provider via the workspace's local `getProviderAdaptor('vaahstore')` (resolved by `examples/playground-ecommerce/server/providers/registry.ts`). It does NOT touch `packages/server/src/chat/providers/`. F14 wrap-at-registration is enforced by the workspace's `registerProvider` (added by M5.2-T2-1) — every tool call inherits the wrap contract.
- **Docs update landed in this task.** `examples/playground-ecommerce/docs/agent-journey.md` is authored as part of the Implementation Plan (Step 11). It documents the four-file split, the 9-step state diagram, the event-to-tool-call mapping, and the session-storage shape. Cross-links to M5.2-T3's `components.md`, M5.2-T4's `ui-vue.md`, and M5.2-T2-1's `docs/content/2.concepts/9.providers.md`.