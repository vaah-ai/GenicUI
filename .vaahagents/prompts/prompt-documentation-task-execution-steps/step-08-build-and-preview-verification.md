---
step: 8
title: Build + Preview Verification
phase: Polish & Publish
---

# Step 8: Build + Preview Verification

**Verification ladder — run in order of speed (fast feedback first):**

1. **Type-check** (only if you touched `.ts`): `bun --filter docs typecheck` — exits 0
2. **Lint:** `bun --filter docs lint` — zero warnings
3. **Dev server smoke:** `bun --filter docs dev` → curl each new route → kill server
4. **Production build:** `bun --filter docs build` → exits 0 → `.output/public/index.html` exists
5. **Markdown routing:** `curl -H "Accept: text/markdown" http://localhost:3000/<path>` returns markdown
6. **Raw routing:** `curl http://localhost:3000/raw/<path>.md` returns the source markdown
7. **Sitemap:** `curl http://localhost:3000/sitemap.xml` returns valid XML listing your pages
8. **llms.txt (T11+):** `curl http://localhost:3000/llms.txt` and `curl http://localhost:3000/llms-full.txt`
9. **Visual check:** `playwright` MCP → screenshot each new route in light + dark mode

For every acceptance criterion in the task spec:

- Verify explicitly — do not assume it passes
- If unverifiable automatically, mark `manual-verified` in the report

**IF the build fails:** read the error output carefully, fix the root cause, re-run. Do not retry blindly.

**IF a route 404s:** check `.navigation.yml` for typo, confirm file is under `content/`, confirm frontmatter is valid.

**IF markdown routing returns HTML:** the `nuxt-seo` `routeRules` for `Accept: text/markdown` is misconfigured (T11 work).

**Return:** a per-AC verification table — `AC1 ✅ / AC2 ✅ / AC3 🔵 manual-verified (will validate on real deploy) / ...`.