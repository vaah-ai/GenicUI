---
feature_id: F21
title: "Web Component base class (`GenicElement`)"
phase: Runtime
priority: Critical
effort: L
dependencies: [F4, F29]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#f-component-system-locked
---

# F21 — Web Component base class (`GenicElement`)

`customElements.define` wrapper that closes Shadow DOM, applies patches, dispatches events.

## Inputs / Outputs

**Input:**
```ts
import { GenicElement } from '@genicui/runtime';
class MyEl extends GenicElement {
  static observedAttributes = ['props'];
  connectedCallback() { this.update(this.props); }
  onPatch(patches: JsonPatchOp[]) { /* shadow DOM diff */ }
  onEvent(name: string, detail: unknown) { /* bubble */ }
}
customElements.define('my-el', MyEl);
```

**Output:**
- Closed Shadow DOM (`attachShadow({ mode: 'closed' })`)
- Reactive props via `props` getter that triggers patches
- Events bubble through `composed: true`

## Acceptance Criteria (Gherkin)

### F21-AC1: Closed Shadow DOM
- **Given** a `GenicElement` subclass
- **When** `customElements.define` is called
- **Then** the resulting element has a closed shadow root

### F21-AC2: JSON-Patch re-render
- **Given** an attached element with props `{ a: 1 }`
- **When** patches `[{op:'replace',path:'/a',value:2}]` arrive
- **Then** the shadow DOM re-renders to `{ a: 2 }`

### F21-AC3: Event bubbling through shadow boundary
- **Given** an element dispatches a CustomEvent from inside its shadow DOM
- **When** the event has `composed: true`
- **Then** the runtime hears it on the document

### F21-AC4: Unmount cleanup
- **Given** a mounted element
- **When** `disconnectedCallback` fires
- **Then** the runtime removes the channel and emits `channel.closed`

## Test Plan

| AC | Test |
|---|---|
| F21-AC1 | `tests/unit/runtime/genetic-element.test.ts:F21-AC1` shadow root mode |
| F21-AC2 | `tests/unit/runtime/genetic-element.test.ts:F21-AC2` patch re-render |
| F21-AC3 | `tests/integration/runtime.test.ts:F21-AC3` event bubble |
| F21-AC4 | `tests/integration/runtime.test.ts:F21-AC4` unmount cleanup |

## Cross-References

- Locked by: [consolidated-requirements.md §F Component System](../../idea/consolidated-requirements.md#f-component-system-locked)
- Architecture: [architecture.md §Runtime](../architecture.md#runtime)
