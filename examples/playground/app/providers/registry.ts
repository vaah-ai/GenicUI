/**
 * Static provider registry — the list of providers the playground supports.
 *
 * Adding a new provider here automatically surfaces it in the Providers
 * dropdown. Implementing the corresponding server-side `ProviderAdaptor`
 * (in `packages/server/src/chat/providers/`) is a separate step — the UI
 * scaffold can land first.
 *
 * @module playground/providers/registry
 */

import type { ProviderDescriptor } from './types.js';

/**
 * Registered providers, in display order.
 *
 * The default provider (first entry) is what `useProviders` selects when no
 * value is persisted in `localStorage`.
 */
export const PROVIDERS: ProviderDescriptor[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    description: 'Anthropic Claude Code CLI',
    configFields: [
      {
        key: 'cliPath',
        label: 'CLI binary path',
        type: 'path',
        default: '/opt/homebrew/bin/claude',
        placeholder: '/opt/homebrew/bin/claude',
        help: 'Path to the claude binary. Common locations: /opt/homebrew/bin/claude (Homebrew on Apple Silicon), /usr/local/bin/claude (Intel Homebrew), or just "claude" if it is on $PATH.',
      },
    ],
  },
  {
    id: 'codex',
    label: 'Codex',
    description: 'OpenAI Codex CLI (coming soon)',
    configFields: [],
    disabled: true,
  },
];

/**
 * Lookup a provider descriptor by id. Returns `undefined` if not registered.
 */
export function getProviderById(id: string): ProviderDescriptor | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/**
 * Default provider id (first non-disabled entry).
 */
export const DEFAULT_PROVIDER_ID: string = (() => {
  const first = PROVIDERS.find((p) => !p.disabled);
  // PROVIDERS is a static literal; if every entry is disabled, fall back
  // to the first one rather than crashing the UI.
  return first?.id ?? PROVIDERS[0]?.id ?? 'claude-code';
})();
