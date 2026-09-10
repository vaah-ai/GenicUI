---
step: 9
title: Link Check + Accessibility Audit
phase: Polish & Publish
---

# Step 9: Link Check + Accessibility Audit

## Link Check

Run a link checker against every page you authored:

```bash
bunx --bun linkinator http://localhost:3000/<your-routes> --skip <external-domains-allowed>
```

- All internal links must resolve (200).
- All `/raw/*.md` paths must resolve.
- External links: allowlist `github.com`, `nuxt.com`, `docus.dev`, `ui.nuxt.com`, `open-meteo.com`, `vercel.com`, `cloudflare.com`. Anything else → investigate or remove.

**IF a link is broken:**

- Internal → fix the route or the cross-ref.
- External → verify the URL is still alive. If dead, replace or remove.

## Accessibility Audit

Invoke the `web-perf` skill for a Lighthouse run on each new page:

```bash
bunx unlighthouse-cli --site http://localhost:3000/<route>
```

**Targets per page:**

- Accessibility ≥ 95
- SEO ≥ 95
- Best Practices ≥ 95
- Performance ≥ 90

**Common issues to fix:**

- Missing `alt` on images → add alt
- Heading skip (H1 → H3) → insert H2
- Color contrast on callout text → check `app.config.ts` brand colors
- Missing `<title>` or `<meta description>` → frontmatter

**Return:** link-check summary + per-page Lighthouse scores. Note anything `manual-verified`.