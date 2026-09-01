/**
 * In-memory session store implementation.
 *
 * Uses `Map` for synchronous storage. All methods return resolved Promises
 * to satisfy the async `SessionStore` interface (production backends are
 * inherently async).
 *
 * @module @genicui/core/session/in-memory-store
 * @see {F5} — SessionStore interface + InMemoryStore
 */

import type { SessionStore, SessionStoreCallback } from './types.js';

/**
 * In-memory implementation of {@link SessionStore}.
 *
 * Storage layout:
 * - `#data` — primary key-value store (used by `set` / `get`)
 * - `#logs` — per-key append buffer (used by `append`)
 * - `#subscribers` — per-key callback sets (used by `subscribe`)
 *
 * Thread safety: JavaScript is single-threaded, so concurrent `set()` calls
 * execute synchronously — the last write deterministically wins.
 *
 * @see {F5-AC1} — set then get returns same reference
 * @see {F5-AC2} — concurrent set last-write-wins
 * @see {F5-AC3} — subscribe fires on set
 */
export class InMemoryStore<K extends string, V> implements SessionStore<K, V> {
  /* ------------------------------------------------------------------ */
  /*  Private state                                                     */
  /* ------------------------------------------------------------------ */

  #data = new Map<K, V>();
  #logs = new Map<K, V[]>();
  #subscribers = new Map<K, Set<SessionStoreCallback<V>>>();

  /* ------------------------------------------------------------------ */
  /*  SessionStore interface                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Retrieve the current value for a key.
   *
   * @see {F5-AC1} — set then get returns same reference
   */
  async get(key: K): Promise<V | undefined> {
    return this.#data.get(key);
  }

  /**
   * Store a value at a key, overwriting any existing value.
   *
   * Because JavaScript executes synchronously, concurrent `set()` calls
   * are serialized — the last one wins deterministically.
   *
   * @see {F5-AC2} — concurrent set last-write-wins
   * @see {F5-AC3} — subscribe fires on set
   */
  async set(key: K, value: V): Promise<void> {
    this.#data.set(key, value);
    this.#notify(key, value);
  }

  /**
   * Append an item to the log buffer for a key.
   *
   * Creates a new array at `key` if one does not yet exist.
   * Notifies subscribers with the appended item.
   */
  async append(key: K, item: V): Promise<void> {
    const log = this.#logs.get(key) ?? [];
    log.push(item);
    this.#logs.set(key, log);
    this.#notify(key, item);
  }

  /**
   * Subscribe to changes on a key.
   *
   * The callback fires synchronously (within the async method that
   * triggered the change) on both `set()` and `append()`.
   *
   * @returns A function that removes the callback.
   */
  subscribe(key: K, callback: SessionStoreCallback<V>): () => void {
    let subs = this.#subscribers.get(key);
    if (subs === undefined) {
      subs = new Set();
      this.#subscribers.set(key, subs);
    }
    subs.add(callback);

    return () => {
      subs?.delete(callback);
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Internal helpers                                                  */
  /* ------------------------------------------------------------------ */

  /**
   * Notify all subscribers for `key` with `value`.
   * Iterates a copy of the subscriber set to avoid issues with
   * callbacks that unsubscribe during notification.
   */
  #notify(key: K, value: V): void {
    const subs = this.#subscribers.get(key);
    if (subs === undefined) return;

    for (const cb of [...subs]) {
      cb(value);
    }
  }
}
