# Plugin Architecture

Reference for the workspace-resident provider-plugin API.

## Public API

`server/providers/registry.ts` exposes a 6-function API:

| Function | Purpose |
|---|---|
| `defineProvider(spec)` | Pure factory — returns a `ProviderPluginManifest`. |
| `registerProvider(spec)` | Registers the manifest. F14 wraps the schema, probes the factory, checks the bearer-scrub contract. Throws on any violation. |
| `unregisterProvider(id)` | Idempotent. Returns `true` if removed. |
| `getProviderAdaptor(id)` | Lazy-resolves the registered adaptor. Caches the factory output. |
| `listProviderIds()` | Returns registered ids in insertion order. |
| `discoverWorkspaceProviders(root)` | Auto-registers `<root>/server/providers/*/define.ts`. |

## Error classes

| Error | Code | When |
|---|---|---|
| `RegistryValidationError` | — | `additionalProperties: true` in `configSchema` (F14-AC3). |
| `BearerScrubMissingError` | `-32010` | HTTP-shaped manifest + factory missing `scrubWithToken`. |
| `DuplicateProviderError` | — | Two registrations with the same `id`. |
| `ProviderShapeError` | — | Factory returns `null` / non-object / no `id` string. |

## The 5 method adaptor surface

`ProviderAdaptor` — the chat handler consumes exactly 5 methods:

```ts
interface ProviderAdaptor {
  id: string;
  label: string;
  resolveBinary(config: Record<string, string>): string;
  buildArgs(args: { resumeId?: string }): string[];
  parseLine(line: string): ChatEvent | { kind: 'drop' };
}
```

Plus the workspace extends the surface (consumed by the workspace's own
agent code, never by the framework chat handler):

```ts
interface PluginExtraSurface {
  callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult>;
  schemas(): Record<string, TSchema>;
  scrubWithToken(value: unknown): unknown;
  asToolResultEvent(name: string, result: CallToolResult): ChatEvent;
  liveMode(): boolean;
}
```

## F14 wrap-at-registration contract

Three primitives compose at registration time:

1. **`rejectOpenSchemas(configSchema)`** — refuses `additionalProperties: true`
   at any nesting depth. Mirrors `packages/server/src/validation/registry-validation.ts`.
2. **`manifestRequiresBearerScrub(manifest)`** — heuristic over the config
   schema's property names (`bearer`, `bearerToken`, `Authorization`,
   `token`, `apiKey`, `api_key`). When matched, factory must expose
   `scrubWithToken`. Mirrors the bearer-scrub contract from F14.
3. **`stripProtoKeys` + `validateToolInput` sample probe** — gateway-side
   defence in depth, applied lazily inside `callTool`.

The workspace-local copies of these primitives live at
`server/providers/validation/`. Tests at
`server/providers/__tests__/validation.test.ts` ensure behaviour parity
with their `packages/server/src/validation/` counterparts.

## Worker isolation opt-in

A plugin can opt into a `worker_threads.Worker`-hosted runtime by setting
`requiresIsolation: true` on its manifest. The registry's
`bootIsolated(reg)` seam spawns the worker lazily on first
`getProviderAdaptor(id)` call and routes `callTool` over a `MessagePort`.

Default off — VaahStore ships `false` (the bearer-scrub closure pattern
is sufficient for its threat model).

See `__tests__/worker-isolation.test.ts` for the contract surface; the
current implementation uses a Bun inline-source `Worker` (via
`URL.createObjectURL(new Blob([...]))`) for the round-trip.

## Boot lifecycle

1. Nuxt server starts.
2. `server/plugins/00-boot-providers.ts` imports
   `server/providers/boot.ts`.
3. `boot.ts` calls `unregisterProvider('vaahstore')` (idempotent on HMR)
   then `registerProvider({ ... })`.
4. The Nuxt plugin logs `listProviderIds()` at INFO level.
5. When the chat handler sees `payload.provider.id === 'vaahstore'`, it
   calls `getProviderAdaptor('vaahstore')` which returns the cached
   factory output.

## Discovery

`discoverWorkspaceProviders(workspaceRoot)` walks
`<workspaceRoot>/server/providers/` and registers every
`<name>/define.ts` it finds. Failed imports / F14 wraps are reported in
`result.warnings[]` and do not crash the boot.

This is **opt-in**: `boot.ts` doesn't auto-invoke it for VaahStore
because the explicit registration is the contract under test. Author a
new plugin? Replace `boot.ts` with:

```ts
import { discoverWorkspaceProviders } from './registry.js';
const result = await discoverWorkspaceProviders(import.meta.dir + '/../..');
console.log('Registered:', result.manifests.map((m) => m.id));
console.log('Warnings:', result.warnings);
```

## Cross-references

- [§1 §2 §3 §4 §5 §6 §7 of providers.md](../../docs/content/2.concepts/9.providers.md)
- [F14 trust-boundary primitives](../../docs/content/2.concepts/6.trust-boundary.md)
- Workspace README: [`../README.md`](../README.md)
