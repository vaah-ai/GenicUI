/**
 * Component store — in-memory registry for mounted components and idempotency.
 *
 * For the MVP (stateless HTTP via InMemoryTransport), this module uses
 * module-level Maps. For WS transport (future), each session would have
 * its own ComponentStore instance.
 *
 * @module @genicui/server/mcp/component-store
 * @see {F16} — render_component tool
 */

import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// ULID generation (no external dependency)
// ---------------------------------------------------------------------------

/**
 * Generate a ULID-like string using crypto.randomBytes.
 *
 * A ULID is 128 bits: 48-bit timestamp + 80-bit randomness.
 * Encoded as 26 base32 characters (no padding).
 *
 * This implementation uses random bytes only (no timestamp ordering),
 * which is sufficient for component IDs where global ordering is not
 * required.
 *
 * @returns 26-character base32 string
 */
export function generateUlid(): string {
  // 16 bytes = 128 bits = 26 base32 chars
  const bytes = randomBytes(16);
  return encodeBase32(bytes);
}

/** Base32 alphabet (Crockford variant, 32 characters, no I/O/U to avoid confusion). */
const BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Encode 16 bytes to a 26-character base32 string.
 *
 * Uses a bit-by-bit approach to correctly handle all 128 bits
 * without JavaScript number overflow issues.
 *
 * @param bytes — 16 bytes to encode
 * @returns 26-character base32 string
 */
function encodeBase32(bytes: Uint8Array): string {
  // Collect all 128 bits as a flat bit array
  const bits: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]!;
    for (let j = 7; j >= 0; j--) {
      bits.push((byte >>> j) & 1);
    }
  }

  // Group into 5-bit chunks (128 bits / 5 = 25 chunks + 3 remaining bits)
  const result: string[] = [];
  for (let i = 0; i < 26; i++) {
    let value = 0;
    for (let b = 0; b < 5; b++) {
      const bitIndex = i * 5 + b;
      value = (value << 1) | (bits[bitIndex] ?? 0);
    }
    const char = BASE32_ALPHABET[value];
    result.push(char ?? '');
  }

  return result.join('');
}

/**
 * Generate a random 16-character hex string for session identification.
 *
 * @returns 16-character hex string
 */
function generateSessionHex(): string {
  return randomBytes(8).toString('hex');
}

// ---------------------------------------------------------------------------
// ComponentId generation
// ---------------------------------------------------------------------------

/**
 * Generate a componentId from a component name.
 *
 * Format: `${prefix}-${sessionId.slice(0,8)}-${ulid()}`
 * - prefix: first 2 characters of component name (lowercase)
 * - session: 8-character hex string from randomBytes
 * - ulid: 26-character base32 string
 *
 * Example: `dt-7f3a9b2c-ABCDEFGHJKLMNPQRSTVWXYZ23456`
 *
 * @param name — component name (e.g., "DataTable")
 * @returns unique componentId string
 */
export function generateComponentId(name: string): string {
  const prefix = name.slice(0, 2).toLowerCase();
  const session = generateSessionHex().slice(0, 8);
  const ulid = generateUlid();
  return `${prefix}-${session}-${ulid}`;
}

// ---------------------------------------------------------------------------
// Component registry
// ---------------------------------------------------------------------------

/** A mounted component record. */
export interface MountedComponent {
  /** Unique component identifier. */
  readonly componentId: string;
  /** Component name (e.g., "DataTable"). */
  readonly name: string;
  /** Channel associated with this component. */
  readonly channel: string;
  /** Props used to render this component. */
  readonly props: Readonly<Record<string, unknown>>;
  /** Timestamp when the component was mounted (ISO 8601). */
  readonly mountedAt: string;
}

/**
 * Deep clone a record to ensure immutability.
 *
 * @param obj — the object to clone
 * @returns a new object with the same structure
 */
function deepCloneRecord(obj: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
}

/**
 * In-memory component store.
 *
 * Tracks mounted components and idempotency keys for the stateless
 * HTTP transport. For WS transport, each session would have its own
 * instance.
 *
 * Provides per-componentId async locks (F17-AC4) to serialize
 * concurrent updates and prevent torn state.
 */
export class ComponentStore {
  /** Mounted components indexed by componentId. */
  private readonly components = new Map<string, MountedComponent>();

  /** Idempotency keys mapped to componentIds. */
  private readonly idempotencyKeys = new Map<string, string>();

