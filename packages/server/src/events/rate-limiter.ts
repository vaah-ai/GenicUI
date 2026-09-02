/**
 * Token-bucket rate limiter for per-component event rate limiting (F19-AC3).
 *
 * Each component gets its own TokenBucket instance. The bucket refills at
 * a fixed rate (200 tokens/sec by default) up to a maximum capacity. When
 * an event arrives, one token is consumed. If no tokens are available,
 * the event is dropped and the drop counter is incremented.
 *
 * @module @genicui/server/events/rate-limiter
 * @see {F19-AC3} — High-volume events rate-limited, 200/s cap
 */

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/**
 * Configuration for a TokenBucket rate limiter.
 */
export interface RateLimiterConfig {
  /** Tokens added per refill interval. Default: 200. */
  readonly capacity: number;

  /** Milliseconds between refills. Default: 1000 (1 second). */
  readonly intervalMs: number;
}

/**
 * Result of attempting to pass an event through the rate limiter.
 */
export interface RateLimitResult {
  /** True if the event is allowed through, false if rate-limited. */
  readonly allowed: boolean;

  /** Total number of events dropped since the limiter was created. */
  readonly dropCount: number;
}

/**
 * Default rate limit: 200 events per second.
 *
 * @see {F19-AC3} — Per-component 200/s event rate cap
 */
const DEFAULT_CAPACITY = 200;

/** Default refill interval: 1 second. */
const DEFAULT_INTERVAL_MS = 1_000;

// ---------------------------------------------------------------------------
// TokenBucket
// ---------------------------------------------------------------------------

/**
 * Token-bucket rate limiter.
 *
 * Starts full (capacity tokens). Each `allow()` call consumes one token.
 * A timer refills tokens at the configured interval, up to capacity.
 *
 * @see {F19-AC3} — 200 events/sec cap with drop_count counter
 */
export class TokenBucket {
  /** Current available tokens. */
  private tokens: number;

  /** Maximum tokens (capacity). */
  private readonly capacity: number;

  /** Milliseconds between refills. */
  private readonly intervalMs: number;

  /** Total events dropped since creation. */
  private _dropCount: number;

  /** Timer handle for periodic refill. */
  private timerId: ReturnType<typeof setInterval> | null;

  /** Whether the bucket has been stopped. */
  private stopped: boolean;

  /**
   * Create a new token-bucket rate limiter.
   *
   * @param config — optional configuration (default: 200 tokens, 1-second refill)
   */
  constructor(config?: RateLimiterConfig) {
    this.capacity = config?.capacity ?? DEFAULT_CAPACITY;
    this.intervalMs = config?.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.tokens = this.capacity;
    this._dropCount = 0;
    this.stopped = false;
    this.timerId = null;

    // Start the refill timer
    this.startRefill();
  }

  /**
   * Total events dropped since creation.
   */
  public get dropCount(): number {
    return this._dropCount;
  }

  /**
   * Attempt to allow an event through the rate limiter.
   *
   * Consumes one token if available. Returns `{ allowed: false }` and
   * increments the drop counter if no tokens are available.
   *
   * @returns the rate limit result with allowed status and drop count
   */
  public allow(): RateLimitResult {
    if (this.tokens > 0) {
      this.tokens--;
      return { allowed: true, dropCount: this._dropCount };
    }

    this._dropCount++;
    return { allowed: false, dropCount: this._dropCount };
  }

  /**
   * Stop the refill timer. Useful for testing.
   */
  public stop(): void {
    this.stopped = true;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Reset the bucket to full capacity and clear the drop counter.
   * Useful for testing.
   */
  public reset(): void {
    this.tokens = this.capacity;
    this._dropCount = 0;
  }

  /**
   * Start the periodic refill timer.
   * On each tick, restore tokens to capacity.
   */
  private startRefill(): void {
    if (this.stopped) {
      return;
    }

    this.timerId = setInterval(() => {
      if (this.stopped) {
        return;
      }
      this.tokens = this.capacity;
    }, this.intervalMs);

    // Suppress lint: interval is stored for cleanup, not used directly
    void this.timerId;
  }
}
