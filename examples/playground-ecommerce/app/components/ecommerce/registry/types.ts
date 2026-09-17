/**
 * Workspace-local registry entry type for the ecommerce playground.
 *
 * Extends the F37 `ComponentEntry` contract (`packages/server/src/registry/types.ts`)
 * with a workspace-local `import` thunk that the playground's resolver uses to
 * lazy-load the matching `ui/{Name}.vue` file. The server-side registry does
 * NOT need this — it indexes metadata only. The workspace needs it because the
 * chat surface renders components via Vue imports, not via the JSON-Patch /
 * `ui://` URI path.
 *
 * @module playground-ecommerce/app/components/ecommerce/registry/types
 *
 * @see {F37} — server-side registry contract
 * @see {M5.2-T3} — workspace-local extension
 * @see {EJG-LAYOUT-1} — three-layer rule (this file is in `registry/`, never imported by `ui/`)
 */

import type { TSchema } from '@sinclair/typebox';

/**
 * A single event a component can emit. Mirrors F37's `ComponentEvent` but
 * workspace-local so the registry stays decoupled from `@genicui/server`.
 */
export interface EcommerceComponentEvent {
  /** Event name in kebab-case (e.g. `product-selected`). */
  readonly name: string;
  /** Optional TypeBox schema for the event payload. */
  readonly payloadSchema?: TSchema;
}

/**
 * The 18-component workspace registry entry.
 *
 * - `name` — display name; used as the `name` field passed to `render_component`
 *   (the agent picks from these).
 * - `import` — thunk returning a `Promise<unknown>` that resolves to the
 *   default export of `ui/{Name}.vue`. Lazy so the registry file itself
 *   stays under EJG-LAYOUT-2's 50-line cap and the 18 .vue files don't all
 *   load on first render.
 * - `propsSchema` — TypeBox schema for the props the agent passes in. MUST
 *   have `additionalProperties: false` (F14 trust-boundary rule).
 * - `events` — the events the component may emit back to the agent.
 * - `examples` — one or more sample prop configurations the agent may copy.
 */
export interface EcommerceComponentEntry {
  readonly name: string;
  readonly import: () => Promise<unknown>;
  readonly propsSchema: TSchema;
  readonly events: readonly EcommerceComponentEvent[];
  readonly examples: readonly Readonly<Record<string, unknown>>[];
}

/**
 * A seed prompt surfaced in the playground's PromptsPanel. The agent
 * fills-and-submits these into the chat input via `useChatInput()` —
 * they drive the journey without typing.
 *
 * @see {M5.2-T3-AC6} — 4 seed prompts from journey spec §7
 */
export interface SeedPrompt {
  /** Stable id for the chip (used as Vue key + localStorage key). */
  readonly id: string;
  /** Short label shown on the chip. */
  readonly label: string;
  /** Full text submitted into the chat input. */
  readonly prompt: string;
}