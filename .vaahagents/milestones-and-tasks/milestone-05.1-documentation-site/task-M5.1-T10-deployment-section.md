# Task M5.1-T10 — Deployment section (4 landing pages)

> **Milestone:** M5.1 (Documentation Site)
> **Manifest feature:** F71f (new — Deployment section in docs)
> **Priority:** Medium
> **Status:** ⚪ Not Started
> **Estimated Effort:** 1 day

## Description

Author the four Deployment section landing pages. **This is a documentation section only** — the actual runtime deployment (Cloudflare Workers, Bun self-host, Nitro binding) is owned by M6-T1, M6-T2, M6-T4 and lives in `.vaahagents/requirements/specs/deployment.md`. The doc-site Deployment section is a 4-page overview + decision matrix + cross-links to M6's deep dives. The fifth "Deploy the doc site itself" angle is owned by T12 (Vercel deploy).

## Task Goals

- Author `content/6.deployment/1.overview.md` — when to choose Cloudflare / Bun / Vercel (hosting this doc site)
- Author `content/6.deployment/2.cloudflare.md` — landing page that links out to M6-T1 (Cloudflare Workers + DO) deep dive
- Author `content/6.deployment/3.bun-self-host.md` — links out to M6-T2 (Bun self-host) deep dive
- Author `content/6.deployment/4.nitro.md` — links out to M6-T4 (Nitro/Nuxt binding) deep dive
- Each page ends with a "See also" link to the corresponding M6 task file in `.vaahagents/milestones-and-tasks/milestone-06-deployment/`
- Each page is intentionally short (≤ 300 lines) — this is documentation about deployment, not the deployment itself

## Implementation Plan

### Pre-Implementation Analysis

- This task is intentionally a **landing-page section**, not a full deployment guide. The full deployment guides are owned by M6-T1, M6-T2, M6-T4 (3 deep-dive tasks) — that work has not started yet
- The doc-site itself runs on Vercel (owned by T12)
- Audit `.vaahagents/requirements/specs/deployment.md` for the decision matrix structure (cost, latency, ops complexity, regional footprint)
- Cross-link to the existing `.vaahagents/milestones-and-tasks/milestone-06-deployment/` task files when those are authored

### Steps

1. Author `content/6.deployment/1.overview.md`:
   - Frontmatter: title "Deployment Overview", description "Choosing where to run GenicUI.", `navigation.icon: lucide-globe`
   - Decision matrix table:
     - **Cloudflare Workers + DO**: edge-first, hibernation, pay-per-request; best for global low-latency
     - **Bun self-host**: full control, simple ops, predictable cost; best for on-prem or single-region
     - **Vercel** (doc-site only, T12): best-in-class DX for static docs, preview deploys per PR
     - **Nitro** (M6-T4): same-origin with a Nuxt host app; best when GenicUI is one feature of a larger app
   - "Pick one" flowchart (ASCII): traffic profile → cold-start tolerance → ops preference → recommendation
   - Cross-link: each option links to its respective page (2/3/4) and to the M6 task files
2. Author `content/6.deployment/2.cloudflare.md`:
   - Frontmatter: title "Cloudflare Workers", description "Deploy to Cloudflare Workers + Durable Objects.", `navigation.icon: lucide-cloud`
   - One-paragraph summary of the architecture
   - "Prerequisites" checklist: Cloudflare account, wrangler CLI, DO enabled
   - "Quick links":
     - Deep dive: M6-T1 task file
     - Spec: `.vaahagents/requirements/specs/deployment.md`
     - Code: `packages/server/` (Cloudflare adapter)
   - "Trade-offs" section: cold starts, 30s request limit, DO pricing
3. Author `content/6.deployment/3.bun-self-host.md`:
   - Frontmatter: title "Bun Self-Host", description "Deploy as a Bun binary.", `navigation.icon: lucide-server`
   - Quick links to M6-T2 + spec
   - One-paragraph summary: `bun run start` + `bun build --compile` produces a single binary
   - "Trade-offs": ops responsibility, no auto-scaling
