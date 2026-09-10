---
step: 4
title: Verify Library Syntax via context7
phase: Content Sourcing
---

# Step 4: Verify Library Syntax via context7

**Invoke `context7` MCP server** for every library you'll touch in this task. Resolve a library ID once per session and reuse it.

**Minimum library lookups by task:**

| Task | Lookups |
|---|---|
| Any | `docus` |
| T4, T6, T7, T9 (Nuxt UI usage) | `nuxt/ui` |
| T6–T10 (markdown content) | `nuxt/content` |
| T10, T11 (SEO + llms) | `nuxt-seo` |
| T8 (TypeScript quotes) | `@microsoft/tsdoc` (optional) |

**For each library, fetch:**

1. The latest stable version Docus 5.13.0 bundles (don't downgrade).
2. The exact MDC components available (don't invent `::callout` variants).
3. Any breaking changes in the v3 → v4 Nuxt UI upgrade.

**Gate:** IF `context7` is unavailable, THEN note it in the report and fall back to WebFetch on the official docs URL listed in the task spec.

**Return:** a compact cheat-sheet — version, MDC inventory, and any version-skew risks discovered.