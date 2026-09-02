/**
 * Event subscription handler — implements subscribe_to_events (F18).
 *
 * Manages event subscriptions with filtering, TTL, and auto-cleanup
 * on component unmount.
 *
 * @module @genicui/server/mcp/subscribe-handler
 * @see {F18} — subscribe_to_events tool
 */

import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * An active event subscription.
 */
export interface EventSubscription {
  /** Unique subscription identifier (e.g., "sub-9c2a1f"). */
  readonly subscriptionId: string;

  /** Filter: only events from this component. */
  readonly componentId: string | undefined;

  /** Filter: only these action names. Undefined means all events. */
  readonly actions: readonly string[] | undefined;

  /** Filter: only events from this session. */
  readonly sessionId: string | undefined;

  /** When the subscription was created. */
  readonly createdAt: Date;

  /** When the subscription expires. Default 1 hour. */
  readonly expiresAt: Date;
}

/**
 * An event emitted by a component.
 */
export interface ComponentEvent {
  /** The component that emitted this event. */
  readonly componentId: string;

  /** The action name (e.g., "row_selected"). */
  readonly action: string;

  /** Event detail payload. */
  readonly detail: Record<string, unknown>;
}

/**
 * Result of a successful subscription.
 */
export interface SubscribeResult {
  /** The new subscription identifier. */
  readonly subscriptionId: string;
  /** The component ID (if specified). */
  readonly componentId: string | undefined;
  /** The action names (if specified). */
  readonly actions: readonly string[] | undefined;
}

/**
 * Result of a successful unsubscription.
 */
export interface UnsubscribeResult {
  /** The subscription that was removed. */
  readonly subscriptionId: string;
  /** True if the subscription existed and was removed. */
  readonly removed: boolean;
}

/**
 * A matching subscription and the event it matched.
 */
export interface MatchedEvent {
  /** The subscription that matched. */
  readonly subscriptionId: string;
  /** The event that was matched. */
  readonly event: ComponentEvent;
}

/**
 * Error result when an operation fails.
 */
export interface SubscribeError {
  /** JSON-RPC error code. */
  readonly code: number;
  /** Human-readable error message. */
  readonly message: string;
  /** Field-level details (if applicable). */
  readonly details?: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default TTL: 1 hour in milliseconds. */
const DEFAULT_TTL_MS = 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a random subscription ID.
 *
 * Format: "sub-" + 6-char hex string
 * Example: "sub-9c2a1f"
 *
 * @returns A unique subscription ID.
 */
function generateSubscriptionId(): string {
  return `sub-${randomBytes(3).toString('hex')}`;
}

// ---------------------------------------------------------------------------
// EventSubscriptionManager
// ---------------------------------------------------------------------------

/**
 * Manages event subscriptions for the MCP server.
 *
 * Handles:
 * - Creating subscriptions with filters and TTL (F18)
 * - Unsubscribing by subscriptionId (F18-AC2)
 * - Filtering events by componentId and action names (F18-AC1)
 * - Auto-cleanup when components are unmounted (F18-AC3)
 * - TTL expiration (default 1 hour, configurable via expiresAt)
 */
export class EventSubscriptionManager {
  private readonly subscriptions = new Map<string, EventSubscription>();
  private _counter = 0;

  /**
   * Create a new event subscription.
   *
   * @param options — subscription options (componentId, actions, sessionId, expiresAt)
   * @returns the subscription result with a unique subscriptionId
   */
  public subscribe(options: {
    componentId?: string;
    actions?: readonly string[];
    sessionId?: string;
    expiresAt?: string;
  }): SubscribeResult {
    // Cleanup any expired subscriptions before creating a new one.
    this.cleanupExpired();

    const subscriptionId = generateSubscriptionId();
    const now = new Date();

    // Compute expiration: use provided expiresAt or default 1 hour.
    const expiresAt = options.expiresAt
      ? new Date(options.expiresAt)
      : new Date(now.getTime() + DEFAULT_TTL_MS);

    const subscription: EventSubscription = {
      subscriptionId,
      componentId: options.componentId ?? undefined,
      actions: options.actions ?? undefined,
      sessionId: options.sessionId ?? undefined,
      createdAt: now,
      expiresAt,
    };

    this.subscriptions.set(subscriptionId, subscription);
    this._counter++;

    return {
      subscriptionId,
      componentId: options.componentId ?? undefined,
      actions: options.actions ?? undefined,
    };
  }

  /**
   * Remove an active subscription by ID.
   *
   * @param subscriptionId — the subscription to remove
   * @returns result indicating if the subscription was found and removed
   */
  public unsubscribe(subscriptionId: string): UnsubscribeResult {
    const existed = this.subscriptions.delete(subscriptionId);

    return {
      subscriptionId,
      removed: existed,
    };
  }

  /**
   * Find all subscriptions that match a given component event.
   *
   * A subscription matches if:
   * - It has not expired (expiresAt > now).
   * - It has no componentId filter, OR its componentId matches the event.
   * - It has no actions filter, OR the event action is in the actions array.
   *
   * @param event — the component event to match against
   * @returns array of matched events (one per matching subscription)
   */
  public match(event: ComponentEvent): MatchedEvent[] {
    const now = new Date();
    const matched: MatchedEvent[] = [];

    for (const sub of this.subscriptions.values()) {
      // Check expiration
      if (sub.expiresAt <= now) {
        continue;
      }

      // Check componentId filter — F18-AC1
      if (sub.componentId && sub.componentId !== event.componentId) {
        continue;
      }

      // Check actions filter — F18-AC1
      if (sub.actions && sub.actions.length > 0) {
        if (!sub.actions.includes(event.action)) {
          continue;
        }
      }

      matched.push({ subscriptionId: sub.subscriptionId, event });
    }

    return matched;
  }

  /**
   * Called when a component is unmounted. Removes all subscriptions
   * for that componentId.
   *
   * @param componentId — the component that was unmounted
   * @returns the IDs of all removed subscriptions
   */
  public onComponentUnmount(componentId: string): string[] {
    const removed: string[] = [];

    for (const [id, sub] of this.subscriptions.entries()) {
      if (sub.componentId === componentId) {
        this.subscriptions.delete(id);
        removed.push(id);
      }
    }

    return removed;
  }

  /**
   * Remove all subscriptions that have expired.
   *
   * @returns the count of expired subscriptions removed
   */
  public cleanupExpired(): number {
    const now = new Date();
    let count = 0;

    for (const [id, sub] of this.subscriptions.entries()) {
      if (sub.expiresAt <= now) {
        this.subscriptions.delete(id);
        count++;
      }
    }

    return count;
  }

  /**
   * Get a subscription by ID.
   *
   * @param subscriptionId — the subscription to look up
   * @returns the subscription, or undefined if not found
   */
  public get(subscriptionId: string): EventSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * Get the count of active (non-expired) subscriptions.
   */
  public get activeCount(): number {
    const now = new Date();
    let count = 0;

    for (const sub of this.subscriptions.values()) {
      if (sub.expiresAt > now) {
        count++;
      }
    }

    return count;
  }

  /**
   * Get all subscriptions (for testing and debugging).
   */
  public getAll(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Clear all subscriptions. Useful for testing.
   */
  public clear(): void {
    this.subscriptions.clear();
    this._counter = 0;
  }
}

/**
 * Global event subscription manager instance.
 *
 * For WS transport (future), create a new EventSubscriptionManager per session.
 */
export const eventSubscriptionManager = new EventSubscriptionManager();
