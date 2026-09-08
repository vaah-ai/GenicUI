# GenicUI Documentation Site — Information Architecture

> **Milestone:** M5.1 (Documentation Site)
> **Task:** M5.1-T3 — Information Architecture + `.navigation.yml`
> **Status:** ✅ Complete
> **Last updated:** 2026-09-09

## Scope

10-section IA mirroring industry-standard doc sites (Nuxt, Laravel, AdonisJS). Every page gets a numeric-prefixed filename + matching `.navigation.yml` in its section directory. Every body is a placeholder (`::note`) — T4–T10 fill prose.

## Tree

| Section | Pages | Directory |
|---|---|---|
| Landing | 1 (`index.md`) | `content/index.md` |
| Getting Started | 3 | `content/1.getting-started/` |
| Concepts | 7 | `content/2.concepts/` |
| Guides | 5 | `content/3.guides/` |
| API Reference | 6 | `content/4.api/` |
| Cookbook | 6 | `content/5.cookbook/` |
| Deployment | 4 | `content/6.deployment/` |
| Resources | 3 | `content/7.resources/` |
| Community | 3 | `content/8.community/` |
| Migration | 1 | `content/9.migration/` |

**Total: 38 page files + 10 `.navigation.yml` files (1 top-level + 9 per-section) + 1 landing `index.md`.**

## Routes

Numeric prefix is stripped from the URL — Docus derives the route from the filename suffix. Examples:

- File: `content/1.getting-started/1.introduction.md` → URL: `/getting-started/introduction`
- File: `content/4.api/4.vite-plugin.md` → URL: `/api/vite-plugin`
- File: `content/9.migration/1.pre-1.0.md` → URL: `/migration/pre-1.0`

## Full page inventory

### Landing

| # | File | URL | Title | Description |
|---|---|---|---|---|
| — | `index.md` | `/` | (filled by T4) | Landing — T4 hero / install snippet |

### 1.getting-started

| # | File | URL | Title | nav.icon |
|---|---|---|---|---|
| 1 | `1.introduction.md` | `/getting-started/introduction` | Introduction | i-lucide-house |
| 2 | `2.installation.md` | `/getting-started/installation` | Installation | i-lucide-download |
| 3 | `3.quick-start.md` | `/getting-started/quick-start` | Quick Start | i-lucide-zap |

### 2.concepts

| # | File | URL | Title | nav.icon |
|---|---|---|---|---|
| 1 | `1.protocol.md` | `/concepts/protocol` | Protocol | i-lucide-network |
| 2 | `2.frames.md` | `/concepts/frames` | Frames | i-lucide-layers |
| 3 | `3.mcp-tools.md` | `/concepts/mcp-tools` | MCP Tools | i-lucide-wrench |
| 4 | `4.components.md` | `/concepts/components` | Components | i-lucide-package |
| 5 | `5.events.md` | `/concepts/events` | Events | i-lucide-radio |
| 6 | `6.trust-boundary.md` | `/concepts/trust-boundary` | Trust Boundary | i-lucide-shield |
| 7 | `7.registries.md` | `/concepts/registries` | Registries | i-lucide-database |

### 3.guides

| # | File | URL | Title | nav.icon |
|---|---|---|---|---|
| 1 | `1.development.md` | `/guides/development` | Development | i-lucide-terminal |
| 2 | `2.production.md` | `/guides/production` | Production | i-lucide-rocket |
| 3 | `3.testing.md` | `/guides/testing` | Testing | i-lucide-flask-conical |
| 4 | `4.custom-registry.md` | `/guides/custom-registry` | Custom Registry | i-lucide-package-plus |
| 5 | `5.migration.md` | `/guides/migration` | Migration | i-lucide-arrow-up-right |

### 4.api

| # | File | URL | Title | nav.icon |
|---|---|---|---|---|
| 1 | `1.core.md` | `/api/core` | @genicui/core | i-lucide-box |
| 2 | `2.server.md` | `/api/server` | @genicui/server | i-lucide-server |
| 3 | `3.client.md` | `/api/client` | @genicui/client | i-lucide-monitor |
| 4 | `4.vite-plugin.md` | `/api/vite-plugin` | @genicui/vite-plugin | i-lucide-plug |
| 5 | `5.agent-bridge.md` | `/api/agent-bridge` | @genicui/agent-bridge | i-lucide-bridge |
| 6 | `6.primevue-registry.md` | `/api/primevue-registry` | primevue-registry | i-lucide-library |

