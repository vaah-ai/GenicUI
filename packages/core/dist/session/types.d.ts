/**
 * Session store types.
 *
 * @module @genicui/core/session/types
 * @see {F5} — SessionStore interface + InMemoryStore
 */
/**
 * Callback invoked when a key's value changes.
 */
export type SessionStoreCallback<V> = (value: V) => void;
/**
 * Session store interface.
 *
 * Provides a swappable backend abstraction for session state management.
 * Implementations:
 * - {@link InMemoryStore} — development / testing (Map-backed)
 * - `DODurableObjectStore` — Cloudflare Workers deployment (post-MVP)
 * - `PostgresListenNotifyStore` — self-hosted deployment (post-MVP)
 *
 * @typeParam K — session key type (string subset)
 * @typeParam V — value type stored at each key
 *
 * @see {F5} — SessionStore interface
 */
export interface SessionStore<K extends string, V> {
    /**
     * Retrieve the current value for a key.
     * @returns The stored value, or `undefined` if the key has no value.
     * @see {F5-AC1} — set then get returns same reference
     */
    get(key: K): Promise<V | undefined>;
    /**
     * Store a value at a key, overwriting any existing value.
     * Notifies subscribers after the value is persisted.
     * @see {F5-AC2} — concurrent set last-write-wins
     * @see {F5-AC3} — subscribe fires on set
     */
    set(key: K, value: V): Promise<void>;
    /**
     * Append an item to the log buffer for a key.
     * Notifies subscribers after the item is appended.
     */
    append(key: K, item: V): Promise<void>;
    /**
     * Subscribe to changes on a key.
     * The callback fires on `set()` and `append()` for the subscribed key.
     * @returns An unsubscribe function that removes the callback.
     */
    subscribe(key: K, callback: SessionStoreCallback<V>): () => void;
}
//# sourceMappingURL=types.d.ts.map