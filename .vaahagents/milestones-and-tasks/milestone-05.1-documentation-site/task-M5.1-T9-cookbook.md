# Task M5.1-T9 — Cookbook (4–6 recipes)

> **Milestone:** M5.1 (Documentation Site)
> **Manifest feature:** F71e (new — Cookbook section)
> **Priority:** Medium
> **Status:** ⚪ Not Started
> **Estimated Effort:** 1 day

## Description

Author the Cookbook — short, problem-oriented recipes for common (or tricky) tasks. Each recipe solves one specific problem in < 200 lines, with a copy-paste-runnable code example and a "Verification" section stating the observable outcome. Cookbooks are the section readers reach for when stuck; quality > quantity.

## Task Goals

- Author 4–6 recipes (target: 5):
  - `content/5.cookbook/1.auth-cookbook.md` — API key + custom auth wrapping
  - `content/5.cookbook/2.retry-cookbook.md` — backoff, idempotency, dead-letter
  - `content/5.cookbook/3.custom-event-cookbook.md` — non-COMPONENT_EVENT surfaces (drag, hover, focus)
  - `content/5.cookbook/4.multi-channel-cookbook.md` — concurrent channels, cross-channel coordination
  - `content/5.cookbook/5.registry-versioning-cookbook.md` — pin / upgrade / co-exist
  - `content/5.cookbook/6.testing-cookbook.md` — mocking MCP, in-memory session, Playwright recipe
- Each recipe follows the same template: Problem → Solution → Code → Verification → Pitfalls
- Each recipe cross-links to the related Concepts page and API Reference entry

## Implementation Plan

### Pre-Implementation Analysis

- Audit the existing `examples/` and `registries/` for reusable code excerpts
- Pick 4–6 recipes by impact × clarity tradeoff; if a 5th is forced, skip rather than write a weak one
- Confirm code excerpts match the actual API surface (cite source path)
- Verify against `@genicui/agent-bridge` (auth + retry), `@genicui/client` (events + multi-channel), and the registry contract (versioning)

### Steps

1. Author `content/5.cookbook/1.auth-cookbook.md`:
   - Problem: "I need to use a custom auth scheme (OAuth, JWT, mTLS) instead of API keys."
   - Solution: Wrap the `Authorization` header validation in a custom middleware
   - Code: `examples/auth-cookbook/` reference implementation
   - Verification: `curl -H "Authorization: Bearer <jwt>" http://localhost:3040/mcp` returns 200
   - Pitfalls: don't bypass the trust boundary; auth must run BEFORE `stripProtoKeys`
   - Cross-link: Concepts > Trust Boundary, API Reference > Server
2. Author `content/5.cookbook/2.retry-cookbook.md`:
   - Problem: "My agent retries `render_component` after a timeout — how do I avoid double-mount?"
   - Solution: Idempotency keys (`X-Idempotency-Key`) + server-side dedup
   - Code: client-side retry with backoff + idempotency key generation
   - Verification: send 5 identical requests with the same key; server mounts exactly once
   - Pitfalls: idempotency keys expire (24h default); don't reuse keys across render vs update
   - Cross-link: Concepts > Frames, API Reference > Server > update_component
3. Author `content/5.cookbook/3.custom-event-cookbook.md`:
   - Problem: "I want to capture drag, hover, and focus events, not just click."
   - Solution: Custom event types with `composed: true` + payload schema
   - Code: GenicElement subclass that emits `drag_started`, `drag_ended`, `hover_changed`, `focus_changed`
   - Verification: drag a row in the example; agent receives `drag_started` with `{ rowId, x, y }`
   - Pitfalls: events must be debounced (drag fires 100s/sec); payload size must be bounded
   - Cross-link: Concepts > Events, API Reference > Client > GenicElement
4. Author `content/5.cookbook/4.multi-channel-cookbook.md`:
   - Problem: "I want to render 3 components concurrently and coordinate their state."
   - Solution: One channel per component, channel 0 for coordination
   - Code: example with a master component that drives 2 child components via channel 0 events
   - Verification: click the master; both children update; agent sees all 3 events in seq order
   - Pitfalls: 256-channel limit per socket; backpressure on channel 0
   - Cross-link: Concepts > Frames, API Reference > Core > validateChannel
5. Author `content/5.cookbook/5.registry-versioning-cookbook.md`:
   - Problem: "Two registries declare the same component name with different schemas."
   - Solution: Trust-tier resolution (project > user > remote); explicit pinning
   - Code: `registry.json` with version constraints + co-existence pattern
   - Verification: install two registries with conflicting DataTable; project-tier wins; explicit pin overrides
   - Pitfalls: trust tier resolution is silent; surface warnings via logs
   - Cross-link: Concepts > Registries, Guides > Custom Registry
