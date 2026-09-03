/**
 * Session recovery logic — F33.
 *
 * Manages a per-session message buffer store. When a client reconnects
 * via WebSocket, the server replays the last 10 messages within a 5s
 * window from the previous session. If `Last-Event-ID` is too old,
 * the server sends `STATE_SNAPSHOT` instead.
 *
 * @module @genicui/server/session-recovery/session-recovery
 *
 * @see {F33} — Session recovery (last-10-messages replay)
 * @see {F33-AC1} — Replay bounded to last 10 / 5s window
 * @see {F33-AC2} — Last-Event-ID header honored, ordered replay
 * @see {F33-AC3} — Older Last-Event-ID -> STATE_SNAPSHOT
 */

import type { FrameEnvelope } from '@genicui/core';
import { serializeFrame } from '../transport/frame-handler.js';
import { MessageBuffer } from './message-buffer.js';
import type { LastEventId, ReplayResult } from './types.js';

/**
 * ElysiaWS send method type.
 */
type SendFn = (data: string) => void;

/**
 * Parse the `Last-Event-ID` header value.
 *
 * Format: `channel:seq` where channel is a string and seq is a
 * non-negative integer (e.g., `dt-7f3a9b2c:14`).
 *
 * @param headerValue — The raw header value.
 * @returns Parsed LastEventId, or `null` if the header is missing/malformed.
 */
export function parseLastEventId(headerValue: string | null | undefined): LastEventId | null {
  if (!headerValue || typeof headerValue !== 'string') {
    return null;
  }

  const trimmed = headerValue.trim();
  if (!trimmed) {
    return null;
  }

  // Find the last colon to separate channel:seq
  const lastColon = trimmed.lastIndexOf(':');
  if (lastColon === -1) {
    return null;
  }

  const channel = trimmed.slice(0, lastColon);
  const seqStr = trimmed.slice(lastColon + 1);

  // Validate channel is non-empty
  if (!channel) {
    return null;
  }

  // Parse sequence number
  let seq: bigint;
  try {
    seq = BigInt(seqStr);
  } catch {
    return null;
  }

  // Sequence must be non-negative
  if (seq < 0n) {
    return null;
  }

  return { channel, seq };
}

/**
 * Extract the `Last-Event-ID` header from an Elysia upgrade context.
 *
 * @param ctx — The upgrade context (has `.request` property).
 * @returns The raw header value, or `null` if not present.
 */
export function extractLastEventIdHeader(ctx: { request: Request }): string | null {
  return ctx.request.headers.get('last-event-id') ?? null;
}

/**
 * Extract the `X-GenicUI-Session-Id` header from an Elysia upgrade context.
 * On reconnect, the client sends its previous session ID so the server
 * can look up the message buffer for replay.
 *
 * @param ctx — The upgrade context (has `.request` property).
 * @returns The session ID, or `null` if not present.
 */
export function extractSessionIdHeader(ctx: { request: Request }): string | null {
  return ctx.request.headers.get('x-genicui-session-id') ?? null;
}

/**
 * A global store of session message buffers, keyed by session ID.
 *
 * When a WebSocket session closes, its buffer is stored here
 * so that a reconnecting client can replay from it.
 * Buffers are cleaned up after the TTL expires or on replay.
 *
 * @internal
 */
const sessionBufferStore: Map<string, MessageBuffer> = new Map();

/**
 * Store a session's message buffer for future replay on reconnect.
 *
 * @param sessionId — The session ID to store under.
 * @param buffer — The message buffer to store.
 */
export function storeSessionBuffer(sessionId: string, buffer: MessageBuffer): void {
  sessionBufferStore.set(sessionId, buffer);
}

/**
 * Retrieve a session's stored message buffer, or `null` if not found.
 *
 * @param sessionId — The session ID to look up.
 * @returns The stored buffer, or `null` if no buffer exists.
 */
export function retrieveSessionBuffer(sessionId: string): MessageBuffer | null {
  return sessionBufferStore.get(sessionId) ?? null;
}

/**
 * Remove a session's stored buffer after replay (or cleanup).
 *
 * @param sessionId — The session ID to remove.
 */
