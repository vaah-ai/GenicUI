---
step: 8
title: Implement the Task
phase: Execution
---

# Step 8: Implement the Task

Execute the implementation plan step by step. For granular sub-step tracking within this step, create **additional** todo items (e.g., `step-08a`, `step-08b`) for each implementation sub-task:

- Mark exactly ONE item `in_progress` at a time.
- Mark `completed` immediately after finishing — never batch completions.

**Implementation order — follow this sequence to avoid layer dependency issues:**

1. **Type system** — TypeScript interfaces, TypeBox schemas, `GenicSchema<T>` definitions
2. **Core protocol** — AG-UI event types, frame envelope, sequence generators
3. **Data layer** — `SessionStore` implementations, JSON-Patch engine
4. **Business logic** — tool handlers, trust boundary validation, component lifecycle
5. **Transport** — WebSocket multiplexer, channel routing, frame serialization
6. **Client** — Web Component base, `GenicClient`, Vue 3 shim
7. **Registry** — Component registry, adaptors (PrimeVue DataTable)
8. **Tests** — write as you go, not all at the end

**Invoke the relevant skill** for each area of implementation:

- Invoke `nuxt` when writing Nuxt/Nitro code.
- Invoke `primevue` when writing PrimeVue components.
- Invoke `tailwindcss` when writing Tailwind styles.

**Invoke `brainstorming` skill** for any sub-step where the implementation approach is uncertain or involves a design decision not covered by existing code patterns. Document the decision in your response.

Load `reference-coding-principles.md` from `{{STEPS_DIR}}/` and apply every rule in it.

Use **Edit** tool for modifications, **Write** tool for new files — never Bash for file operations.

**CRITICAL GenicUI constraints:**

- `console.log` redirected to `stderr` in MCP server code (stdout is MCP transport)
- TypeBox `Value.Check()` for ALL inbound data validation
- Strip `__proto__`, `constructor`, `prototype` from every inbound payload
- `additionalProperties: false` in all TypeBox schemas
- JSON-Patch with `{ mutate: false }` — never mutate state in place
- Monotonic `seq: uint64` per channel for frame ordering
- WebSocket subprotocol: `genicui.v1`
- Web Components with closed Shadow DOM
- `observedAttributes: ['props-json', 'component-id']`
