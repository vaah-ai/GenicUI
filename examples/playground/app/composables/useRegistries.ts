/**
 * Registry composable — fetches available registries from the GenicUI server
 * and tracks which one is selected. Singleton state shared across components.
 *
 * @see {F43} — Suggestive prompts and registry selector
 */

import { ref, readonly } from 'vue';

/**
 * A single registry component entry.
 */
export interface RegistryComponentInfo {
  name: string;
  version: string;
  tags: string[];
  /** Optional example prompts for this component. */
  examplePrompts: string[] | undefined;
}

/**
 * A single registry entry returned by /api/registries.
 */
export interface RegistryListing {
  id: string;
  version: string;
  framework: string;
  components: RegistryComponentInfo[];
}

/**
 * Module-level singleton state.
 */
const registries = ref<RegistryListing[]>([]);
const selectedId = ref<string>('');
const loading = ref(false);
const error = ref<string | null>(null);

/**
 * Registry composable.
 *
 * @returns Reactive registry state and methods.
 */
export function useRegistries() {
  /**
   * Load registries from the given server URL.
   *
   * @param serverUrl — WebSocket URL of the GenicUI server.
   */
  async function load(serverUrl: string): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      const url =
        serverUrl.replace(/^ws/, 'http').replace(/\/ws$/, '') + '/api/registries';
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as { registries: RegistryListing[] };
      registries.value = data.registries;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Could not load registries';
      registries.value = [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update the selected registry ID.
   *
   * @param id — Registry ID to select.
   */
  function select(id: string): void {
    selectedId.value = id;
  }

  /**
   * Get the currently selected registry, or undefined.
   */
  const selected = (): RegistryListing | undefined => {
    return registries.value.find((r) => r.id === selectedId.value);
  };

  /**
   * Aggregate example prompts from the selected registry.
   * Falls back to an empty array if no registry is selected.
   */
  const examplePrompts = (): string[] => {
    const reg = selected();
    if (!reg) return [];
    return reg.components
      .flatMap((c) => c.examplePrompts ?? [])
      .slice(0, 8); // Cap to 8 to keep hero manageable
  };

  return {
    registries: readonly(registries),
    selectedId: readonly(selectedId),
    loading: readonly(loading),
    error: readonly(error),
    load,
    select,
    selected,
    examplePrompts,
  };
}
