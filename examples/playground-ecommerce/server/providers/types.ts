/**
 * Provider plugin types — workspace-local mirror of the
 * `ProviderAdaptor` shape consumed by `@genicui/server`'s chat handler.
 *
 * TODO(M5.x): once a shared `examples/_shared/server-providers/types.ts`
 * (or a `@genicui/provider-types` workspace package) lands, import the
 * authoritative interface from there. Until then the workspace keeps its
 * own copy to honor the "zero edits to packages/" rule.
 *
 * @module playground-ecommerce/server/providers/types
 *
 * Design notes:
 *   - The 5-method `ProviderAdaptor` shape is the public contract
 *     consumed by `packages/server/src/chat/chat-handler.ts:114,406,937`
 *     via `getProviderAdaptor(providerId)`. We keep it identical so the
 *     chat handler doesn't notice the workspace-scoped lookup.
 *   - `ProviderPluginManifest` adds 3 workspace-local fields on top of
 *     `ProviderAdaptor`: `id`, `label`, `configSchema`, `requiresIsolation`.
 *     These are used by `defineProvider(...)` and `registerProvider(...)`
 *     at registration time.
 */

/**
 * Per-provider configuration forwarded by the client. Same shape as
 * `@genicui/server/src/chat/providers/types.ts:ProviderConfig`.
 */
export type ProviderConfig = Record<string, string>;

/**
 * A single typed event surfaced by an adaptor. The chat channel
 * broadcasts these inside `chat.event` frames.
 */
export interface ChatEvent {
  readonly type: string;
  readonly data: Record<string, unknown>;
}

/**
 * Result of parsing one stdout line from the spawned CLI / HTTP body.
 *
 * Mirrors `packages/server/src/chat/providers/types.ts:ParsedLine`.
 */
export type ParsedLine =
  | { readonly kind: 'event'; readonly event: ChatEvent }
  | { readonly kind: 'complete' }
  | { readonly kind: 'drop' }
  | { readonly kind: 'stderr'; readonly text: string };

/**
 * A provider adaptor — the consumer contract. The chat handler calls
 * `resolveBinary`, `buildArgs`, and `parseLine` once per turn.
 *
 * Workspace plugins may ALSO implement `callTool` (HTTP-based provider)
 * — the chat handler doesn't consume it today, but downstream F42
 * agent-bridge calls do. The `PluginExtraSurface` extension below
 * captures it.
 */
export interface ProviderAdaptor {
  readonly id: string;
  readonly label: string;
  resolveBinary(config: ProviderConfig): string;
  buildArgs(opts: { readonly resumeId: string | null }): string[];
  parseLine(line: string): ParsedLine;
}

/**
 * Optional plugin extension surface (HTTP-based providers like VaahStore
 * implement `callTool` here).
 *
 * - `callTool(name, args)` — invoke a tool by name with raw args.
 * - `schemas` — TypeBox schemas keyed by tool name (used by F14 validation).
 * - `scrubWithToken` — replace any leaked bearer token in the result.
 * - `asToolResultEvent` — convert a `callTool` result into a `ChatEvent`.
 * - `liveMode` — `true` if the plugin is hitting live APIs (vs. fixtures).
 *
 * Properties are read with `?.` at the consumer site so a CLI-only
 * plugin (which omits these) is still valid.
 */
export interface PluginExtraSurface {
  callTool?(name: string, args: Record<string, unknown>): Promise<unknown>;
  schemas?: Record<string, import('@sinclair/typebox').TSchema>;
  scrubWithToken?(value: unknown): unknown;
  asToolResultEvent?(result: unknown): ChatEvent;
  liveMode?: boolean;
}

/**
 * The plugin manifest — the shape produced by `defineProvider(...)` and
 * accepted by `registerProvider(...)`.
 */
export interface ProviderPluginManifest {
  /** Stable provider id. Must be unique per workspace. */
  readonly id: string;
  /** Human-readable label (for logs and UI). */
  readonly label: string;
  /** TypeBox schema for `provider.config`. MUST have `additionalProperties: false`. */
  readonly configSchema: import('@sinclair/typebox').TSchema;
  /**
   * Opt-in: when `true`, `registerProvider` boots the factory inside a
   * `node:worker_threads.Worker` and routes `callTool` through a
   * `MessagePort`. Default off — VaahStore ships `false` because its
   * pure-Node fetch path doesn't need isolation.
   */
  readonly requiresIsolation: boolean;
  /** Factory that returns a fresh adaptor instance. */
  readonly factory: () => ProviderAdaptor & Partial<PluginExtraSurface>;
}

/**
 * Input shape for `defineProvider(...)` — same fields as
 * `ProviderPluginManifest` but the factory is `() => unknown` until
 * narrowed at registration time.
 */
export interface ProviderPluginSpec {
  readonly id: string;
  readonly label: string;
  readonly configSchema: import('@sinclair/typebox').TSchema;
  readonly requiresIsolation?: boolean;
  readonly factory: () => ProviderAdaptor & Partial<PluginExtraSurface>;
}