  /** Per-componentId async locks for concurrent update serialization (F17-AC4). */
  private readonly locks = new Map<string, Promise<void>>();

  /**
   * Check if an idempotency key exists and return the associated componentId.
   *
   * @param key — the idempotency key
   * @returns the componentId if the key exists, undefined otherwise
   */
  public getIdempotencyKey(key: string): string | undefined {
    return this.idempotencyKeys.get(key);
  }

  /**
   * Register a component with an optional idempotency key.
   *
   * If an idempotency key is provided and already exists, returns the
   * existing componentId without re-registering.
   *
   * @param component — the component to register
   * @param idempotencyKey — optional idempotency key for re-render safety
   * @returns the componentId (existing if idempotency key matches)
   */
  public register(
    component: MountedComponent,
    idempotencyKey?: string,
  ): string {
    // Check idempotency first
    if (idempotencyKey) {
      const existing = this.idempotencyKeys.get(idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    // Register the component
    this.components.set(component.componentId, component);

    // Store idempotency key
    if (idempotencyKey) {
      this.idempotencyKeys.set(idempotencyKey, component.componentId);
    }

    return component.componentId;
  }

  /**
   * Get a mounted component by ID.
   *
   * @param componentId — the component to look up
   * @returns the mounted component, or undefined if not found
   */
  public get(componentId: string): MountedComponent | undefined {
    return this.components.get(componentId);
  }

  /**
   * Update a component's props atomically under a per-componentId lock.
   *
   * This ensures concurrent updates are serialized (F17-AC4), preventing
   * torn state when multiple updates arrive simultaneously.
   *
   * @param componentId — the component to update
   * @param newProps — the updated props (full replacement)
   * @returns the updated component, or undefined if not found
   * @throws if the componentId does not exist
   */
  public async update(
    componentId: string,
    newProps: Record<string, unknown>,
  ): Promise<MountedComponent> {
    // Acquire the per-componentId lock
    await this.acquireLock(componentId);

    try {
      const component = this.components.get(componentId);
      if (!component) {
        throw new Error(`Component "${componentId}" not found`);
      }

      // Create a new component record with updated props (immutable update)
      const updated: MountedComponent = {
        componentId: component.componentId,
        name: component.name,
        channel: component.channel,
        props: newProps,
        mountedAt: component.mountedAt,
      };

      this.components.set(componentId, updated);
      return updated;
    } finally {
      this.releaseLock(componentId);
    }
  }

  /**
   * Acquire a per-componentId async lock.
   *
   * Each call chains onto the previous promise, ensuring sequential
   * execution for updates on the same componentId.
   *
   * @param componentId — the component to lock
   */
  private async acquireLock(componentId: string): Promise<void> {
    const previous = this.locks.get(componentId);
    const lock = new Promise<void>((resolve) => {
      this.locks.set(componentId, (previous ?? Promise.resolve()).then(() => resolve()));
    });
    await lock;
  }

  /**
   * Release the per-componentId lock by clearing it.
   *
   * @param componentId — the component to unlock
   */
  private releaseLock(componentId: string): void {
    this.locks.delete(componentId);
  }

  /**
   * Unmount a component by ID.
   *
   * Removes the component from the store and returns true if it existed.
   * Callers should notify the event subscription manager after unmounting
   * to trigger auto-cleanup (F18-AC3).
   *
   * @param componentId — the component to unmount
   * @returns true if the component was found and removed, false otherwise
   */
  public unmount(componentId: string): boolean {
    return this.components.delete(componentId);
  }

  /**
   * Get the count of mounted components.
   */
  public get count(): number {
    return this.components.size;
  }

  /**
   * Clear all registered components and idempotency keys.
   * Useful for testing.
   */
  public clear(): void {
    this.components.clear();
    this.idempotencyKeys.clear();
    this.locks.clear();
  }
}

/**
 * Global component store instance (stateless HTTP transport).
 *
 * For WS transport (future), create a new ComponentStore per session.
 */
export const componentStore = new ComponentStore();

// ---------------------------------------------------------------------------
// Channel generation
// ---------------------------------------------------------------------------

/**
 * Generate a channel name for a component.
 *
 * The channel name matches the componentId for simplicity.
 *
 * @param componentId — the component ID
 * @returns channel name (same as componentId)
 */
export function generateChannel(componentId: string): string {
  return componentId;
}
