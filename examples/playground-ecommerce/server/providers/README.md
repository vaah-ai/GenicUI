# Workspace Provider Plugins

This directory is the **workspace-resident plugin host** for the
GenicUI ecommerce playground. It implements the in-workspace pattern
documented at `docs/content/2.concepts/9.providers.md`.

## Layout

```
server/providers/
├── index.ts          # Barrel — re-exports the 6-function API
├── types.ts          # ProviderAdaptor + ProviderPluginManifest types
├── registry.ts       # defineProvider / registerProvider / getProviderAdaptor
├── boot.ts           # Workspace boot — registers 'vaahstore' once at server start
├── validation/       # Workspace-local F14 trust-boundary primitives
│   ├── strip-proto-keys.ts
│   ├── registry-validation.ts
│   ├── schema-validation.ts
│   └── index.ts
├── vaahstore/        # The VaahStore provider (moved from packages/server)
│   └── runtime/
│       └── index.ts
└── __tests__/        # Workspace-local test colocation
    ├── vaahstore.test.ts
    ├── registry.test.ts
    ├── wrap-at-registration.test.ts
    ├── worker-isolation.test.ts
    ├── discovery.test.ts
    └── validation.test.ts
```

## How to add a new provider

1. **Copy `vaahstore/`** as a template. Replace the TypeBox schemas
   with your provider's input shapes. Add `scrubWithToken` if your
   provider uses a bearer token.
2. **Author `define.ts`** at `<your-provider>/define.ts` exporting a
   `ProviderPluginManifest` (the output of `defineProvider(...)`):
   ```ts
   export default defineProvider({
     id: 'my-provider',
     label: 'My Provider',
     configSchema: Type.Object({ ... }, { additionalProperties: false }),
     requiresIsolation: false,
     factory: () => createMyProvider(process.env),
   });
   ```
3. **Edit `boot.ts`** to call `registerProvider(manifest)` — OR run
   `await discoverWorkspaceProviders(import.meta.dir)` to auto-pick up
   every `*/define.ts` in this directory.
4. **Add the client mirror** in `app/providers/registry.ts` so the
   Providers dropdown surfaces your provider.

## Contracts enforced at registration time

| Contract | Failure mode |
|---|---|
| F14-AC3 — `additionalProperties: true` in configSchema | `RegistryValidationError` |
| Bearer-scrub — HTTP-shaped schema + factory missing `scrubWithToken` | `BearerScrubMissingError` (-32010) |
| Duplicate id | `DuplicateProviderError` |
| Factory returns a malformed object | `ProviderShapeError` |

See `docs/content/2.concepts/9.providers.md` §3 for the full contract
specification.

## Why is this in the workspace and not in `@genicui/server`?

Per the user redirect of 2026-09-17:

> "provider-vaahstore should exist in
> `/Users/pk/Projects/GenicUI/examples/playground-ecommerce`. None of
> these tasks should affect core of genicui and all should update docs
> as well based on the learning."

The workspace-resident pattern keeps the GenicUI framework
provider-free for third-party adapters. A future M5.x task may promote
this plugin API to a shared `examples/_shared/server-providers/` module
if a second example workspace adopts the same shape.
