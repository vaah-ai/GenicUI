# Task M5.1-T12 — Vercel deploy + smoke test

> **Milestone:** M5.1 (Documentation Site)
> **Manifest feature:** F73 (new — Vercel deploy)
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 0.5 day

## Description

Wire up Vercel deployment for the doc site at `examples/docs/`. Vercel provides preview-per-PR via GitHub integration, production deploys on merge to `main`, and the `Accept: text/markdown` header rewrite (independently validates the Vercel choice over Cloudflare for this artifact). This task links the Vercel project, configures the build, and runs the milestone's integration smoke test.

## Task Goals

- Create / link a Vercel project pointing at `examples/docs/`
- Configure build command (`bun --filter docs build`) and output directory (`.output/public`)
- Configure GitHub integration: preview deploy on every PR, production deploy on merge to `main`
- Add the Vercel project badge to the README and to the landing page
- Run the milestone's 10-point integration smoke test (per `milestone-05.1.md` §Smoke Test)
- Document the deploy process in `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/vercel-deploy.md`

## Implementation Plan

### Pre-Implementation Analysis

- Vercel project must be linked via Vercel CLI or dashboard. Verify the Vercel team / account with the user before linking
- Root directory for the Vercel project = `examples/docs/` (NOT the repo root, because that contains the entire monorepo)
- Build command: `bun --filter docs build` (uses the workspace filter; requires `bun install` first)
- Output directory: `.output/public` (Docus static output)
- Env vars: none required for the static site; `SITE_URL` is set at build time via Docus's `app.config.ts`
- Domain: `https://genicui.dev` is a placeholder; user must register and configure DNS

### Steps

1. Install Vercel CLI: `bun add -g vercel` (or use `npx vercel`)
2. `cd examples/docs && vercel link` — link to existing project or create a new one (project name = `genicui-docs`)
3. Author `examples/docs/vercel.json`:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "buildCommand": "bun --filter docs build",
     "outputDirectory": ".output/public",
     "framework": "nuxtjs",
     "headers": [
       {
         "source": "/llms-full.txt",
         "headers": [{ "key": "Cache-Control", "value": "public, max-age=3600" }]
       }
     ]
   }
   ```
4. Configure GitHub integration (via Vercel dashboard or CLI):
   - Production branch: `main`
   - Preview branches: all others
   - Auto-deploy on PR: enabled
5. Add Vercel project badge to `README.md` (root): `[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=...)`
6. Add the badge + last-deployed timestamp to the landing page footer
7. Run the 10-point integration smoke test (per `milestone-05.1.md` §Smoke Test):
   - `vercel deploy --prod` exits 0
   - `curl -I https://genicui.dev/docs/getting-started/introduction` returns 200
   - `curl https://genicui.dev/llms.txt` returns 200
   - `curl https://genicui.dev/llms-full.txt` returns 200
   - `curl -H "Accept: text/markdown" https://genicui.dev/docs/getting-started/introduction` returns raw markdown
   - `curl https://genicui.dev/raw/docs/getting-started/introduction.md` returns 200
   - Site search returns hits for `render_component`, `trust boundary`, `PrimeVue`, `AG-UI`
   - Vercel preview URL for a test PR shows the same content + `[PR #N]` banner
   - Lighthouse CI score ≥ 90 on the landing page
   - `bunx link-check` reports zero broken internal links
8. Document the deploy process in `vercel-deploy.md`:
   - How to link a new Vercel account
   - How to add custom domain (when DNS ready)
   - How to roll back (Vercel keeps every deploy; instant rollback)
   - How to configure env vars (currently none, but documented for future)
9. Tag a release on `main` (e.g., `v0.0.1-docs`); commit a CHANGELOG entry
10. Announce the launch on the project's social channels (manual, not automated)

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `vercel:deployment-expert` MCP | Vercel project linking, preview/ production config, custom domain | Steps 2, 4, 8 |
| `vercel:performance-optimizer` MCP | CDN cache headers, edge config, image optimization | Step 3 |
| `websearch` | Vercel Nuxt 4 + Docus deployment guide | Pre-Implementation |

## Acceptance Criteria

