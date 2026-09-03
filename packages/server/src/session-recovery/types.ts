/**
 * Session recovery types — F33.
 *
 * @module @genicui/server/session-recovery/types
 *
 * @see {F33} — Session recovery (last-10-messages replay)
 */

import type { FrameEnvelope } from '@genicui/core';

/**
 * Parsed Last-Event-ID header value.
 *
 * Format: `channel:seq` (e.g., `dt-7f3a9b2c:14`)
 *
 * @see {F33-AC2} — Last-Event-ID header honored, ordered replay
 */
export interface LastEventId {
  /** The channel the last event was on. */
  channel: string;
  /** The sequence number of the last event received. */
  seq: bigint;
}

/**
 * A single entry in the message buffer.
 *
 * Stores the serialized frame string (what was actually sent over WS)
 * and the timestamp of when it was sent.
 */
export interface MessageBufferEntry {
  /** The frame that was sent. */
  frame: FrameEnvelope;
  /** When the frame was sent (epoch ms). */
  timestamp: number;
}

/**
 * Result of a replay operation.
 */
export interface ReplayResult {
  /** Whether replay was successful (vs STATE_SNAPSHOT fallback). */
  replayed: boolean;
  /** Number of frames replayed. */
  count: number;
  /** The seq range that was replayed. */
  fromSeq?: bigint;
  toSeq?: bigint;
}

/**
 * Maximum number of messages to retain in the replay buffer.
 *
 * @see {F33-AC1} — Replay bounded to last 10
 */
export const MAX_REPLAY_MESSAGES = 10;

/**
 * Maximum age (ms) of messages eligible for replay.
 *
 * @see {F33-AC1} — Replay bounded to last 5s
 */
export const REPLAY_TTL_MS = 5_000;