4. Author `content/6.deployment/4.nitro.md`:
   - Frontmatter: title "Nitro / Nuxt Binding", description "Embed GenicUI in a Nuxt app.", `navigation.icon: lucide-package`
   - Quick links to M6-T4 + spec
   - One-paragraph summary: same-origin WS at `/api/ws`, no CORS
   - "Trade-offs": tied to Nuxt release cycle; can't run on Cloudflare Workers
5. Run `bun --filter docs build`; verify all 4 pages build with no broken links
6. Verify each "Quick links" target exists (the M6 task files; if not yet authored, surface to user)

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `context7` MCP | Docus MDC `::callout`, `::tabs`, `code-block` syntax | All 4 pages |
| `filesystem` MCP | Read `.vaahagents/requirements/specs/deployment.md` for the decision matrix source | Step 1 |

## Acceptance Criteria

- AC1: All 4 pages render with correct titles, descriptions, icons
- AC2: Decision matrix on `1.overview.md` lists Cloudflare / Bun / Vercel / Nitro with their trade-offs
- AC3: Each option page links to its corresponding M6 task file (if it exists; if not, link to the spec)
- AC4: Each page is under 300 lines (this section is intentionally thin — deep dives are M6's job)
- AC5: No duplicated content — this section does NOT re-write the deployment guide, it routes to it
- AC6: `bun --filter docs build` exits 0 with no broken links
- AC7: Lighthouse score ≥ 90 per page
- AC8: Pages render correctly in light + dark mode

## Completion Criteria

- [ ] All 8 acceptance criteria above pass
- [ ] `bun --filter docs build` succeeds
- [ ] `bun --filter docs lint` exits 0
- [ ] Every "Quick links" target verified to exist (or flagged if M6 task files aren't authored yet)

## Testing Checklist

- [ ] Manual: read each page; verify it's a landing page, not a deep dive
- [ ] Link-check: every "Quick links" target resolves (or is flagged)
- [ ] Visual: Lighthouse score per page
- [ ] Accessibility: axe-core scan per page
- [ ] No property tests (N/A — content)
- [ ] No trust-boundary touch (N/A — content)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
|---|---|---|---|---|
| M5.1-T10-01 | Author `1.overview.md` (decision matrix) | ⚪ Not Started | ✅ Yes | Medium |
| M5.1-T10-02 | Author `2.cloudflare.md` (landing) | ⚪ Not Started | ✅ Yes | Medium |
| M5.1-T10-03 | Author `3.bun-self-host.md` (landing) | ⚪ Not Started | ✅ Yes | Medium |
| M5.1-T10-04 | Author `4.nitro.md` (landing) | ⚪ Not Started | ✅ Yes | Medium |
| M5.1-T10-05 | Build + link-check | ⚪ Not Started | ✅ Yes | Medium |

## Dependencies

- **Requires:** M5.1-T1 (scaffold), M5.1-T3 (IA), M5.1-T6 (Concepts > Frames / Tools pages exist for cross-link context)
- **Soft dependency:** M6-T1 / M6-T2 / M6-T4 task files exist (so Quick links resolve) — if not authored yet, links go to spec only and T10 flags this in the commit body
- **Blocks:** None directly. Deployment section is terminal in the doc site.

## Documentation References

- Deployment spec: `.vaahagents/requirements/specs/deployment.md` (post-T2)
- M6 task files (when authored): `.vaahagents/milestones-and-tasks/milestone-06-deployment/task-M6-T1-*.md`, etc.
- Vercel deploy guide (T12): this task's deploy is the doc site itself, not GenicUI runtime

## Notes

- **This is documentation, not deployment.** The actual Cloudflare / Bun / Nitro deployment work is owned by M6. Don't conflate the two.
- **Pages must be thin.** If a page grows past 300 lines, it's drifting into deep-dive territory — flag to user.
- **Trade-offs matter more than features.** Readers choosing between options care about *what they give up*, not what they gain.
- **Don't recommend Vercel for GenicUI runtime.** Vercel is the doc-site host (T12). For GenicUI itself, the choices are Cloudflare / Bun / Nitro.
- **Tone: opinionated, comparison-driven.** The decision matrix should make the choice obvious given the reader's constraints.
