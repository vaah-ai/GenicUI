/**
 * Frame handler and channel multiplexer tests — F11 acceptance criteria.
 *
 * Tests frame parsing/serialization, channel limit enforcement,
 * sequence-ordered dispatch, and malformed frame rejection.
 *
 * @module @genicui/server/transport/frame.test
 * @see {F11-AC1} — Single-line JSON, monotonic seq
 * @see {F11-AC2} — 257th channel -> error -32001
 * @see {F11-AC3} — Sequence ordered dispatch
 * @see {F11-AC4} — Malformed frame -> WS close 1003
 */

import type { FrameEnvelope } from '@genicui/core';
import { describe, it, expect } from 'bun:test';
import { parseFrame, serializeFrame } from './frame-handler.js';
import { ChannelMultiplexer, ERROR_CODE_CHANNEL_LIMIT } from './channel-multiplexer.js';

/**
 * Helper to create a FrameEnvelope test fixture with correct `v` literal type.
 */
function mkFrame(overrides: Partial<FrameEnvelope> = {}): FrameEnvelope {
	return {
		v: 1,
		channel: 'comp-1',
		type: 'STATE_DELTA',
		payload: {},
		seq: 0n,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// F11-AC1: Single-line JSON, monotonic seq
// ---------------------------------------------------------------------------

describe('F11-AC1: Single-line JSON, monotonic seq', () => {
	it('serializes a valid frame to single-line JSON', () => {
		const frame = mkFrame({
			type: 'STATE_SNAPSHOT',
			payload: { foo: 'bar' },
			seq: 1n,
		});

		const serialized = serializeFrame(frame);
		expect(typeof serialized).toBe('string');

		// Single line — no newlines
		expect(serialized.includes('\n')).toBe(false);

		// Parses back
		const parsed = JSON.parse(serialized);
		expect(parsed.v).toBe(1);
		expect(parsed.channel).toBe('comp-1');
		expect(parsed.seq).toBe('1'); // bigint -> string in JSON
	});

	it('serializes bigint seq as string', () => {
		const frame = mkFrame({
			channel: '__session__',
			type: 'RUN_STARTED',
			payload: null,
			seq: 9007199254740991n,
		});

		const serialized = serializeFrame(frame);
		expect(() => JSON.parse(serialized)).not.toThrow();

		const parsed = JSON.parse(serialized);
		expect(parsed.seq).toBe('9007199254740991');
	});

	it('serializes causes as array of strings', () => {
		const frame = mkFrame({
			type: 'TOOL_CALL_STARTED',
			seq: 5n,
			causes: [1n, 3n, 4n],
		});

		const serialized = serializeFrame(frame);
		const parsed = JSON.parse(serialized);
		expect(parsed.causes).toEqual(['1', '3', '4']);
	});

	it('parses frame with string seq (from JSON)', () => {
		const json = JSON.stringify({
			v: 1,
			channel: 'comp-1',
			type: 'STATE_DELTA',
			payload: { x: 1 },
			seq: '42',
		});

		const parsed = parseFrame(json);
		expect(parsed).not.toBeNull();
		expect(parsed!.seq).toBe(42n);
	});

	it('parses frame with numeric seq', () => {
		const json = JSON.stringify({
			v: 1,
			channel: 'comp-1',
			type: 'STATE_DELTA',
			payload: { x: 1 },
			seq: 42,
		});

		const parsed = parseFrame(json);
		expect(parsed).not.toBeNull();
		expect(parsed!.seq).toBe(42n);
	});

	it('serializes and parses roundtrip', () => {
		const original = mkFrame({
			type: 'RUN_STARTED',
			payload: { data: [1, 2, 3] },
			seq: 100n,
		});

		const serialized = serializeFrame(original);
		const parsed = parseFrame(serialized);

		expect(parsed).not.toBeNull();
		expect(parsed!.v).toBe(1);
		expect(parsed!.channel).toBe('comp-1');
		expect(parsed!.seq).toBe(100n);
		expect(parsed!.type).toBe('RUN_STARTED');
	});
});

// ---------------------------------------------------------------------------
// F11-AC2: 257th channel -> error -32001
// ---------------------------------------------------------------------------

describe('F11-AC2: 257th channel -> error -32001', () => {
	it('rejects registration beyond 256 channels', () => {
		const mux = new ChannelMultiplexer();

		// Register 256 channels
		for (let i = 0; i < 256; i++) {
			const result = mux.registerChannel(`ch-${i}`);
			expect(result).toBeNull();
		}

		expect(mux.channelCount).toBe(256);

		// 257th registration should fail
		const error = mux.registerChannel('ch-256');
		expect(error).not.toBeNull();
		expect(error!.code).toBe(ERROR_CODE_CHANNEL_LIMIT);
	});

	it('auto-registration in dispatch fails on 257th channel', () => {
		const mux = new ChannelMultiplexer();

		// Register 256 channels
		for (let i = 0; i < 256; i++) {
			mux.registerChannel(`ch-${i}`);
		}

		// Dispatch to a new channel should fail
		const frame = mkFrame({
			channel: 'ch-new',
			seq: 1n,
		});

		const result = mux.dispatch(frame);
		expect(result).toBeNull();
	});

	it('reusing an existing channel does not count toward limit', () => {
		const mux = new ChannelMultiplexer();

		// Register 256 channels
		for (let i = 0; i < 256; i++) {
			mux.registerChannel(`ch-${i}`);
		}

		// Re-register existing channel — should succeed (no-op)
		const result = mux.registerChannel('ch-0');
		expect(result).toBeNull();
	});

	it('ERROR_CODE_CHANNEL_LIMIT is -32001', () => {
		expect(ERROR_CODE_CHANNEL_LIMIT).toBe(-32001);
	});
});

// ---------------------------------------------------------------------------
// F11-AC3: Sequence ordered dispatch
// ---------------------------------------------------------------------------

describe('F11-AC3: Sequence ordered dispatch', () => {
	it('dispatches frames in order', () => {
		const mux = new ChannelMultiplexer();

		// Sequence numbers start at 0 to match SequenceGenerator
		for (let i = 0; i < 5; i++) {
			const frame = mkFrame({
				payload: { seq: i },
				seq: BigInt(i),
			});

			const result = mux.dispatch(frame);
			expect(result).not.toBeNull();
			expect(result!.channel).toBe('comp-1');
			// Frames should flush immediately in order
			expect(result!.frames.length).toBe(1);
			expect(result!.frames[0]!.seq).toBe(BigInt(i));
		}
	});

	it('buffers out-of-order frames and flushes when contiguous', () => {
		const mux = new ChannelMultiplexer();

		// Send seq 0 (first frame, flushes immediately)
		const frame0 = mkFrame({ seq: 0n });
		let result = mux.dispatch(frame0);
		expect(result!.frames.length).toBe(1);

		// Send seq 2 (out of order, seq 1 missing)
		const frame2 = mkFrame({ seq: 2n });
		result = mux.dispatch(frame2);
		// Should not flush seq 2 yet (gap at seq 1)
		expect(result!.frames.length).toBe(0);

		// Send seq 1 (fills the gap)
		const frame1 = mkFrame({ seq: 1n });
		result = mux.dispatch(frame1);
		// Should flush seq 1 and seq 2 (now contiguous)
		expect(result!.frames.length).toBe(2);
		expect(result!.frames[0]!.seq).toBe(1n);
		expect(result!.frames[1]!.seq).toBe(2n);
	});

	it('isolates sequence numbers per channel', () => {
		const mux = new ChannelMultiplexer();

		// Channel A: seq 0, 1
		mux.dispatch(mkFrame({ channel: 'comp-a', seq: 1n }));
		mux.dispatch(mkFrame({ channel: 'comp-a', seq: 0n }));

		// Channel B: seq 0
		const result = mux.dispatch(mkFrame({ channel: 'comp-b', seq: 0n }));
		expect(result!.frames.length).toBe(1);
		expect(result!.channel).toBe('comp-b');
	});
});

// ---------------------------------------------------------------------------
// F11-AC4: Malformed frame -> WS close 1003
// ---------------------------------------------------------------------------

describe('F11-AC4: Malformed frame -> WS close 1003', () => {
	it('rejects empty string', () => {
		expect(parseFrame('')).toBeNull();
	});

	it('rejects whitespace-only string', () => {
		expect(parseFrame('   ')).toBeNull();
	});

	it('rejects invalid JSON', () => {
		expect(parseFrame('{not valid json}')).toBeNull();
	});

	it('rejects non-object JSON', () => {
		expect(parseFrame('"just a string"')).toBeNull();
		expect(parseFrame('42')).toBeNull();
		expect(parseFrame('true')).toBeNull();
		expect(parseFrame('null')).toBeNull();
		expect(parseFrame('[1, 2, 3]')).toBeNull();
	});

	it('rejects frame without v field', () => {
		const json = JSON.stringify({
			channel: 'comp-1',
			type: 'STATE_DELTA',
			payload: {},
			seq: 1,
		});
		expect(parseFrame(json)).toBeNull();
	});

	it('rejects frame with v != 1', () => {
		const json = JSON.stringify({
			v: 2,
			channel: 'comp-1',
			type: 'STATE_DELTA',
			payload: {},
			seq: 1,
		});
		expect(parseFrame(json)).toBeNull();
	});

	it('rejects frame without channel', () => {
		const json = JSON.stringify({
			v: 1,
			type: 'STATE_DELTA',
			payload: {},
			seq: 1,
		});
		expect(parseFrame(json)).toBeNull();
	});

	it('rejects frame with empty channel', () => {
		const json = JSON.stringify({
			v: 1,
			channel: '',
			type: 'STATE_DELTA',
			payload: {},
			seq: 1,
		});
		expect(parseFrame(json)).toBeNull();
	});

	it('rejects frame without type', () => {
		const json = JSON.stringify({
			v: 1,
			channel: 'comp-1',
			payload: {},
			seq: 1,
		});
		expect(parseFrame(json)).toBeNull();
	});

	it('rejects frame with empty type', () => {
		const json = JSON.stringify({
			v: 1,
			channel: 'comp-1',
			type: '',
			payload: {},
			seq: 1,
		});
		expect(parseFrame(json)).toBeNull();
	});

	it('rejects frame without seq', () => {
		const json = JSON.stringify({
			v: 1,
			channel: 'comp-1',
			type: 'STATE_DELTA',
			payload: {},
		});
		expect(parseFrame(json)).toBeNull();
	});

	it('rejects frame with invalid seq type', () => {
		const json = JSON.stringify({
			v: 1,
			channel: 'comp-1',
			type: 'STATE_DELTA',
			payload: {},
			seq: true,
		});
		expect(parseFrame(json)).toBeNull();
	});

	it('strips __proto__ from inbound payload', () => {
		const json = JSON.stringify({
			v: 1,
			channel: 'comp-1',
			type: 'STATE_DELTA',
			payload: {
				__proto__: { polluted: true },
				normal: 'value',
			},
			seq: 1,
		});
		const parsed = parseFrame(json);
		expect(parsed).not.toBeNull();
		const payload = parsed!.payload as Record<string, unknown>;
		// __proto__ key should not be an own property
		expect(Object.hasOwn(payload, '__proto__')).toBe(false);
		// Normal keys should survive
		expect(payload.normal).toBe('value');
	});

	it('strips constructor from inbound payload', () => {
		const json = JSON.stringify({
			v: 1,
			channel: 'comp-1',
			type: 'STATE_DELTA',
			payload: {
				constructor: { hacked: true },
				normal: 'value',
			},
			seq: 1,
		});
		const parsed = parseFrame(json);
		expect(parsed).not.toBeNull();
		const payload = parsed!.payload as Record<string, unknown>;
		expect(Object.hasOwn(payload, 'constructor')).toBe(false);
		expect(payload.normal).toBe('value');
	});

	it('strips prototype from inbound payload', () => {
		const json = JSON.stringify({
			v: 1,
			channel: 'comp-1',
			type: 'STATE_DELTA',
			payload: {
				prototype: { poisoned: true },
				normal: 'value',
			},
			seq: 1,
		});
		const parsed = parseFrame(json);
		expect(parsed).not.toBeNull();
		const payload = parsed!.payload as Record<string, unknown>;
		expect(Object.hasOwn(payload, 'prototype')).toBe(false);
		expect(payload.normal).toBe('value');
	});

	it('strips dangerous keys recursively', () => {
		const json = JSON.stringify({
			v: 1,
			channel: 'comp-1',
			type: 'STATE_DELTA',
			payload: {
				nested: {
					__proto__: { bad: true },
					deep: {
						prototype: { also: 'bad' },
						good: 'value',
					},
				},
			},
			seq: 1,
		});
		const parsed = parseFrame(json);
		expect(parsed).not.toBeNull();
		const payload = parsed!.payload as Record<string, unknown>;
		const nested = payload.nested as Record<string, unknown>;
		expect(Object.hasOwn(nested, '__proto__')).toBe(false);
		const deep = (nested.deep as Record<string, unknown>);
		expect(Object.hasOwn(deep, 'prototype')).toBe(false);
		expect(deep.good).toBe('value');
	});

	it('strips dangerous keys in arrays', () => {
		const json = JSON.stringify({
			v: 1,
			channel: 'comp-1',
			type: 'STATE_DELTA',
			payload: {
				items: [
					{ __proto__: { bad: true }, ok: 'a' },
					{ constructor: { bad: true }, ok: 'b' },
				],
			},
			seq: 1,
		});
		const parsed = parseFrame(json);
		expect(parsed).not.toBeNull();
		const payload = parsed!.payload as Record<string, unknown>;
		const items = payload.items as Record<string, unknown>[];
		expect(Object.hasOwn(items[0]!, '__proto__')).toBe(false);
		expect((items[0]! as Record<string, unknown>).ok).toBe('a');
		expect(Object.hasOwn(items[1]!, 'constructor')).toBe(false);
		expect((items[1]! as Record<string, unknown>).ok).toBe('b');
	});
});

// ---------------------------------------------------------------------------
// Channel multiplexer edge cases
// ---------------------------------------------------------------------------

describe('F11 — Channel multiplexer edge cases', () => {
	it('registers reserved channels without error', () => {
		const mux = new ChannelMultiplexer();

		// Reserved channels are valid for system use
		expect(mux.registerChannel('__session__')).toBeNull();
		expect(mux.registerChannel('__mcp__')).toBeNull();
		expect(mux.registerChannel('__agent__')).toBeNull();
		expect(mux.channelCount).toBe(3);
	});

	it('destroy clears all channels', () => {
		const mux = new ChannelMultiplexer();

		mux.registerChannel('comp-1');
		mux.registerChannel('comp-2');
		expect(mux.channelCount).toBe(2);

		mux.destroy();
		expect(mux.channelCount).toBe(0);
	});

	it('getChannels returns all registered channels', () => {
		const mux = new ChannelMultiplexer();

		mux.registerChannel('comp-1');
		mux.registerChannel('comp-2');
		mux.registerChannel('comp-3');

		const channels = mux.getChannels();
		expect(channels.length).toBe(3);
		expect(channels).toContain('comp-1');
		expect(channels).toContain('comp-2');
		expect(channels).toContain('comp-3');
	});

	it('hasChannel returns correct state', () => {
		const mux = new ChannelMultiplexer();

		expect(mux.hasChannel('comp-1')).toBe(false);
		mux.registerChannel('comp-1');
		expect(mux.hasChannel('comp-1')).toBe(true);
	});

	it('dispatch auto-registers channels', () => {
		const mux = new ChannelMultiplexer();

		const frame = mkFrame({
			channel: 'auto-registered',
			seq: 0n,
		});

		const result = mux.dispatch(frame);
		expect(result).not.toBeNull();
		expect(mux.hasChannel('auto-registered')).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Serialization edge cases
// ---------------------------------------------------------------------------

describe('F11 — Serialization edge cases', () => {
	it('handles payload with nested objects', () => {
		const frame = mkFrame({
			type: 'STATE_SNAPSHOT',
			payload: {
				nested: {
					deep: {
						value: [1, 2, { inner: 'text' }],
					},
				},
			},
			seq: 1n,
		});

		const serialized = serializeFrame(frame);
		const parsed = parseFrame(serialized);
		expect(parsed).not.toBeNull();
		expect(parsed!.payload).toEqual(frame.payload);
	});

	it('handles null payload', () => {
		const frame = mkFrame({
			type: 'RUN_FINISHED',
			payload: null,
			seq: 1n,
		});

		const serialized = serializeFrame(frame);
		const parsed = parseFrame(serialized);
		expect(parsed).not.toBeNull();
		expect(parsed!.payload).toBeNull();
	});

	it('handles causes as optional', () => {
		const frame = mkFrame({
			type: 'TOOL_CALL_STARTED',
			seq: 1n,
		});

		const serialized = serializeFrame(frame);
		expect(serialized.includes('causes')).toBe(false);

		const parsed = parseFrame(serialized);
		expect(parsed).not.toBeNull();
		expect(parsed!.causes).toBeUndefined();
	});

	it('parses pre-parsed object (not string)', () => {
		const obj = {
			v: 1,
			channel: 'comp-1',
			type: 'STATE_DELTA',
			payload: { x: 1 },
			seq: 1,
		};

		const parsed = parseFrame(obj);
		expect(parsed).not.toBeNull();
		expect(parsed!.seq).toBe(1n);
	});
});