export function removeSessionBuffer(sessionId: string): void {
  sessionBufferStore.delete(sessionId);
}

/**
 * Clean up all session buffers that are empty or have expired.
 *
 * @internal Called periodically or on server shutdown.
 */
export function cleanupSessionBuffers(): void {
  for (const [sessionId, buffer] of sessionBufferStore) {
    if (buffer.size === 0) {
      sessionBufferStore.delete(sessionId);
    }
  }
}

/**
 * Recover a session by replaying buffered messages or sending a snapshot.
 *
 * Flow:
 * 1. If Last-Event-ID is present and a previous session buffer exists:
 *    - Look up the buffer by session ID
 *    - Replay frames from the buffer in order
 *    - Send `session.resynced` frame
 *    - Clear the stored buffer
 * 2. If Last-Event-ID is present but no valid buffer / gap too large:
 *    - The caller should send STATE_SNAPSHOT (F33-AC3)
 * 3. If no Last-Event-ID:
 *    - No recovery needed (first connection)
 *
 * @param buffer — The stored message buffer for the previous session (or null).
 * @param lastEventId — The parsed Last-Event-ID (or null for first connection).
 * @param send — Function to send a serialized frame to the WebSocket.
 * @param seqGenerator — Monotonic sequence number generator for new frames.
 * @returns The replay result.
 */
export function recoverSession(
  buffer: MessageBuffer | null,
  lastEventId: LastEventId | null,
  send: SendFn,
  seqGenerator: { next(): bigint },
): ReplayResult {
  // No Last-Event-ID means first connection — nothing to replay
  if (lastEventId === null) {
    return { replayed: false, count: 0 };
  }

  // No buffer found for this session — gap too large
  if (buffer === null) {
    console.error(
      `[F33] Last-Event-ID ${lastEventId.channel}:${lastEventId.seq} — no session buffer found`,
    );
    return { replayed: false, count: 0 };
  }

  // Try to replay from the buffer
  const entries = buffer.replayFrom(lastEventId.channel, lastEventId.seq);

  if (entries.length === 0) {
    // Gap too large — entries expired or not in buffer (F33-AC3)
    console.error(
      `[F33] Last-Event-ID ${lastEventId.channel}:${lastEventId.seq} — gap too large, sending STATE_SNAPSHOT`,
    );
    return { replayed: false, count: 0 };
  }

  // Replay frames in order (F33-AC2)
  // entries.length > 0 at this point (checked above)
  const firstEntry = entries[0]!;
  let fromSeq = firstEntry.frame.seq;
  let toSeq = firstEntry.frame.seq;

  for (const entry of entries) {
    const serialized = serializeFrame(entry.frame as never);
    send(serialized);
    toSeq = entry.frame.seq;
  }

  // Send session.resynced frame
  const resyncedFrame: FrameEnvelope = {
    v: 1,
    channel: '__session__',
    type: 'session.resynced',
    payload: {
      fromSeq: Number(fromSeq),
      toSeq: Number(toSeq),
    },
    seq: seqGenerator.next(),
  };

  send(serializeFrame(resyncedFrame as never));

  console.error(
    `[F33] Replayed ${entries.length} frame(s) on channel "${lastEventId.channel}" (seq ${fromSeq} → ${toSeq})`,
  );

  return {
    replayed: true,
    count: entries.length,
    fromSeq,
    toSeq,
  };
}

/**
 * Determine if a STATE_SNAPSHOT should be sent instead of replay.
 *
 * Returns `true` if the Last-Event-ID is present but the buffer
 * has no valid entries (all expired or not matching the channel).
 *
 * @param buffer — The message buffer for this session.
 * @param lastEventId — The parsed Last-Event-ID.
 * @returns `true` if a snapshot should be sent.
 */
export function shouldSendSnapshot(
  buffer: MessageBuffer | null,
  lastEventId: LastEventId,
): boolean {
  if (buffer === null) {
    return true;
  }
  return buffer.isGapTooLarge(lastEventId.channel, lastEventId.seq);
}
