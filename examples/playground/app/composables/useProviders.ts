/**
 * Providers composable — singleton state for the user-selected LLM provider
 * (Claude Code, codex, …) and its config (e.g. CLI binary path).
 *
 * State is persisted to `localStorage` so reloads keep the user's choice.
 * The wire payload (`ProviderWirePayload`) is generated on demand by
 * `getWirePayload()` and sent with every chat message.
 *
 * Pattern mirrors `useChat` and `useRegistries` — module-level singleton refs,
 * factory function returning reactive state + mutators.
 *
 * @module playground/composables/useProviders
 *
 * @see {F43} — Suggestive prompts + registry selector
 * @see {Sub-task B of M5-T6} — Providers dropdown replacing the API Key field
 */

import { ref, readonly, watch } from 'vue';
import {
  PROVIDERS,
  getProviderById,
  DEFAULT_PROVIDER_ID,
} from '../providers/registry.js';
import type {
  ProviderDescriptor,
  ProviderWirePayload,
} from '../providers/types.js';

const STORAGE_KEY = 'genicui-playground:providers:v2';

/**
 * Persisted state shape. Stored in localStorage as JSON.
 */
interface PersistedState {
  selectedProviderId: string;
  /** Per-provider config: providerId → fieldKey → value. */
  config: Record<string, Record<string, string>>;
}

/**
 * Module-level singleton refs (shared across all consumers).
 */
const selectedProviderId = ref<string>(DEFAULT_PROVIDER_ID);
/** Per-provider config map: providerId → (fieldKey → value). */
const config = ref<Record<string, Record<string, string>>>({});

/**
 * Whether the singleton has been hydrated from localStorage yet. The
 * initial mount is sync to keep the first render correct; the watch below
 * persists subsequent changes.
 */
let hydrated = false;

/**
 * Load a provider's config, merging persisted values over field defaults.
 *
 * @param provider — the provider descriptor whose defaults to merge against
 */
function loadConfigFor(provider: ProviderDescriptor): Record<string, string> {
  const persisted = config.value[provider.id] ?? {};
  const merged: Record<string, string> = {};
  for (const field of provider.configFields) {
    merged[field.key] = persisted[field.key] ?? field.default;
  }
  return merged;
}

/**
 * Persist current state to localStorage. Failures (quota, private mode)
 * are swallowed — the in-memory state still works, just won't survive reload.
 */
function persist(): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedState = {
      selectedProviderId: selectedProviderId.value,
      config: config.value,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage unavailable / quota exceeded — ignore.
  }
}

/**
 * Hydrate from localStorage on first access. Safe to call multiple times.
 */
function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (
      typeof parsed.selectedProviderId === 'string' &&
      getProviderById(parsed.selectedProviderId)
    ) {
      selectedProviderId.value = parsed.selectedProviderId;
    }
    if (parsed.config && typeof parsed.config === 'object') {
      config.value = parsed.config as Record<string, Record<string, string>>;
    }
  } catch {
    // Corrupted state — leave defaults in place.
  }
}

/**
 * Provider composable — singleton state + mutators.
 */
export function useProviders() {
  hydrate();

  /**
   * Switch the active provider. Reverts to the default if the requested id
   * is not registered.
   */
  function select(id: string): void {
    if (getProviderById(id)) {
      selectedProviderId.value = id;
    } else {
      selectedProviderId.value = DEFAULT_PROVIDER_ID;
    }
  }

  /**
   * Set one config field on the active provider. Persists immediately.
   */
  function setConfigField(key: string, value: string): void {
    const providerId = selectedProviderId.value;
    const current = config.value[providerId] ?? {};
    config.value = {
      ...config.value,
      [providerId]: { ...current, [key]: value },
    };
  }

  /**
   * The currently-selected provider descriptor.
   */
  function getSelected(): ProviderDescriptor {
    const found = getProviderById(selectedProviderId.value);
    // selectedProviderId always points at a registered id (sanity-clamped
    // by `select` and by hydrate), so `found` is defined here.
    return found ?? (PROVIDERS[0] as ProviderDescriptor);
  }

  /**
   * Current config for the selected provider (with defaults merged in).
   */
  function getConfig(): Record<string, string> {
    return loadConfigFor(getSelected());
  }

  /**
   * Build the wire payload sent on every chat.message frame.
   */
  function getWirePayload(): ProviderWirePayload {
    return {
      id: selectedProviderId.value,
      config: getConfig(),
    };
  }

  // Persist on any state change (after initial hydration).
  watch(
    [selectedProviderId, config],
    () => {
      persist();
    },
    { deep: true },
  );

  return {
    providers: readonly(ref(PROVIDERS)) as unknown as Readonly<
      typeof PROVIDERS
    >,
    selectedProviderId: readonly(selectedProviderId),
    select,
    setConfigField,
    getSelected,
    getConfig,
    getWirePayload,
  };
}