- AC1: `vercel link` succeeds; project `genicui-docs` is linked to the workspace
- AC2: `examples/docs/vercel.json` is committed with correct build command and output directory
- AC3: `vercel deploy --prod` exits 0
- AC4: Production URL returns 200 for `/`, `/docs/getting-started/introduction`, `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`, `/robots.txt`
- AC5: `curl -H "Accept: text/markdown" <url>` returns raw markdown (Vercel-specific behavior verified)
- AC6: `curl <url>/raw/...` returns raw markdown for every page
- AC7: Site search returns hits for `render_component`, `trust boundary`, `PrimeVue`, `AG-UI`
- AC8: A test PR's preview URL shows the same content + an injected `[PR #N]` banner
- AC9: Lighthouse score ≥ 90 in all 4 categories on the landing page
- AC10: `bunx link-check` (or equivalent) reports zero broken internal links on first production deploy
- AC11: `vercel-deploy.md` documents the deploy process, rollback, and custom-domain setup
- AC12: Vercel project badge added to root README and landing-page footer

## Completion Criteria

- [ ] All 12 acceptance criteria above pass (these are the milestone's 10-point smoke test + 2 docs/badges)
- [ ] Production URL is reachable and serves all expected artifacts
- [ ] Lighthouse CI run committed
- [ ] `vercel-deploy.md` committed
- [ ] Release tag `v0.0.1-docs` pushed to `main`
- [ ] Dashboard updated: M5.1 status promoted to 🟢 Complete

## Testing Checklist

- [ ] Smoke: `vercel deploy --prod` exits 0
- [ ] Smoke: production URL serves all expected artifacts
- [ ] Smoke: `Accept: text/markdown` header works
- [ ] Smoke: search returns hits
- [ ] Lighthouse CI: per-page scores ≥ 90
- [ ] Link-check: zero broken internal links
- [ ] Visual: production site matches local `bun --filter docs preview` output
- [ ] Visual: preview deploys on PR show a `[PR #N]` banner
- [ ] No property tests (N/A — deploy verification)
- [ ] No trust-boundary touch (N/A — static site, no input)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
|---|---|---|---|---|
| M5.1-T12-01 | `vercel link` + author `vercel.json` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T12-02 | Configure GitHub integration (preview + production) | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T12-03 | Add Vercel badge to README + landing footer | ⚪ Not Started | ❌ No | Low |
| M5.1-T12-04 | Run 10-point integration smoke test | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T12-05 | Author `vercel-deploy.md` | ⚪ Not Started | ❌ No | Medium |
| M5.1-T12-06 | Tag release `v0.0.1-docs` + dashboard update | ⚪ Not Started | ✅ Yes | High |

## Dependencies

- **Requires:** ALL prior M5.1 tasks (T1–T11) — production deploy needs a complete site
- **Hard dependency:** `vercel link` requires the user to have a Vercel account and authorize the CLI; if not, surface and ask
- **Soft dependency:** custom domain (`genicui.dev`) requires DNS to be configured by the user; without it, the site runs on the default `*.vercel.app` URL
- **Blocks:** None. This is the terminal task of M5.1.

## Documentation References

- Vercel CLI: https://vercel.com/docs/cli
- Vercel Nuxt deployment: https://vercel.com/docs/frameworks/nuxt
- Vercel custom domain: https://vercel.com/docs/custom-domains
- Vercel rollback: https://vercel.com/docs/deployments/rollbacks
- Vercel project badges: https://vercel.com/docs/embeddables/badges
- Docus deployment: https://docus.dev/en/deploy
- Industry reference: Nuxt deploy guide (https://nuxt.com/docs/getting-started/deployment) — anatomy of a good deploy doc

## Notes

- **Vercel CLI may require interactive auth.** If running in a non-interactive environment, use `vercel login --github` or a pre-generated token.
- **`vercel link` is one-time per workspace.** After linking, all subsequent `vercel deploy` commands use the linked project.
- **Root directory matters.** Vercel must use `examples/docs/` as the root, not the repo root. Configure this in the Vercel dashboard or via `vercel.json`.
- **Domain is placeholder until user registers `genicui.dev`.** Without a custom domain, the production URL is `https://genicui-docs.vercel.app`. Document this; do NOT ship with a placeholder URL.
- **Preview deploys are the killer feature.** Every PR gets its own URL; reviewers can click through to see the docs change live. Document this in the PR template.
- **Lighthouse is a hard target for production.** Verify before tagging the release; otherwise the production deploy gets demoted to a preview.
- **Rollback is instant.** Vercel keeps every deploy. If a production deploy breaks, `vercel rollback` reverts to the previous deploy in seconds.
- **Tag the release.** `v0.0.1-docs` marks the first production deploy; future deploys can be `v0.0.2-docs`, etc., or move to semver once the framework itself hits v0.1.0.
- **Smoke test failures are blockers.** If any of the 10 points fails, do NOT promote M5.1 to 🟢 Complete; fix and re-test.
