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
 * Per-channel state for the frame buffer.
 */
interface ChannelState {
  /** Buffered frames keyed by sequence number. */
  buffered: Map<bigint, FrameEnvelope>;
  /** Next sequence number expected for contiguous flush. */
  nextExpectedSeq: bigint;
}

/**
 * Buffers frames per channel until they arrive in sequence order.
 *
 * When frames arrive out of order, they are stored until all gaps
 * are filled. Once a contiguous run is available from the expected
 * sequence number, frames are flushed in order.
 */
export class FrameBuffer {
  #channels: Map<string, ChannelState> = new Map();

  /**
   * Adds a frame to the buffer and returns any frames that can be
   * flushed in order.
   *
   * @param frame - The frame to buffer.
   * @returns Frames that can be dispatched in order (may be empty).
   */
  add(frame: FrameEnvelope): FrameEnvelope[] {
    const state = this.#getChannelState(frame.channel);
    state.buffered.set(frame.seq, frame);

    // Flush contiguous frames starting from nextExpectedSeq
    const flushed: FrameEnvelope[] = [];

    while (state.buffered.has(state.nextExpectedSeq)) {
      const f = state.buffered.get(state.nextExpectedSeq);
      if (f) {
        flushed.push(f);
        state.buffered.delete(state.nextExpectedSeq);
        state.nextExpectedSeq++;
      } else {
        break;
      }
    }

    return flushed;
  }

  /**
   * Returns the number of buffered frames waiting for gaps to fill.
   *
   * @param channel - The channel to check.
   * @returns Count of buffered frames.
   */
  pendingCount(channel: string): number {
    const state = this.#channels.get(channel);
    return state ? state.buffered.size : 0;
  }

  /**
   * Returns the next expected sequence number for a channel.
   *
   * @param channel - The channel to check.
   * @returns The next expected sequence number.
   */
  nextExpectedSeq(channel: string): bigint {
    const state = this.#channels.get(channel);
    return state ? state.nextExpectedSeq : 0n;
  }

  /**
   * Clears all buffered frames for a channel.
   *
   * @param channel - The channel to clear.
   */
  clear(channel: string): void {
    this.#channels.delete(channel);
  }

  /**
   * Resets the entire buffer state.
   */
  reset(): void {
    this.#channels.clear();
  }

  /**
   * Returns or creates the channel state for a given channel.
   */
  #getChannelState(channel: string): ChannelState {
    let state = this.#channels.get(channel);
    if (!state) {
      state = { buffered: new Map(), nextExpectedSeq: 0n };
      this.#channels.set(channel, state);
    }
    return state;
  }
}
