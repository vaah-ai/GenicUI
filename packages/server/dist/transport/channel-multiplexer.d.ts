/**
 * Channel multiplexer — per-socket channel registry with 256-channel limit,
 * FrameBuffer per channel for out-of-order dispatch.
 *
 * @module @genicui/server/transport/channel-multiplexer
 *
 * @see {F11} — Frame envelope + channel multiplexing
 * @see {F11-AC2} — 257th channel -> error -32001
 * @see {F11-AC3} — Sequence-ordered dispatch
 */
import type { FrameEnvelope } from '@genicui/core';
/**
 * JSON-RPC error code for channel limit exceeded.
 * -32001 indicates the requested channel cannot be created.
 *
 * @see {F11-AC2} — 257th channel rejected
 */
export declare const ERROR_CODE_CHANNEL_LIMIT: -32001;
/**
 * Result of a dispatch operation: frames emitted in sequence order.
 */
export interface DispatchResult {
    /** Channel the frame was dispatched to. */
    channel: string;
    /** Frames flushed in sequence order (may be empty if frame was buffered). */
    frames: FrameEnvelope[];
}
/**
 * Channel multiplexer for a single WebSocket connection.
 *
 * Manages up to 256 channels per socket, each with its own FrameBuffer
 * for out-of-order frame buffering and contiguous flush.
 *
 * @see {F11-AC2} — 256 channel limit
 * @see {F11-AC3} — Sequence ordered dispatch
 */
export declare class ChannelMultiplexer {
    #private;
    /**
     * Create a new channel multiplexer.
     */
    constructor();
    /**
     * Return the number of registered channels.
     */
    get channelCount(): number;
    /**
     * Register a new channel if it does not exist.
     *
     * Creates a new FrameBuffer for the channel. Returns an error if the
     * channel limit (256) is exceeded.
     *
     * @param channel - The channel name to register.
     * @returns `null` on success, or an error code string on failure.
     */
    registerChannel(channel: string): null | {
        error: string;
        code: number;
    };
    /**
     * Create a new channel if it doesn't exist, then dispatch the frame.
     *
     * Returns frames that can be dispatched in sequence order.
     * Returns `null` if the channel limit is exceeded.
     *
     * @param frame - The frame to dispatch.
     * @returns Dispatch result with flushed frames, or `null` if channel limit exceeded.
     */
    dispatch(frame: FrameEnvelope): DispatchResult | null;
    /**
     * Check if a channel is registered.
     *
     * @param channel - The channel name to check.
     */
    hasChannel(channel: string): boolean;
    /**
     * Get all registered channel names.
     */
    getChannels(): string[];
    /**
     * Destroy the multiplexer, clearing all buffers.
     * Called when the WebSocket connection is closed.
     */
    destroy(): void;
}
//# sourceMappingURL=channel-multiplexer.d.ts.map