/**
 * Out-of-order frame buffer.
 *
 * Buffers frames per channel until sequence numbers are contiguous,
 * then flushes them in order. Implements the wire protocol guarantee
 * that frames are applied in sequence order.
 *
 * @module @genicui/core/protocol/buffer
 * @see {F3-AC2} — Out-of-order frame buffering
 */
import type { FrameEnvelope } from './types.js';
/**
 * Buffers frames per channel until they arrive in sequence order.
 *
 * When frames arrive out of order, they are stored until all gaps
 * are filled. Once a contiguous run is available from the expected
 * sequence number, frames are flushed in order.
 */
export declare class FrameBuffer {
    #private;
    /**
     * Adds a frame to the buffer and returns any frames that can be
     * flushed in order.
     *
     * @param frame - The frame to buffer.
     * @returns Frames that can be dispatched in order (may be empty).
     */
    add(frame: FrameEnvelope): FrameEnvelope[];
    /**
     * Returns the number of buffered frames waiting for gaps to fill.
     *
     * @param channel - The channel to check.
     * @returns Count of buffered frames.
     */
    pendingCount(channel: string): number;
    /**
     * Returns the next expected sequence number for a channel.
     *
     * @param channel - The channel to check.
     * @returns The next expected sequence number.
     */
    nextExpectedSeq(channel: string): bigint;
    /**
     * Clears all buffered frames for a channel.
     *
     * @param channel - The channel to clear.
     */
    clear(channel: string): void;
    /**
     * Resets the entire buffer state.
     */
    reset(): void;
}
//# sourceMappingURL=buffer.d.ts.map