### 5.cookbook

| # | File | URL | Title | nav.icon |
|---|---|---|---|---|
| 1 | `1.auth.md` | `/cookbook/auth` | API Key Authentication | i-lucide-key |
| 2 | `2.retry.md` | `/cookbook/retry` | Retry & Backoff | i-lucide-rotate-cw |
| 3 | `3.custom-event.md` | `/cookbook/custom-event` | Custom Events | i-lucide-bell |
| 4 | `4.multi-channel.md` | `/cookbook/multi-channel` | Multi-Channel Sessions | i-lucide-split |
| 5 | `5.registry-versioning.md` | `/cookbook/registry-versioning` | Registry Versioning | i-lucide-git-branch |
| 6 | `6.testing.md` | `/cookbook/testing` | Testing Components | i-lucide-test-tube |

### 6.deployment

| # | File | URL | Title | nav.icon |
|---|---|---|---|---|
| 1 | `1.overview.md` | `/deployment/overview` | Overview | i-lucide-globe |
| 2 | `2.cloudflare.md` | `/deployment/cloudflare` | Cloudflare Workers | i-lucide-cloud-cog |
| 3 | `3.bun-self-host.md` | `/deployment/bun-self-host` | Bun Self-Host | i-lucide-server-cog |
| 4 | `4.nitro.md` | `/deployment/nitro` | Nitro Binding | i-lucide-cpu |

### 7.resources

| # | File | URL | Title | nav.icon |
|---|---|---|---|---|
| 1 | `1.faq.md` | `/resources/faq` | FAQ | i-lucide-help-circle |
| 2 | `2.troubleshooting.md` | `/resources/troubleshooting` | Troubleshooting | i-lucide-wrench |
| 3 | `3.community.md` | `/resources/community` | Community | i-lucide-messages-square |

### 8.community

| # | File | URL | Title | nav.icon |
|---|---|---|---|---|
| 1 | `1.contributing.md` | `/community/contributing` | Contributing | i-lucide-git-pull-request |
| 2 | `2.code-of-conduct.md` | `/community/code-of-conduct` | Code of Conduct | i-lucide-scroll |
| 3 | `3.roadmap.md` | `/community/roadmap` | Roadmap | i-lucide-map |

### 9.migration

| # | File | URL | Title | nav.icon |
|---|---|---|---|---|
| 1 | `1.pre-1.0.md` | `/migration/pre-1.0` | Pre-1.0 Migration | i-lucide-arrow-right |

## Navigation files

| File | title | icon |
|---|---|---|
| `content/.navigation.yml` | Documentation | (none — top-level) |
| `content/1.getting-started/.navigation.yml` | Getting Started | i-lucide-rocket |
| `content/2.concepts/.navigation.yml` | Concepts | i-lucide-book-open |
| `content/3.guides/.navigation.yml` | Guides | i-lucide-compass |
| `content/4.api/.navigation.yml` | API Reference | i-lucide-code |
| `content/5.cookbook/.navigation.yml` | Cookbook | i-lucide-cooking-pot |
| `content/6.deployment/.navigation.yml` | Deployment | i-lucide-cloud |
| `content/7.resources/.navigation.yml` | Resources | i-lucide-life-buoy |
| `content/8.community/.navigation.yml` | Community | i-lucide-users |
| `content/9.migration/.navigation.yml` | Migration | i-lucide-arrow-right |

**Per-section `.navigation.yml` shape** (no explicit `children` list — filename numeric order drives the left rail):

```yaml
title: Getting Started
icon: i-lucide-rocket
```

## Concepts → spec mapping

Every concept in `.vaahagents/requirements/specs/` has a home:

| Spec | Concept page |
|---|---|
| F003 (protocol envelope) | `concepts/protocol` |
| F011 (frame multiplexing) | `concepts/frames` |
| F013 + F015/F016/F017/F018 (MCP tools) | `concepts/mcp-tools` |
| F021 (Web Component) + F029 (runtime) | `concepts/components` |
| F019 + F020 + F024 (events) | `concepts/events` |
| F014 (trust boundary) | `concepts/trust-boundary` |
| F037 + F038 + F040 (registries) | `concepts/registries` |

