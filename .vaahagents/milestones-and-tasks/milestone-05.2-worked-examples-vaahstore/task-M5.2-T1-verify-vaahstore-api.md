# Task M5.2-T1 — Verify VaahStore API surface (7 assumptions)

> **Milestone:** M5.2 (Worked Examples: VaahStore Guest-Shopper Journey)
> **Manifest feature:** None new — pre-implementation verification gate for F13/F14/F16 tool surface
> **Priority:** Critical (gating — must complete before M5.2-T2 tool schemas are frozen)
> **Status:** ✅ Completed (2026-09-17)
> **Estimated Effort:** 2 days
> **Outcome:** All 7 §6 assumptions resolved (1 ✅ verified, 6 🟡 fallback-downgraded, 0 🔴 blocked). No 🔴 blocked items, no user notification required before M5.2-T2 begins.

## Description

The journey spec at `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md` §6 lists **seven VaahStore API assumptions** that were unverified at draft time (the `/vaahstore/api` page and Basics subpages returned HTTP 500 from the fetcher). Until these are confirmed or downgraded to fallbacks, the tool schemas in M5.2-T2 and the agent decisions in M5.2-T5 are speculative. This task is the single source of truth for whether each assumption holds.

## Task Goals

- Resolve each of the 7 assumptions in §6 of the journey spec to **verified / fallback-downgraded / blocked**
- Produce a single short report (`examples/playground-ecommerce/docs/vaahstore-api-verification.md`) that the implementer of M5.2-T2/T5 reads first
- Where verification is blocked (e.g. docs still 500), pick the documented fallback and write the choice into the report so M5.2-T2 can build it from day one
- No production code lands in this task — verification only

## Implementation Plan

> ⚠️ Analyze this plan thoroughly before implementing. Invoke relevant skills and MCP servers as needed.

### Pre-Implementation Analysis

- The journey spec §6 already enumerates the 7 assumptions — start there, do not re-derive them
- The cartviewer.md precedent at `.vaahagents/requirements/idea/examples-cartviewer.md` shows the read-first pattern (sibling idea doc, not a manifest feature)
- If docs.vaah.dev remains unreachable, **do not** silently skip the verification — record the blocker in the report and pick the fallback documented in §6's "Fallback" column
- Reference the locked decisions in `.vaahagents/requirements/idea/consolidated-requirements.md` if any assumption would change a trust-boundary guarantee (none should — F14 `wrapWithValidation` is already schema-strict by construction)

### Steps

1. Attempt to fetch each of the 7 assumption docs from `docs.vaah.dev/vaahstore/` using `WebFetch`; record HTTP status + first paragraph for each
2. For the **base URL** (`{host}/api/vaahstore/v1/`) — verify by reading the setup/install docs; cross-check against any VaahStore demo instance the user has access to
3. For **minor-units pricing** — read the Product Stocks docs; verify by inspecting a real product response
4. For **token-based guest cart** — read the Carts docs; if absent, commit to the documented fallback (transient `is_guest=1` customer record per Customer Groups doc) and note the choice
5. For **order-lookup-by-email** — read the Orders docs; if absent, commit to the documented fallback (one-time signed token emailed at checkout, marked out-of-scope for the playground demo)
6. For **filterable variation attributes** — read Product Variations + Attributes docs
7. For **per-store bearer token** — read the authentication section
8. For **multi-store `store_id` scoping** — read the Stores doc
9. Write the report at `examples/playground-ecommerce/docs/vaahstore-api-verification.md` with a table mapping each assumption → resolution + citation link
10. Surface any unresolved blockers to the user before M5.2-T2 begins — do not silently proceed with speculative schemas

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
| --- | --- | --- |
| `WebFetch` | Re-attempt the `/vaahstore/api` fetch with a fresh user agent if the original fetcher 500'd | Step 1 |
| `WebSearch` | Cross-check any ambiguous doc claim with the broader VaahStore community / GitHub issues | When WebFetch is silent |
| `sequential-thinking` | When a single assumption spans multiple endpoints (e.g. cart token flow vs. customer cart fallback) | Step 4–5 |

## Acceptance Criteria

