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
   * Seed the channel's expected sequence number so that the very next
   * `add()` call flushes immediately rather than buffering.
   *
   * Used by the server when it publishes the FIRST frame on a brand
   * new channel — e.g. when Claude Code's `render_component` MCP
   * tool is bridged into a `COMPONENT_MOUNTED` frame. The server's
   * `session.seqGenerator` is a single counter shared across every
   * channel, so the first outgoing seq on a fresh channel is rarely
   * `0`. Without this, the FrameBuffer holds the frame until a frame
   * with seq `0` arrives (which never does for a server-initiated
   * channel), and the bridge silently never reaches the client.
   *
   * @param channel — Channel whose expected seq should be advanced.
   * @param seq — Sequence number of the frame being primed (so
   *   `nextExpectedSeq` becomes exactly `seq`, ready to flush on the
   *   next `add()`).
   */
  primeForServerInit(channel: string, seq: bigint): void {
    const state = this.#getChannelState(channel);
    if (state.nextExpectedSeq === 0n) {
      // Only seed on the very first outgoing frame. Subsequent
      // server-initiated frames on the same channel should flow
      // through `add()` normally so any client-originated frames
      // received in between still get ordered correctly.
      state.nextExpectedSeq = seq;
    }
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
