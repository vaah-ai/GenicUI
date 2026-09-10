# Vercel Deploy Runbook — GenicUI Documentation Site

> **Task:** M5.1-T12 — Vercel deploy + smoke test
> **Manifest feature:** F73
> **Project name:** `genicui-docs`
> **Production URL (placeholder):** `https://genicui-docs.vercel.app` until `genicui.dev` DNS is configured
> **Build artifact:** `docs/.output/public/` (Docus static SSG)

This runbook documents how the GenicUI documentation site is deployed to Vercel, including the project linking, the GitHub integration, the custom-domain path, the rollback procedure, environment variables, and the 10-point integration smoke test that gates every production promotion.

---

## 1. Why Vercel

Vercel was chosen over Cloudflare Pages for the documentation site because it provides:

- **Preview-per-PR via GitHub integration.** Every pull request gets a unique URL with a `[PR #N]` banner injected by Vercel. Reviewers click through to see the docs change live without a local checkout.
- **Production-on-merge-to-main.** A merge to `main` triggers a production deploy automatically.
- **The `Accept: text/markdown` header rewrite.** Vercel's edge config supports the standard `Accept` content negotiation that turns `GET /docs/getting-started/introduction` with `Accept: text/markdown` into the raw markdown for that route — independently validating the Vercel choice over Cloudflare for this artifact.
- **Instant rollback.** Vercel keeps every deploy; a single `vercel rollback` reverts to the previous deploy in seconds.

M6 (Deployment) covers the runtime target (Cloudflare Workers). The doc site is a separate artifact with a separate hosting choice — both run in parallel.

---

## 2. One-time project setup

The first time you wire a fresh clone to a Vercel account, do this **once**:

### 2.1 Install the Vercel CLI

```bash
bun add -g vercel
# or, if you do not want a global install:
npx vercel
```

### 2.2 Authenticate

```bash
vercel login
```

This opens a browser to Vercel's device-flow authentication page. Pick the **team** that should own the `genicui-docs` project (typically `vaah-ai`). The token is stored at `~/.vercel/auth.json`.

For non-interactive CI environments, set `VERCEL_TOKEN` as an environment variable (the GitHub integration manages this for you automatically).

### 2.3 Link the project

The repo is a Bun monorepo. The Vercel project root must be `docs/`, not the repository root.

```bash
cd docs
vercel link
```

If the project does not exist yet, the CLI creates it with the name `genicui-docs`. If it does exist, the CLI links to the existing one.

The `vercel link` step writes `.vercel/project.json` and `.vercel/README.md` to `docs/`. These files are gitignored — never commit them.

### 2.4 Configure the project in the dashboard

Open the Vercel dashboard → `genicui-docs` → **Settings** → **General**:

| Setting | Value |
| --- | --- |
| Framework Preset | Nuxt.js |
| Root Directory | `docs` |
| Build Command | `bun run build` (already in `vercel.json`; verified by Vercel) |
| Output Directory | `.output/public` (already in `vercel.json`) |
| Install Command | `bun install` (already in `vercel.json`) |
| Node Version | 20.x (matches `bunfig.toml` runtime) |
| Production Branch | `main` |
| Auto-deploy on PR | enabled |

Then **Settings** → **Git**:

| Setting | Value |
| --- | --- |
| Production Branch | `main` |
| Preview Branches | all branches except `main` |
| Auto-Deploy | enabled |

Click **Save**. The dashboard now watches the repository for pushes.

---

## 3. Deploy commands

### 3.1 Preview deploy (from a feature branch)

```bash
cd docs
vercel
```

The CLI prints a `https://genicui-docs-<hash>.vercel.app` URL. That URL is the **preview deploy** — every PR also gets one automatically via the GitHub integration, but a manual `vercel` is useful for iterating before opening a PR.

### 3.2 Production deploy (from `main`)

Production deploys happen automatically on merge to `main`. To deploy manually:

```bash
cd docs
vercel deploy --prod
```

The CLI prints `https://genicui-docs.vercel.app` (or the custom domain if configured).

### 3.3 Promote a preview to production

In the Vercel dashboard, open the preview deploy → **Promote to Production**. Useful when the GitHub integration is not the deployment source (e.g., a hotfix deployed from a local branch).

---