6. Author `content/5.cookbook/6.testing-cookbook.md`:
   - Problem: "I want to test an agent → component → event flow without a real MCP client."
   - Solution: in-memory session store + Playwright + mock MCP client
   - Code: `examples/testing-cookbook/` reference
   - Verification: `bun test examples/testing-cookbook` passes; Playwright records the full flow
   - Pitfalls: don't mock the trust boundary; tests must run against the real server
   - Cross-link: Guides > Testing, API Reference > Core > InMemoryStore
7. Run `bun --filter docs build`; verify all recipes build with no broken links
8. Verify each code excerpt actually runs (cherry-pick the most non-trivial one and execute it)

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `context7` MCP | Docus MDC `code-group`, `code-block`, `:kbd` syntax | All recipes |
| `filesystem` MCP | Read package source to verify code excerpts | All steps |
| `websearch` | Industry recipe patterns (e.g. Stripe Cookbook) | Pre-Implementation |

## Acceptance Criteria

- AC1: 4–6 recipes authored (target: 5; minimum: 4)
- AC2: Each recipe follows the Problem → Solution → Code → Verification → Pitfalls template
- AC3: Each recipe is under 200 lines (long recipes are anti-pattern)
- AC4: Each "Verification" section states an observable outcome
- AC5: Each recipe cross-links to at least 1 Concepts page and 1 API Reference entry
- AC6: Code excerpts are copy-paste-runnable
- AC7: `bun --filter docs build` exits 0 with no broken links
- AC8: Lighthouse score ≥ 90 per page
- AC9: Pages render correctly in light + dark mode

## Completion Criteria

- [ ] All 9 acceptance criteria above pass
- [ ] `bun --filter docs build` succeeds
- [ ] `bun --filter docs lint` exits 0
- [ ] At least one reference implementation (`examples/<recipe>/`) committed per recipe

## Testing Checklist

- [ ] Manual: read each recipe; verify it solves the stated problem
- [ ] Smoke: at least one recipe's code runs end-to-end in a fresh sandbox
- [ ] Link-check: every internal `[[link]]` resolves
- [ ] Visual: Lighthouse score per page
- [ ] Accessibility: axe-core scan per page
- [ ] No property tests (N/A — content)
- [ ] No trust-boundary touch (N/A — recipes describe patterns, not security implementation)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
|---|---|---|---|---|
| M5.1-T9-01 | Author `1.auth-cookbook.md` | ⚪ Not Started | ✅ Yes | High |
| M5.1-T9-02 | Author `2.retry-cookbook.md` | ⚪ Not Started | ✅ Yes | High |
| M5.1-T9-03 | Author `3.custom-event-cookbook.md` | ⚪ Not Started | ✅ Yes | Medium |
| M5.1-T9-04 | Author `4.multi-channel-cookbook.md` | ⚪ Not Started | ✅ Yes | Medium |
| M5.1-T9-05 | Author `5.registry-versioning-cookbook.md` | ⚪ Not Started | ✅ Yes | Medium |
| M5.1-T9-06 | Author `6.testing-cookbook.md` | ⚪ Not Started | ✅ Yes | Medium |
| M5.1-T9-07 | Build + link-check + Lighthouse pass | ⚪ Not Started | ✅ Yes | Medium |

## Dependencies

- **Requires:** M5.1-T1 (scaffold), M5.1-T3 (IA), M5.1-T6 (Concepts pages exist for cross-linking), M5.1-T8 (API Reference entries exist for cross-linking)
- **Soft dependency:** M5.1-T2, M5.1-T7 (Guides > Testing cross-links to Cookbook > Testing)
- **Blocks:** None directly. Cookbook is terminal — it consumes everything prior.

## Documentation References

- Stripe Cookbook (industry reference): https://stripe.com/docs/recipes
- Twilio Cookbook: https://www.twilio.com/docs/cookbook
- Per-package source: `packages/*/src/` (post-T2)
- Industry reference: Laravel "Recipes" https://laravel.com/docs (anatomy of a good cookbook)

## Notes

- **Quality > quantity.** If a 5th recipe is forced, ship 4 strong ones instead.
- **Recipes must solve real problems.** Don't pad with toy examples; cite the GitHub issue or community thread that motivated each one.
- **Code excerpts must run.** If the recipe is too complex for a single copy-paste, link to a full example in `examples/<recipe>/`.
- **Pitfalls section is non-negotiable.** Every recipe has at least one "watch out for..." pitfall; that's the value of a Cookbook over a blog post.
- **Tone: terse, direct, "here's how."** No marketing copy.
- **Cap at 6 recipes in this milestone.** Cookbooks grow organically — leave room for community PRs.
