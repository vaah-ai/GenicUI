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
/**
 * Generates monotonically increasing uint64 sequence numbers.
 *
 * JavaScript is single-threaded, so a simple counter is sufficient —
 * no atomic operations needed. Values wrap at 2^64.
 */
export declare class SequenceGenerator {
    #private;
    /**
     * Returns the next monotonic uint64 sequence number.
     *
     * @returns The next sequence number (bigint).
     * @throws {RangeError} if the counter exceeds uint64 max.
     */
    next(): bigint;
    /**
     * Returns the current counter value without incrementing.
     * Useful for testing and inspection.
     */
    get current(): bigint;
    /**
     * Resets the counter to the given value.
     * Used for testing and session recovery scenarios.
     *
     * @param value - The starting value (default 0n).
     */
    reset(value?: bigint): void;
}
//# sourceMappingURL=sequence.d.ts.map