## Verification

| AC | Status | Evidence |
|---|---|---|
| AC1 — 9 sections + `index.md` | ✅ | `find examples/docs/content -maxdepth 1 -type d` returns 9 dirs + `index.md` |
| AC2 — Every section has `.navigation.yml` | ✅ | All 9 sections have one |
| AC3 — Frontmatter complete (title/desc/nav.icon) | ✅ | 0 failures across 38 pages |
| AC4 — Every page body has `::note` | ✅ | All T3-authored pages have one |
| AC5 — Left rail browsable | ✅ | Dev server boots; sections expand; all 38 routes return 200 |
| AC6 — All routes 200 in build | ✅ | Dev-server curl: 38/38 = 200 |
| AC7 — No prose beyond placeholder | ✅ | Raw markdown output is `Placeholder — content authored in M5.1-T<n>.` only |
| AC8 — Top-level nav is the only top-level nav | ✅ | `find -maxdepth 1 -name .navigation.yml \| wc -l` = 1 |
| AC9 — Numeric prefixes consistent | ✅ | Verified per-section: `1.-N.` monotonic |
| AC10 — IA tree document | ✅ | This file |

## Conventions for downstream tasks (T4–T10)

- **Path syntax in cross-refs:** strip the numeric prefix. From `concepts/components`, link with `/concepts/components` — **not** `/2.concepts/4.components`.
- **Icon catalog:** Lucide. Use `i-lucide-<name>` exactly. Browse <https://lucide.dev/icons>.
- **Frontmatter shape:** `title`, `description`, `navigation: { icon: i-lucide-... }`. Add `seo:` and `links:` blocks per `reference-coding-principles.md`.
- **MDC inventory available** (Docus 5.13.0 bundles Nuxt Content v3): `::note`, `::callout`, `::steps`, `::tabs`, `::code-group`, `::card-grid`, `::tip`, `::warning`.
- **Body constraint (still in force):** every page remains placeholder until its owning task (T4–T10) writes prose.
- **build command:** `bun --filter genicui-docs build` (full workspace name `genicui-docs`, not `docs`).

## Decisions / notes

1. **Why minimal `.navigation.yml` (no `children:`):** Docus auto-orders children from numeric-prefixed filenames. An explicit `children:` list would be a second source of truth that drifts. Per context7 docs: per-section files need only `title:` + `icon:`.
2. **Why `i-lucide-cooking-pot` for Cookbook:** matches the standard Lucide name for a "cookbook" metaphor; alternatives (`i-lucide-chef-hat`, `i-lucide-utensils`) felt off-brand.
3. **Why no `content.config.ts`:** Docus provides default schemas out of the box. T8 will add custom collections for the API reference (querying `packages/*/src/` exports); T3 doesn't need any.
4. **Why no top-level title/icon:** the top-level `.navigation.yml` controls the docs landing chrome but the site-wide brand is owned by `app/app.config.ts` (T4 fills).
5. **Why 5.1 (single sub-section of Resources, Community, Migration) and not 7+:** the spec called for 3, 3, and 1 respectively. Adding more pages without prose would create empty skeletons without IA justification — and would drift from Nuxt's 7-section model.

## What's next

- **M5.1-T4** — Fill landing `index.md` (hero, feature grid, install snippet). Author brand tokens in `app.config.ts`.
- **M5.1-T5** — Fill `1.getting-started/*.md` prose.
- **M5.1-T6** — Fill `2.concepts/*.md` prose (the bulk of conceptual content).
- **M5.1-T7** — Fill `3.guides/*.md` prose.
- **M5.1-T8** — Auto-generate `4.api/*.md` from `packages/*/src/` exports + `registries/primevue/registry.json`. First task to add a `content.config.ts` collection.
- **M5.1-T9** — Fill `5.cookbook/*.md` prose.
- **M5.1-T10** — Fill `6.deployment/*.md` prose.
- **M5.1-T11** — SEO + llms.txt + search. Configure `Accept: text/markdown` routeRules.
- **M5.1-T12** — Vercel deploy.

All T4–T10 authoring tasks fill existing T3 skeletons — they do **not** create new files unless a new section appears.