- **M5.2-T1-AC1** — Report exists at `examples/playground-ecommerce/docs/vaahstore-api-verification.md` and covers all 7 §6 assumptions
- **M5.2-T1-AC2** — Each assumption is marked one of: ✅ Verified / 🟡 Fallback-downgraded / 🔴 Blocked
- **M5.2-T1-AC3** — Each resolved assumption cites either a docs URL with timestamp or a specific code path in the fallback (e.g. "use `POST /customers` with `is_guest=1` per the Customer Groups doc")
- **M5.2-T1-AC4** — For every 🟡 Fallback-downgraded assumption, M5.2-T2's tool schema can be written *without* further research (the fallback is concrete enough to implement from)
- **M5.2-T1-AC5** — For every 🔴 Blocked assumption, the user has been notified before this task is closed

## Completion Criteria

- [x] All 5 acceptance criteria above pass
- [x] `examples/playground-ecommerce/docs/` directory created
- [x] Report cross-references from M5.2-T2 (tool schemas) and M5.2-T5 (journey state machine) point back to this report (see "Summary for M5.2-T2" and "Implication for M5.2-T2 / T3" sections)
- [x] Any 🔴 Blocked assumption has an explicit user-visible note in the final completion report — none, so N/A

## Testing Checklist

- [x] No production code lands in this task — verification is read-only (only `examples/playground-ecommerce/docs/vaahstore-api-verification.md` written)
- [x] Report is human-readable (markdown table, links, status emojis; TL;DR table at top)
- [x] If WebFetch was used, the fetcher's output is preserved as quotes in the report so a future verifier can re-check — WebFetch on docs.vaah.dev/vaahstore/api returned HTTP 500, recorded in §"Verification methodology"; primary verification used direct source-code inspection of the webreinvent/vaahstore repo (cloned 2026-09-17)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
| --- | --- | --- | --- | --- |
| M5.2-T1-01 | Re-attempt `/vaahstore/api` fetch + catalogue HTTP status of all Basics subpages | ✅ Completed | ❌ No | High |
| M5.2-T1-02 | Verify base URL convention (`{host}/api/vaahstore/v1/`) | ✅ Completed (🟡 Fallback: real is `{host}/api/store/<resource>`, no `vaahstore` segment, no `/v1/`) | ❌ No | High |
| M5.2-T1-03 | Verify minor-units pricing convention | ✅ Completed (🟡 Fallback: decimal floats in Currency.code, NOT minor units) | ❌ No | High |
| M5.2-T1-04 | Verify token-based guest cart (or commit to transient `is_guest=1` customer fallback) | ✅ Completed (🟡 Fallback: Cart UUID with nullable `vh_user_id`; checkout bridge via `POST /carts/{uuid}/user` after `POST /sign-up`. No `is_guest=1` flag exists upstream.) | ❌ No | High |
| M5.2-T1-05 | Verify order-lookup-by-email (or commit to signed-token-out-of-scope fallback) | ✅ Completed (🟡 Fallback: no public order endpoint; orders group is fully `auth:api`. Step 8 resolved via auto sign-in from stored credentials in `localStorage`.) | ❌ No | High |
| M5.2-T1-06 | Verify variation filterable attributes + bearer-token per-store + multi-store `store_id` | ✅ Completed (🟡×3 Fallback: variation filter = `filter[product_variations][]=<slug>`; bearer token is per-user Sanctum `PersonalAccessToken`; store scoping via `?selected_store=<id>` query param) | ❌ No | Medium |
| M5.2-T1-07 | Write the consolidated verification report | ✅ Completed at `examples/playground-ecommerce/docs/vaahstore-api-verification.md` | ❌ No | High |

## Dependencies

- **Requires:** None
- **Blocks:** M5.2-T2 (tool schemas), M5.2-T3 (registry entries reference verified schema fields), M5.2-T5 (journey state machine)

## Documentation References

- Source: `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md` §6 (assumptions) + §1 (persona)
- Destination: `examples/playground-ecommerce/docs/vaahstore-api-verification.md` (written by this task)
- Locked decisions: `.vaahagents/requirements/idea/consolidated-requirements.md` §B (trust boundary — assumed unchanged by verification)

## Notes

- This task is the **cheapest insurance** in the milestone — 2 days of reading prevents 3+ days of schema rework in M5.2-T2 if the assumptions prove wrong
- Honour the velocity directive: if even 4 of 7 assumptions remain blocked after this task, surface to user before T2 begins. Do not ship speculative schemas.
- If VaahStore publishes a `/openapi.json` or similar machine-readable spec, use that as the primary source over the human-readable docs