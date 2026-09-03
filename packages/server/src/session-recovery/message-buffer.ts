/**
 * Message buffer for session recovery — F33.
 *
 * Circular buffer that retains the last N outbound messages per session,
 * with a TTL to expire stale entries. Supports replay from a given
 * sequence number within a specific channel.
 *
 * @module @genicui/server/session-recovery/message-buffer
 *
 * @see {F33} — Session recovery (last-10-messages replay)
 * @see {F33-AC1} — Replay bounded to last 10 / 5s window
 */

import type { FrameEnvelope } from '@genicui/core';
import type { MessageBufferEntry } from './types.js';
import { MAX_REPLAY_MESSAGES, REPLAY_TTL_MS } from './types.js';

/**
 * Circular buffer of outbound messages for session recovery.
 *
 * Stores the last N messages sent on a WebSocket connection. On
 * reconnect, the server replays messages from the client's last
 * known sequence number.
 *
 * @see {F33-AC1} — Replay bounded to last 10 / 5s window
 */
export class MessageBuffer {
  /** Ordered array of entries — oldest first, newest last. */
  #entries: MessageBufferEntry[] = [];

  /** Maximum number of entries to retain. */
  #maxEntries: number;

  /** Maximum age (ms) of entries eligible for replay. */
  #ttlMs: number;

  /**
   * Create a new message buffer.
   *
   * @param maxEntries — Maximum number of entries (default: 10)
   * @param ttlMs — Maximum age in ms (default: 5000)
   */
  constructor(maxEntries = MAX_REPLAY_MESSAGES, ttlMs = REPLAY_TTL_MS) {
    this.#maxEntries = maxEntries;
    this.#ttlMs = ttlMs;
  }

  /**
   * Current number of entries in the buffer.
   */
  get size(): number {
    return this.#entries.length;
  }

  /**
   * Add a frame to the buffer.
   *
   * Evicts the oldest entry if the buffer is full.
   *
   * @param frame — The frame to buffer.
   */
  add(frame: FrameEnvelope): void {
    const entry: MessageBufferEntry = {
      frame,
      timestamp: Date.now(),
    };

    this.#entries.push(entry);

    // Evict oldest if over capacity
    if (this.#entries.length > this.#maxEntries) {
      this.#entries.shift();
    }
  }

  /**
   * Replay frames from a given sequence number on a specific channel.
   *
   * Returns entries where `frame.channel === channel` and
   * `frame.seq > lastSeq`, filtered to entries within the TTL window.
   * Returns an empty array if no matching entries are found.
   *
   * @param channel — The channel to replay from.
   * @param lastSeq — The last sequence number the client received.
   * @returns Array of entries to replay, ordered by seq.
   */
  replayFrom(channel: string, lastSeq: bigint): MessageBufferEntry[] {
    const now = Date.now();

    return this.#entries.filter((entry) => {
      // Filter by channel
      if (entry.frame.channel !== channel) {
        return false;
      }
      // Filter by sequence number (only frames after lastSeq)
      if (entry.frame.seq <= lastSeq) {
        return false;
      }
      // Filter by TTL
      if (now - entry.timestamp > this.#ttlMs) {
        return false;
      }
      return true;
    });
  }

  /**
   * Check if the buffer has any entries for a given channel after a seq.
   *
   * @param channel — The channel to check.
   * @param lastSeq — The last sequence number.
   * @returns `true` if entries exist within the TTL window.
   */
  hasEntriesAfter(channel: string, lastSeq: bigint): boolean {
    return this.replayFrom(channel, lastSeq).length > 0;
  }

  /**
   * Check if all entries for a channel are expired (older than TTL).
   * Used to determine if STATE_SNAPSHOT fallback is needed.
   *
   * @param channel — The channel to check.
   * @param lastSeq — The last sequence number.
   * @returns `true` if no valid entries exist (gap too large).
   */
  isGapTooLarge(channel: string, lastSeq: bigint): boolean {
    const entries = this.replayFrom(channel, lastSeq);
    return entries.length === 0;
  }

  /**
   * Clear all entries. Called when the session is closed.
   */
  clear(): void {
    this.#entries = [];
  }
}