## 4. Custom domain — `genicui.dev`

Until DNS is configured, the production URL is the default `*.vercel.app`. To attach `genicui.dev`:

### 4.1 In the Vercel dashboard

1. Open `genicui-docs` → **Settings** → **Domains**.
2. Type `genicui.dev` → click **Add**.
3. Vercel displays the required DNS records (typically an `A` record for `genicui.dev` and a `CNAME` for `www`).

### 4.2 At the DNS provider

Add the records Vercel provides:

```
A      @    76.76.21.21
CNAME  www  cname.vercel-dns.com
```

DNS propagation takes up to 48 hours, but usually resolves in under 30 minutes. Vercel auto-issues a Let's Encrypt TLS certificate the moment DNS resolves.

### 4.3 Update `nuxt.config.ts` and `app.config.ts`

Both files have a `site.url` placeholder pointing at `https://genicui.dev`. Once DNS resolves, the canonical URLs (used by `@nuxtjs/sitemap`, `nuxt-llms`, `nuxt-og-image`, and `<link rel="canonical">`) start emitting correctly.

The `NUXT_SITE_URL` environment variable in the Vercel dashboard **overrides** both files. Set it in **Settings** → **Environment Variables**:

| Variable | Value | Environment |
| --- | --- | --- |
| `NUXT_SITE_URL` | `https://genicui.dev` | Production |
| `NUXT_SITE_URL` | `https://genicui-docs-<hash>.vercel.app` | Preview |

`NUXT_SITE_URL` is the canonical Docus / Nuxt Site Config way to set the production URL — it overrides `nuxt.config.ts site.url` and `app.config.ts site.url` at build time.

---

## 5. Environment variables

Currently the documentation site is **fully static** and requires no runtime env vars. `NUXT_SITE_URL` is a build-time variable only.

Future variables (e.g., analytics keys, Algolia DocSearch app ID) go in **Settings** → **Environment Variables**, scoped to Production / Preview / Development independently. Never commit secrets to the repository.

The `nuxt-llms` module reads `llms.domain` from `nuxt.config.ts` (set in M5.1-T11). If you ever want a different `llms.txt` URL than the canonical site, set `NUXT_LLMS_DOMAIN` instead — but the default is the production URL, so leave it alone.

---

## 6. Cache headers

`docs/vercel.json` ships four cache rules:

| Path | `Cache-Control` | Rationale |
| --- | --- | --- |
| `/llms.txt`, `/llms-full.txt` | `public, max-age=3600, s-maxage=3600` | LLM ingestion pipelines poll these; 1-hour edge cache keeps the origin cold but stays fresh enough for doc updates |
| `/robots.txt` | `public, max-age=86400` | Crawlers tolerate a 1-day cache; this is fine because the URL list rarely changes |
| `/raw/(.*)` | `public, max-age=300, s-maxage=3600` | Raw markdown is the LLM ingestion surface; 5-minute browser cache + 1-hour shared cache keeps it fresh without origin hammering |
| `/(.*)` (catch-all) | security headers only | Static HTML, fingerprinted by Vite, so no need for `Cache-Control` |

The catch-all also adds `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`. These are baseline hardening — the doc site is public, not authenticated.

---

## 7. The `Accept: text/markdown` rewrite

**This is handled by Docus, not by `vercel.json`.** The Docus Nuxt layer ships `docus/modules/vercel-markdown-rewrite.ts`, which hooks the `nitro:init` event on the **Vercel preset** (not `node-server`, not `dev`) and reads the generated `.vercel/output/config.json`. It parses `llms.txt` to discover every documentation page, then un-shifts edge rewrites into `config.json` that map:

- `/` → `/llms.txt` for `Accept: text/markdown` or `User-Agent: curl/.*`
- `/<page>` → `/raw/<page>.md` for the same header patterns

The rewrites also add `vary: Accept, User-Agent` headers so CDNs do not serve a cached HTML variant to an agent that asked for markdown. The full mechanism is in `docus/modules/vercel-markdown-rewrite.ts` (186 lines) — read it if you need to debug a missing rewrite.

**Why this matters operationally:** Do **not** add `Accept: text/markdown` rewrites to `vercel.json`. They would conflict with the Docus-injected routes and the Docus version covers every page in `llms.txt`, not just `/`. The only `vercel.json` rules that should exist are the four `headers` blocks (cache + security) documented in §6.

