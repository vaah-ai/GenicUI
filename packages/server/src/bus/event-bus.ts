/**
 * Internal event bus — F20.
 *
 * Per-WebSocket-session event bus that queues outbound frames, tracks
 * queue depth for backpressure, and fires post-emit hooks after
 * successful WS writes.
 *
 * The outbound queue tracks in-flight frames. In the synchronous model
 * (current implementation), frames are dequeued immediately after
 * send(). In an async model (future WS buffers), frames stay in
 * the queue until the transport flushes them.
 *
 * @module @genicui/server/bus/event-bus
 *
 * @see {F20} — Internal event bus (post-emit hook + backpressure)
 * @see {F20-AC1} — emit returns seq number
 * @see {F20-AC2} — post-emit hook fires after WS write
 * @see {F20-AC3} — queue overflow -> WS close 1013
 * @see {F20-AC4} — failed deliver -> drop, not crash
 */

import type { SequenceGenerator } from '@genicui/core';
import { serializeFrame } from '../transport/frame-handler.js';
import type { PostEmitHook, EmitResult } from './types.js';
import { MAX_OUTBOUND_QUEUE, CLOSE_CODE_QUEUE_OVERFLOW } from './types.js';

/**
 * Internal event bus for a single WebSocket session.
 *
 * Responsibilities:
 * - Assigns monotonic seq numbers to outbound frames (F20-AC1)
 * - Serializes and sends frames via the WS transport
 * - Fires post-emit hooks after successful writes (F20-AC2)
 * - Tracks outbound queue depth; closes socket on overflow (F20-AC3)
 * - Catches write failures gracefully, logging and dropping (F20-AC4)
 *
 * @see {F20} — Internal event bus (post-emit hook + backpressure)
 */
export class InternalEventBus {
	/** Registered post-emit callbacks. */
	#hooks = new Set<PostEmitHook>();

	/** Outbound queue depth counter. */
	#queueDepth = 0;

	/** Whether the bus has been disposed. */
	#disposed = false;

	/**
	 * Create a new internal event bus.
	 *
	 * @param send — function to send a string frame to the WebSocket
	 * @param seqGenerator — monotonic sequence number generator
	 * @param close — function to close the WebSocket with a code/reason
	 */
	constructor(
		private readonly send: (data: string) => void,
		private readonly seqGenerator: SequenceGenerator,
		private readonly close: (code: number, reason: string) => void,
	) {}

	/**
	 * Current outbound queue depth.
	 *
	 * @see {F20-AC3} — queue depth > 500 triggers backpressure
	 */
	get queueSize(): number {
		return this.#queueDepth;
	}

	/**
	 * Register a post-emit hook.
	 *
	 * The hook is called after a frame has been successfully sent
	 * to the WebSocket transport, receiving the channel and seq number.
	 *
	 * @see {F20-AC2} — post-emit hook fires after WS write
	 * @param hook — callback invoked with (channel, seq) on success
	 */
	onPostEmit(hook: PostEmitHook): void {
		this.#hooks.add(hook);
	}

	/**
	 * Emit a frame on the given channel.
	 *
	 * Flow:
	 * 1. Check queue depth — close socket if >= MAX_OUTBOUND_QUEUE (F20-AC3)
	 * 2. Generate seq number (F20-AC1)
	 * 3. Serialize and send frame
	 * 4. On success, fire post-emit hooks (F20-AC2)
	 * 5. On failure, log and drop (F20-AC4)
	 *
	 * @param channel — the channel to emit on
	 * @param type — the frame type (e.g., "EVENT")
	 * @param payload — the frame payload
	 * @returns the seq number assigned to the frame
	 */
	emit(channel: string, type: string, payload: unknown): EmitResult {
		if (this.#disposed) {
			return { seq: 0n };
		}

		// F20-AC3: Check queue depth before enqueueing
		if (this.#queueDepth >= MAX_OUTBOUND_QUEUE) {
			console.error(
				`[F20] Outbound queue overflow (${this.#queueDepth} >= ${MAX_OUTBOUND_QUEUE}), closing socket`,
			);
			this.close(CLOSE_CODE_QUEUE_OVERFLOW, 'Outbound queue overflow');
			return { seq: 0n };
		}

		// F20-AC1: Generate monotonic seq number
		const seq = this.seqGenerator.next();

		// Build frame and serialize
		const frame = { v: 1, channel, type, payload, seq };
		const serialized = serializeFrame(frame as never);

		// Increment queue depth
		this.#queueDepth++;

		// F20-AC4: Catch write failures — drop and log, don't crash
		try {
			this.send(serialized);

			// Dequeue on successful send
			this.#queueDepth--;

			// F20-AC2: Fire post-emit hooks after successful write
			for (const hook of this.#hooks) {
				try {
					hook(channel, seq);
				} catch (err) {
					// Post-emit hook failures must not crash the bus
					console.error(`[F20] Post-emit hook error:`, err);
				}
			}
		} catch (err) {
			// F20-AC4: Drop frame on failure, log to stderr
			this.#queueDepth--;
			console.error(
				`[F20] Failed to send frame on channel "${channel}" (seq ${seq}):`,
				err,
			);
		}

		return { seq };
	}

	/**
	 * Acknowledge that a frame was flushed by the transport.
	 *
	 * In an async model, call this when the transport confirms
	 * the frame was written. In the synchronous model, this is
	 * called implicitly by emit().
	 *
	 * @internal Future use for async transport integration.
	 */
	acknowledge(): void {
		if (this.#queueDepth > 0) {
			this.#queueDepth--;
		}
	}

	/**
	 * Dispose the bus, preventing further emits.
	 * Called when the WebSocket connection is closed.
	 */
	dispose(): void {
		this.#disposed = true;
		this.#queueDepth = 0;
		this.#hooks.clear();
	}

	/**
	 * Set the queue depth for testing purposes.
	 * Allows the overflow path to be tested in unit tests.
	 *
	 * @internal Test-only; not used in production code.
	 */
	setQueueDepthForTest(depth: number): void {
		this.#queueDepth = depth;
	}
}
