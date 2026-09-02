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
import { FrameBuffer, MAX_CHANNELS_PER_SOCKET } from '@genicui/core';
/**
 * JSON-RPC error code for channel limit exceeded.
 * -32001 indicates the requested channel cannot be created.
 *
 * @see {F11-AC2} — 257th channel rejected
 */
export const ERROR_CODE_CHANNEL_LIMIT = -32001;
/**
 * Channel multiplexer for a single WebSocket connection.
 *
 * Manages up to 256 channels per socket, each with its own FrameBuffer
 * for out-of-order frame buffering and contiguous flush.
 *
 * @see {F11-AC2} — 256 channel limit
 * @see {F11-AC3} — Sequence ordered dispatch
 */
export class ChannelMultiplexer {
    /** Registered channels and their frame buffers. */
    #channels = new Map();
    /**
     * Create a new channel multiplexer.
     */
    constructor() { }
    /**
     * Return the number of registered channels.
     */
    get channelCount() {
        return this.#channels.size;
    }
    /**
     * Register a new channel if it does not exist.
     *
     * Creates a new FrameBuffer for the channel. Returns an error if the
     * channel limit (256) is exceeded.
     *
     * @param channel - The channel name to register.
     * @returns `null` on success, or an error code string on failure.
     */
    registerChannel(channel) {
        // Already registered — no-op
        if (this.#channels.has(channel)) {
            return null;
        }
        // Check channel limit
        if (this.#channels.size >= MAX_CHANNELS_PER_SOCKET) {
            return {
                error: `Channel limit exceeded (${MAX_CHANNELS_PER_SOCKET} channels per socket)`,
                code: ERROR_CODE_CHANNEL_LIMIT,
            };
        }
        // Create channel with FrameBuffer
        this.#channels.set(channel, {
            buffer: new FrameBuffer(),
        });
        return null;
    }
    /**
     * Create a new channel if it doesn't exist, then dispatch the frame.
     *
     * Returns frames that can be dispatched in sequence order.
     * Returns `null` if the channel limit is exceeded.
     *
     * @param frame - The frame to dispatch.
     * @returns Dispatch result with flushed frames, or `null` if channel limit exceeded.
     */
    dispatch(frame) {
        const channel = frame.channel;
        // Auto-register channel if it doesn't exist
        if (!this.#channels.has(channel)) {
            const error = this.registerChannel(channel);
            if (error !== null) {
                return null;
            }
        }
        const state = this.#channels.get(channel);
        // Add frame to buffer; buffer handles ordering
        const frames = state.buffer.add(frame);
        return {
            channel,
            frames,
        };
    }
    /**
     * Check if a channel is registered.
     *
     * @param channel - The channel name to check.
     */
    hasChannel(channel) {
        return this.#channels.has(channel);
    }
    /**
     * Get all registered channel names.
     */
    getChannels() {
        return Array.from(this.#channels.keys());
    }
    /**
     * Destroy the multiplexer, clearing all buffers.
     * Called when the WebSocket connection is closed.
     */
    destroy() {
        this.#channels.clear();
    }
}
//# sourceMappingURL=channel-multiplexer.js.map