**What you verify in production:** Smoke Test 5 (see §9) curls an arbitrary page with `Accept: text/markdown` and confirms the response body is markdown (matching `/raw/<page>.md`).

---

## 8. Rollback

Vercel keeps every deploy. To roll back:

### 8.1 From the dashboard

Open the project → **Deployments** → click a previous deploy → **Promote to Production**.

### 8.2 From the CLI

```bash
vercel rollback
```

The CLI lists the last 10 production deploys and prompts for which to revert to. Confirmation is required.

Rollback is **instant** at the edge — Vercel serves the previous build the moment you click Promote, with no cache invalidation delay.

---

## 9. The 10-point integration smoke test

This is the M5.1 milestone gate. Every production promotion must pass all 10 points. Run them **after** `vercel deploy --prod` exits 0.

Replace `https://genicui-docs.vercel.app` with `https://genicui.dev` if the custom domain is live.

### Test 1 — Production deploy exits 0

```bash
cd docs && vercel deploy --prod
echo "exit=$?"   # must be 0
```

### Test 2 — Landing page returns 200

```bash
curl -sI https://genicui-docs.vercel.app/ | head -1
# expect: HTTP/2 200
```

### Test 3 — `llms.txt` returns 200 with content

```bash
curl -sI https://genicui-docs.vercel.app/llms.txt | head -1
curl -s https://genicui-docs.vercel.app/llms.txt | head -5
# expect: HTTP/2 200; body lists every section
```

### Test 4 — `llms-full.txt` returns 200 with content

```bash
curl -sI https://genicui-docs.vercel.app/llms-full.txt | head -1
curl -s https://genicui-docs.vercel.app/llms-full.txt | wc -l
# expect: HTTP/2 200; non-trivial line count (currently ~3000+ lines)
```

### Test 5 — `Accept: text/markdown` returns raw markdown

The Docus layer (`docus/modules/vercel-markdown-rewrite.ts`) auto-injects edge rewrites on the Vercel preset that translate every `/<page>` request with `Accept: text/markdown` (or `User-Agent: curl/.*`) into `/raw/<page>.md`. The rewrites are emitted into `.vercel/output/config.json` at build time — they are NOT in `vercel.json` and they only fire on the Vercel preset (not on local `node .output/server/index.mjs`).

```bash
curl -sI -H "Accept: text/markdown" https://genicui-docs.vercel.app/getting-started/introduction | head -3
# expect: HTTP/2 200, content-type: text/markdown; charset=utf-8
```

Note the path: `/getting-started/introduction`, NOT `/docs/getting-started/introduction`. The Nuxt Content v3 collection key (`docs`) is stripped from the URL.

### Test 6 — `/raw/<route>.md` returns raw markdown

```bash
curl -sI https://genicui-docs.vercel.app/raw/getting-started/introduction.md | head -1
# expect: HTTP/2 200
```

Note the path: `/raw/getting-started/introduction.md`, NOT `/raw/docs/...`.

### Test 7 — Search returns hits

Manual check via the production site search modal (`Cmd+K` / `Ctrl+K`). Expected hits:

| Query | Why |
| --- | --- |
| `render_component` | MCP tool name (T6 concepts) |
| `trust boundary` | M3-T2 concepts page |
| `PrimeVue` | T8 API reference + T7 guides |
| `AG-UI` | T6 concepts |

### Test 8 — Preview URL on a test PR

Open a PR against `main`. Wait for the Vercel bot comment. Click the preview URL. Verify the `[PR #N]` banner appears in the header and the content matches the local `bun --filter genicui-docs dev` output.

### Test 9 — Lighthouse ≥ 90 on landing

```bash
npx lighthouse https://genicui-docs.vercel.app/ \
  --only-categories=performance,accessibility,seo,best-practices \
  --output=json --output-path=./lighthouse.json
cat lighthouse.json | jq '.categories | to_entries[] | {name: .key, score: (.value.score * 100 | round)}'
# expect: performance ≥ 90, accessibility ≥ 90, seo ≥ 90, best-practices ≥ 90
```

Vercel also runs Lighthouse on every deploy — open the deploy in the dashboard and scroll to **Lighthouse** for the same numbers.

