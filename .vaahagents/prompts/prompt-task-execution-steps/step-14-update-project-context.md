---
step: 14
title: Update Project Context Files
phase: Completion
---

# Step 14: Update Project Context Files

**MANDATORY — DO NOT SKIP.**

Update project documentation to reflect the changes made in this task:

1. **Update `docs/specs/`** — IF new architectural decisions, component contracts, or API changes were introduced, update the relevant spec files.
2. **Update `docs/idea/`** — IF PoC learnings, new patterns, or migration notes emerged, update `lessons-learned.md` or relevant docs.
3. **Update `README.md`** — IF new installation steps, usage examples, or project status changed.
4. **Update `poc/README.md`** — IF PoC behavior changed, new components were added, or known limitations were resolved.

**Generate developer documentation** for new modules:

For each new or significantly modified module, create or update a doc file in `docs/specs/`:

1. **Determine scope** — List every new component, composable, utility, content schema, or config pattern introduced.
2. **Required sections per documented item:**
   - **Purpose** — One sentence: what it does and when to use it.
   - **API / Props / Parameters** — Table or list of inputs, types, defaults, and descriptions.
   - **Usage example** — A self-contained code snippet showing correct usage. Must be copy-pasteable.
   - **Integration notes** — How this item connects to other parts of the system.
   - **Edge cases / gotchas** — Any non-obvious behaviour, workarounds, or constraints.

**Cross-reference** — Link related docs within `docs/`.

**Invoke `filesystem` MCP server** to write all doc files.
