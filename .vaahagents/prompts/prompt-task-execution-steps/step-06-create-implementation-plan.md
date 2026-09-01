---
step: 6
title: Create Implementation Plan
phase: Planning
---

# Step 6: Create Implementation Plan

**MANDATORY — DO NOT SKIP.** Every task must have a written implementation plan before proceeding to code.

**Invoke `brainstorming` skill** if this task involves a new feature, a new component, or a non-obvious implementation pattern. Explore at least 2 approaches and document the rationale for the chosen approach.

**Invoke `sequential-thinking` MCP server** to decompose the task into ordered implementation steps.

**ALWAYS invoke the relevant skills** for the technologies involved — even if you think the plan is straightforward.

Write a numbered plan:

- Specific files to create or modify (paths relative to project root)
- Functions / components / modules to implement
- Tests to write
- Documentation to update
- Estimated complexity for each change

**Implementation order — follow this sequence to avoid layer dependency issues:**

1. **Type system** — TypeScript interfaces, TypeBox schemas, `GenicSchema<T>` definitions
2. **Core protocol** — AG-UI event types, frame envelope, sequence generators
3. **Data layer** — `SessionStore` implementations, JSON-Patch engine
4. **Business logic** — tool handlers, trust boundary validation, component lifecycle
5. **Transport** — WebSocket multiplexer, channel routing, frame serialization
6. **Client** — Web Component base, `GenicClient`, Vue 3 shim
7. **Registry** — Component registry, adaptors (PrimeVue DataTable)
8. **Tests** — write as you go, not all at the end
9. **Documentation** — update `docs/specs/` if architectural decisions changed

**Invoke `memory` MCP server:** Save this implementation plan as `"GenicUI — {{TASK_ID}} Implementation Plan"`.

**Gate:** Do not proceed to implementation without a written plan.

> **Compaction checkpoint:** If context is compacted at this point, recover by: (1) reading the TodoWrite list to find the last `completed` step, (2) invoking `memory` MCP to reload `"GenicUI — {{TASK_ID}} Implementation Plan"`, (3) resuming from the next `pending` step.
