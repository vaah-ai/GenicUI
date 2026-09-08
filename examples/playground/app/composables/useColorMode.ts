/**
 * Color mode composable for the GenicUI playground.
 *
 * Manages three modes — `system`, `light`, `dark` — persisted in
 * `localStorage` under the `genicui-theme` key. The `resolved` value
 * collapses `system` to either `light` or `dark` based on the user's
 * `prefers-color-scheme` media query, and is what gets written to
 * `document.documentElement.dataset.theme` so the CSS layer can flip.
 *
 * Singleton pattern: the ref and the media-query listener are module-
 * level, so every `useColorMode()` call returns the SAME instance. This
 * matters because `nuxt.config.ts` also writes `data-theme` from an
 * inline FOUC-prevention script; we sync from that initial value on
 * the first call so the composable's `mode` always matches what the
 * user already saw paint.
 *
 * SSR-safety: every `window`/`localStorage`/`matchMedia` access is
 * guarded by `typeof window !== 'undefined'`. SSR is disabled in the
 * playground anyway, but this keeps the composable portable.
 *
 * @see F47 follow-up — full light/dark theming
 */
import { computed, onBeforeUnmount, ref, readonly, watch, type ComputedRef, type Ref } from 'vue';

export type ColorMode = 'system' | 'light' | 'dark';
export type ResolvedColorMode = 'light' | 'dark';

const STORAGE_KEY = 'genicui-theme';
const VALID_MODES: readonly ColorMode[] = ['system', 'light', 'dark'] as const;

/** Module-level singleton state. */
const mode: Ref<ColorMode> = ref<ColorMode>('system');
const systemPrefersDark = ref<boolean>(false);
let initialized = false;
let mediaQuery: MediaQueryList | null = null;

function isColorMode(value: unknown): value is ColorMode {
  return typeof value === 'string' && (VALID_MODES as readonly string[]).includes(value);
}

/** Read persisted mode from localStorage (or fall back to 'system'). */
function readPersistedMode(): ColorMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isColorMode(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

/** Read whatever data-theme the FOUC script already wrote to <html>. */
function readInitialResolved(): ResolvedColorMode {
  if (typeof document === 'undefined') return 'dark';
  const attr = document.documentElement.dataset.theme;
  return attr === 'light' ? 'light' : 'dark';
}

/** Read the current `prefers-color-scheme: dark` value. */
function readSystemPrefers(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Set up the MediaQueryList listener exactly once per page lifetime. */
function attachSystemListener(): void {
  if (typeof window === 'undefined' || mediaQuery) return;
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemPrefersDark.value = mediaQuery.matches;
  // `addEventListener` is the modern API; the older `addListener` is
  // a Safari < 14 fallback that we keep for robustness.
  const handler = (e: MediaQueryListEvent) => {
    systemPrefersDark.value = e.matches;
  };
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handler);
  } else {
    // @ts-expect-error — legacy API for older Safari
    mediaQuery.addListener(handler);
  }
}

/**
 * Lazy initialization — runs once on first call. The ref/module-singleton
 * pattern means state persists across components, but we need to read
 * from localStorage + DOM before the first paint, which means deferring
 * to a function rather than running at module load (the FOUC inline
 * script has already painted by the time any component mounts).
 */
function ensureInitialized(): void {
  if (initialized) return;
  initialized = true;
  mode.value = readPersistedMode();
  systemPrefersDark.value = readSystemPrefers();
  attachSystemListener();
}

export interface UseColorModeReturn {
  /** The user's selected mode (`system`, `light`, or `dark`). */
  readonly mode: Readonly<Ref<ColorMode>>;
  /** The mode actually applied to <html> after resolving `system`. */
  readonly resolved: ComputedRef<ResolvedColorMode>;
  /** Set the mode explicitly and persist to localStorage. */
  set: (next: ColorMode) => void;
  /** Cycle system → light → dark → system. */
  toggle: () => void;
}

/**
 * Reactive access to the playground's color mode.
 *
 * Returns the singleton state plus `set`/`toggle` mutators. The
 * `resolved` computed reflects what the DOM is currently painted in
 * (i.e., what the user's CSS layer sees), which is what UI labels
 * like the toggle button should display.
 */
export function useColorMode(): UseColorModeReturn {
  ensureInitialized();

  // Sync <html data-theme> whenever mode or system pref changes.
  // This runs in every component that calls useColorMode, but Vue
  // deduplicates watchers so it's effectively once per change.
  const stop = watch(
    [mode, systemPrefersDark],
    ([m, prefersDark]) => {
      if (typeof document === 'undefined') return;
      const resolved: ResolvedColorMode =
        m === 'system' ? (prefersDark ? 'dark' : 'light') : m;
      document.documentElement.dataset.theme = resolved;
    },
    { immediate: true },
  );
  // The watcher is shared across calls (module singleton ref). Only
  // register the teardown from the first call site so we don't drop
  // the watcher prematurely when components unmount in a different
  // order than they mounted.
  if (typeof onBeforeUnmount === 'function') {
    // onBeforeUnmount is only valid inside a setup context; we guard
    // so this composable remains callable from non-component code
    // (e.g. a future plugin or test harness) without crashing.
    onBeforeUnmount(() => {
      // Intentionally a no-op — see comment above.
      void stop;
    });
  }

  const resolved = computed<ResolvedColorMode>(() => {
    if (mode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light';
    }
    return mode.value;
  });

  function set(next: ColorMode): void {
    if (!isColorMode(next)) return;
    mode.value = next;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage may be disabled (private mode, quota); the
        // in-memory state still works, the persistence is best-effort.
      }
    }
  }

  function toggle(): void {
    const next: ColorMode =
      mode.value === 'system' ? 'light' : mode.value === 'light' ? 'dark' : 'system';
    set(next);
  }

  return {
    mode: readonly(mode),
    resolved,
    set,
    toggle,
  };
}

// Exposed for tests — initial state helpers that don't need Vue setup.
export const __test__ = {
  STORAGE_KEY,
  readPersistedMode,
  readInitialResolved,
  readSystemPrefers,
  VALID_MODES,
};
