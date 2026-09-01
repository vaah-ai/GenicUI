/**
 * Monotonic uint64 sequence generator.
 *
 * Every frame on the wire carries a monotonically increasing `seq` value.
 * This is the ordering guarantee for the entire system. Out-of-order
 * frames are buffered until contiguous.
 *
 * @module @genicui/core/protocol/sequence
 * @see {F3-AC1} — Monotonic uint64 over 1000 calls
 */

/** Maximum uint64 value: 2^64 - 1. */
const UINT64_MAX = 2n ** 64n - 1n;

/**
 * Generates monotonically increasing uint64 sequence numbers.
 *
 * JavaScript is single-threaded, so a simple counter is sufficient —
 * no atomic operations needed. Values wrap at 2^64.
 */
export class SequenceGenerator {
  #counter: bigint = 0n;

  /**
   * Returns the next monotonic uint64 sequence number.
   *
   * @returns The next sequence number (bigint).
   * @throws {RangeError} if the counter exceeds uint64 max.
   */
  next(): bigint {
    const seq = this.#counter;

    if (this.#counter > UINT64_MAX) {
      throw new RangeError(
        'SequenceGenerator counter exceeded uint64 max (2^64 - 1)',
      );
    }

    this.#counter++;
    return seq;
  }

  /**
   * Returns the current counter value without incrementing.
   * Useful for testing and inspection.
   */
  get current(): bigint {
    return this.#counter;
  }

  /**
   * Resets the counter to the given value.
   * Used for testing and session recovery scenarios.
   *
   * @param value - The starting value (default 0n).
   */
  reset(value: bigint = 0n): void {
    if (value < 0n) {
      throw new RangeError('SequenceGenerator counter cannot be negative');
    }
    if (value > UINT64_MAX) {
      throw new RangeError(
        'SequenceGenerator counter cannot exceed uint64 max',
      );
    }
    this.#counter = value;
  }
}
