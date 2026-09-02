/**
 * Internal event bus types — F20.
 *
 * @module @genicui/server/bus
 *
 * @see {F20} — Internal event bus (post-emit hook + backpressure)
 */

/** Maximum outbound queue depth per socket before backpressure kicks in. */
export const MAX_OUTBOUND_QUEUE = 500;

/** WS close code sent when outbound queue exceeds MAX_OUTBOUND_QUEUE. */
export const CLOSE_CODE_QUEUE_OVERFLOW = 1013;

/**
 * Callback fired after a frame has been successfully written to the
 * underlying WebSocket transport.
 *
 * @see {F20-AC2} — post-emit hook fires after WS write
 */
export type PostEmitHook = (channel: string, seq: bigint) => void;

/**
 * Result of a successful emit operation.
 *
 * @see {F20-AC1} — emit returns seq number
 */
export interface EmitResult {
	/** The monotonic sequence number assigned to this frame. */
	seq: bigint;
}