### Test 10 — Link-check passes

```bash
bunx linkinator https://genicui-docs.vercel.app --recurse --skip-missing
# expect: zero broken internal links
```

---

## 10. Troubleshooting

### 10.1 Build fails: `bun: command not found`

Vercel's default build environment may not have Bun installed. Add `bun install` to the install command in `vercel.json`:

```json
"installCommand": "bun install"
```

(Already set.) If Vercel still complains, set the **Install Command** in the dashboard to `bun install` explicitly.

### 10.2 Output directory not found

Vercel reports "No output directory found." Verify the build artifact:

```bash
cd docs
bun run build
ls -la .output/public/index.html
```

If `index.html` is missing, the build crashed silently. Check `vercel logs <deployment-url>` in the CLI.

### 10.3 `llms.txt` returns 404

`nuxt-llms` silently no-ops without `llms.domain` set in `nuxt.config.ts`. Verify `docs/nuxt.config.ts` has:

```ts
llms: {
  domain: 'https://genicui.dev'
}
```

(Already set in M5.1-T11.) After a change, re-deploy.

### 10.4 Preview deploys are slow (>5 minutes)

Vercel installs the entire monorepo by default. Add a `vercel.json` `installCommand` that uses Bun's filtered install:

```json
"installCommand": "cd .. && bun install"
```

This installs all workspace deps but the build still runs in `docs/`.

### 10.5 Custom domain stuck on "Invalid Configuration"

DNS has not propagated yet, or the `A` record is pointing at the wrong Vercel IP. Use `dig genicui.dev +short` to verify. The correct IP for Vercel is `76.76.21.21`.

---

## 11. Release tagging

The first production promotion is tagged `v0.0.1-docs`:

```bash
git checkout main
git pull origin main
git tag -a v0.0.1-docs -m "First production deploy of genicui-docs"
git push origin v0.0.1-docs
```

Future deploys can use `v0.0.2-docs`, `v0.0.3-docs`, etc. until the framework itself hits semver `v0.1.0`, at which point the doc-site versioning tracks the framework.

A `CHANGELOG.md` entry records the milestone gate result:

```markdown
## v0.0.1-docs — 2026-09-10

### Deployed

- M5.1 documentation site is live at https://genicui.dev
- 38 pages across 9 sections (Getting Started, Concepts, Guides, API Reference, Cookbook, Deployment, Resources, Community, Migration)
- `llms.txt` + `llms-full.txt` for LLM ingestion
- `/raw/<route>.md` for raw markdown access
- `Accept: text/markdown` content negotiation
- Preview-per-PR via GitHub integration
```

---

## 12. Sub-tasks status

| ID | Title | Status |
| --- | --- | --- |
| T12-01 | `vercel link` + `vercel.json` | ✅ Repo artifacts committed (`docs/vercel.json`) |
| T12-02 | GitHub integration (preview + production) | ⏳ Manual — requires Vercel account + dashboard clicks |
| T12-03 | Vercel badge in README + landing footer | ✅ Repo artifacts committed |
| T12-04 | 10-point integration smoke test | ⏳ Manual — requires `vercel deploy --prod` + live URL |
| T12-05 | `vercel-deploy.md` | ✅ This file |
| T12-06 | Tag `v0.0.1-docs` + dashboard update | ⏳ Manual — requires merged-to-main production deploy |

---

## 13. References

- [Vercel CLI reference](https://vercel.com/docs/cli)
- [Vercel Nuxt deployment](https://vercel.com/docs/frameworks/nuxt)
- [Vercel custom domains](https://vercel.com/docs/custom-domains)
- [Vercel rollbacks](https://vercel.com/docs/deployments/rollbacks)
- [Vercel project badges](https://vercel.com/docs/embeddables/badges)
- [Vercel monorepos](https://vercel.com/docs/monorepos)
- [Docus deployment](https://docus.dev/en/deploy)
- [Docus environment variables](https://docus.dev/concepts/configuration#environment-variables)
- [Nuxt Site Config (`useSiteConfig`)](https://nuxtseo.com/docs/site-config/api/use-site-config)
- [nuxt-llms module](https://github.com/nuxt-modules/llms)
- [llms.txt spec](https://llmstxt.org)
