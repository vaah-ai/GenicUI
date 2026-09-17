/**
 * Static provider registry for the ecommerce playground.
 *
 * The ecommerce playground ships a single provider (`vaahstore`) in its
 * dropdown. The provider is served by the workspace-resident plugin at
 * `examples/playground-ecommerce/server/providers/vaahstore/` (M5.2-T2-1).
 *
 * @module playground-ecommerce/app/providers/registry
 */

import type { ProviderDescriptor } from './types.js';

export const PROVIDERS: ProviderDescriptor[] = [
  {
    id: 'vaahstore',
    label: 'VaahStore',
    description: 'VaahStore headless commerce HTTP API (12 tools)',
    configFields: [
      {
        key: 'baseUrl',
        label: 'VaahStore base URL',
        type: 'text',
        default: '',
        placeholder: 'https://store.example.com',
        help: 'Origin without trailing slash. Tools route to {baseUrl}/api/store/<resource>.',
      },
      {
        key: 'storeId',
        label: 'Store id',
        type: 'text',
        default: '',
        placeholder: '1',
        help: 'VaahStore multi-store id sent as ?selected_store=<id>. Empty = upstream default.',
      },
      {
        key: 'bearerToken',
        label: 'Bearer token (Sanctum PersonalAccessToken)',
        type: 'text',
        default: '',
        placeholder: 'Paste a Sanctum token',
        help: 'Never logged. Stored in localStorage only — server reads it from VAHSTORE_BEARER_TOKEN at startup.',
      },
      {
        key: 'liveSwitch',
        label: 'Live mode (1 = live, 0 = fixtures)',
        type: 'text',
        default: '0',
        placeholder: '0',
        help: 'VITE_VAAHSTORE_LIVE — set to 1 to hit the live API, 0 (default) reads from __fixtures__/vaahstore/.',
      },
    ],
  },
];

export function getProviderById(id: string): ProviderDescriptor | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export const DEFAULT_PROVIDER_ID: string = PROVIDERS[0]?.id ?? 'vaahstore';
