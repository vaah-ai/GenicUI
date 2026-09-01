/**
 * M1-T3 — Protocol envelope + sequence generator tests.
 *
 * @module @genicui/core/protocol/protocol.test
 * @see {F3} — Protocol envelope + sequence generator
 */
import { describe, it, expect } from 'bun:test';
import fc from 'fast-check';
import { SequenceGenerator } from './sequence.js';
import { envelope, validateChannel } from './envelope.js';
import { FrameBuffer } from './buffer.js';
import { ERROR_CODE_RESERVED_CHANNEL, GenicUIError, } from './types.js';
// ─── F3-AC1: Monotonic uint64 over 1000 calls ───────────────────────────────
describe('F3-AC1: SequenceGenerator', () => {
    it('1000 seq.next() calls produce monotonic uint64 with no duplicates', () => {
        const seq = new SequenceGenerator();
        const values = [];
        for (let i = 0; i < 1000; i++) {
            const v = seq.next();
            values.push(v);
        }
        // Monotonic: each value > previous
        for (let i = 1; i < values.length; i++) {
            const curr = values[i];
            const prev = values[i - 1];
            expect(curr).toBeGreaterThan(prev);
        }
        // No duplicates
        const unique = new Set(values);
        expect(unique.size).toBe(values.length);
        // All values are valid uint64 (>= 0, < 2^64)
        for (const v of values) {
            expect(v).toBeGreaterThanOrEqual(0n);
            expect(v).toBeLessThan(2n ** 64n);
        }
    });
    it('starts at 0', () => {
        const seq = new SequenceGenerator();
        expect(seq.next()).toBe(0n);
        expect(seq.next()).toBe(1n);
    });
    it('current returns the counter without incrementing', () => {
        const seq = new SequenceGenerator();
        seq.next();
        seq.next();
        expect(seq.current).toBe(2n);
        expect(seq.current).toBe(2n); // no increment
    });
    it('reset() restores counter to the given value', () => {
        const seq = new SequenceGenerator();
        seq.next();
        seq.next();
        seq.reset(5n);
        expect(seq.current).toBe(5n);
        expect(seq.next()).toBe(5n);
    });
    it('reset() rejects negative values', () => {
        const seq = new SequenceGenerator();
        expect(() => seq.reset(-1n)).toThrow(RangeError);
    });
    it('next() throws on uint64 overflow', () => {
        const seq = new SequenceGenerator();
        seq.reset(2n ** 64n - 1n); // max uint64
        seq.next(); // returns 2^64-1
        expect(() => seq.next()).toThrow(RangeError);
    });
    // ── Property-based test: 10K calls ─────────────────────────────────────
    it('property: 10K seq.next() calls produce monotonic uint64 (fast-check)', () => {
        fc.assert(fc.property(fc.integer({ min: 1, max: 100_000 }), (n) => {
            const seq = new SequenceGenerator();
            const prev = -1n;
            for (let i = 0; i < n; i++) {
                const v = seq.next();
                expect(v).toBeGreaterThan(prev);
                expect(v).toBeLessThan(2n ** 64n);
            }
            return true;
        }), { numRuns: 100 });
    });
    it('property: 10K values have no duplicates (fast-check)', () => {
        fc.assert(fc.property(fc.integer({ min: 1, max: 10_000 }), (n) => {
            const seq = new SequenceGenerator();
            const seen = new Set();
            for (let i = 0; i < n; i++) {
                const v = seq.next();
                expect(seen.has(v)).toBe(false);
                seen.add(v);
            }
            return true;
        }), { numRuns: 100 });
    });
});
// ─── F3-AC2: Out-of-order buffering ─────────────────────────────────────────
describe('F3-AC2: FrameBuffer', () => {
    function makeFrame(channel, seq) {
        return envelope({
            channel,
            type: 'STATE_DELTA',
            payload: { seq },
            seq,
        });
    }
    it('flushes in-order frames immediately', () => {
        const buf = new FrameBuffer();
        const ch = 'dt-test';
        const f1 = makeFrame(ch, 0n);
        const f2 = makeFrame(ch, 1n);
        const f3 = makeFrame(ch, 2n);
        expect(buf.add(f1)).toEqual([f1]);
        expect(buf.add(f2)).toEqual([f2]);
        expect(buf.add(f3)).toEqual([f3]);
    });
    it('buffers out-of-order frames until contiguous', () => {
        const buf = new FrameBuffer();
        const ch = 'dt-test';
        const f3 = makeFrame(ch, 3n);
        const f1 = makeFrame(ch, 1n);
        const f2 = makeFrame(ch, 2n);
        const f4 = makeFrame(ch, 4n);
        // seq=3 arrives — buffered (expecting 0)
        expect(buf.add(f3)).toEqual([]);
        expect(buf.pendingCount(ch)).toBe(1);
        // seq=1 arrives — buffered (expecting 0)
        expect(buf.add(f1)).toEqual([]);
        expect(buf.pendingCount(ch)).toBe(2);
        // seq=0 arrives — flush 0, then 1. seq=2 missing, so 3 stays buffered.
        const f0 = makeFrame(ch, 0n);
        expect(buf.add(f0)).toEqual([f0, f1]);
        expect(buf.pendingCount(ch)).toBe(1); // only 3 buffered (2 missing)
        // seq=2 arrives — flush 2, then 3 (already buffered)
        expect(buf.add(f2)).toEqual([f2, f3]);
        expect(buf.pendingCount(ch)).toBe(0);
        // seq=4 arrives — flush 4
        expect(buf.add(f4)).toEqual([f4]);
        expect(buf.pendingCount(ch)).toBe(0);
    });
    it('tracks nextExpectedSeq correctly', () => {
        const buf = new FrameBuffer();
        const ch = 'ch-1';
        expect(buf.nextExpectedSeq(ch)).toBe(0n);
        buf.add(makeFrame(ch, 0n));
        expect(buf.nextExpectedSeq(ch)).toBe(1n);
        buf.add(makeFrame(ch, 1n));
        expect(buf.nextExpectedSeq(ch)).toBe(2n);
    });
    it('handles multiple channels independently', () => {
        const buf = new FrameBuffer();
        const fA = makeFrame('ch-a', 0n);
        const fB = makeFrame('ch-b', 0n);
        expect(buf.add(fA)).toEqual([fA]);
        expect(buf.add(fB)).toEqual([fB]);
        expect(buf.pendingCount('ch-a')).toBe(0);
        expect(buf.pendingCount('ch-b')).toBe(0);
    });
    it('clear() removes all buffered frames for a channel', () => {
        const buf = new FrameBuffer();
        const ch = 'dt-x';
        buf.add(makeFrame(ch, 5n));
        expect(buf.pendingCount(ch)).toBe(1);
        buf.clear(ch);
        expect(buf.pendingCount(ch)).toBe(0);
    });
    it('reset() clears all channels', () => {
        const buf = new FrameBuffer();
        buf.add(makeFrame('ch-a', 0n));
        buf.add(makeFrame('ch-b', 0n));
        buf.reset();
        expect(buf.pendingCount('ch-a')).toBe(0);
        expect(buf.pendingCount('ch-b')).toBe(0);
    });
});
// ─── F3-AC3: Reserved channel rejection ─────────────────────────────────────
describe('F3-AC3: Reserved channel rejection', () => {
    it('rejects __session__ with -32008', () => {
        expect(() => validateChannel('__session__')).toThrow(GenicUIError);
        expect(() => validateChannel('__session__')).toThrow(/reserved/i);
    });
    it('rejects __mcp__ with -32008', () => {
        expect(() => validateChannel('__mcp__')).toThrow(GenicUIError);
    });
    it('rejects __agent__ with -32008', () => {
        expect(() => validateChannel('__agent__')).toThrow(GenicUIError);
    });
    it('error has correct code -32008', () => {
        try {
            validateChannel('__session__');
            expect.unreachable();
        }
        catch (err) {
            const genicErr = err;
            expect(genicErr.code).toBe(ERROR_CODE_RESERVED_CHANNEL);
            expect(genicErr.name).toBe('GenicUIError');
        }
    });
    it('allows non-reserved channels', () => {
        expect(() => validateChannel('dt-7f3a9b2c')).not.toThrow();
        expect(() => validateChannel('my-component-123')).not.toThrow();
    });
    it('envelope() rejects reserved channels', () => {
        expect(() => envelope({
            channel: '__session__',
            type: 'STATE_DELTA',
            payload: null,
            seq: 0n,
        })).toThrow(GenicUIError);
    });
    it('envelope() accepts valid channels', () => {
        const frame = envelope({
            channel: 'dt-abc123',
            type: 'STATE_DELTA',
            payload: [{ op: 'replace', path: '/rows/0', value: 'x' }],
            seq: 42n,
        });
        expect(frame.v).toBe(1);
        expect(frame.channel).toBe('dt-abc123');
        expect(frame.type).toBe('STATE_DELTA');
        expect(frame.seq).toBe(42n);
    });
});
//# sourceMappingURL=protocol.test.js.map