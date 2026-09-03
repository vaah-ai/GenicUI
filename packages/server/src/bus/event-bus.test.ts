/**
 * Tests for InternalEventBus — F20.
 *
 * @module @genicui/server/bus/event-bus.test
 * @see {F20-AC1} — emit returns seq number
 * @see {F20-AC2} — post-emit hook fires after WS write
 * @see {F20-AC3} — queue overflow -> WS close 1013
 * @see {F20-AC4} — failed deliver -> drop, not crash
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { SequenceGenerator } from "@genicui/core";

import { InternalEventBus } from "./event-bus.js";
import { MAX_OUTBOUND_QUEUE, CLOSE_CODE_QUEUE_OVERFLOW } from "./types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockSend(): { send: (data: string) => void; sent: string[] } {
	const sent: string[] = [];
	return { send: (data: string) => sent.push(data), sent };
}

function createMockClose(): {
	close: (code: number, reason: string) => void;
	calls: Array<{ code: number; reason: string }>;
} {
	const calls: Array<{ code: number; reason: string }> = [];
	return {
		close: (code, reason) => calls.push({ code, reason }),
		calls,
	};
}

function createFailingSend(): (data: string) => void {
	return () => { throw new Error("WebSocket write failed"); };
}

// ---------------------------------------------------------------------------
// F20-AC1: Emit returns seq number
// ---------------------------------------------------------------------------

describe("F20-AC1: Emit returns seq number", () => {
	let bus: InternalEventBus;
	let sent: string[];

	beforeEach(() => {
		const { send, sent: s } = createMockSend();
		sent = s;
		bus = new InternalEventBus(send, new SequenceGenerator(), () => {});
	});

	afterEach(() => { bus.dispose(); });

	it("assigns and returns the next monotonic seq", () => {
		const r1 = bus.emit("ch-1", "EVENT", { data: 1 });
		expect(r1.seq).toBeGreaterThanOrEqual(0n);

		const r2 = bus.emit("ch-1", "EVENT", { data: 2 });
		expect(r2.seq).toBeGreaterThan(r1.seq);
	});

	it("sends a serialized frame with correct structure", () => {
		bus.emit("ch-1", "EVENT", { value: "hello" });
		expect(sent.length).toBe(1);

		const parsed = JSON.parse(sent[0]!);
		expect(parsed.v).toBe(1);
		expect(parsed.channel).toBe("ch-1");
		expect(parsed.type).toBe("EVENT");
		expect(parsed.payload).toEqual({ value: "hello" });
		expect(typeof parsed.seq).toBe("string");
	});

	it("queueSize is 0 after successful send", () => {
		expect(bus.queueSize).toBe(0);
		bus.emit("ch-1", "EVENT", { data: "test" });
		expect(bus.queueSize).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// F20-AC2: Post-emit hook fires after WS write
// ---------------------------------------------------------------------------

describe("F20-AC2: Post-emit hook fires after WS write", () => {
	let bus: InternalEventBus;
	let hookCalls: Array<{ channel: string; seq: bigint }>;

	beforeEach(() => {
		const { send } = createMockSend();
		bus = new InternalEventBus(send, new SequenceGenerator(), () => {});
		hookCalls = [];
		bus.onPostEmit((channel, seq) => hookCalls.push({ channel, seq }));
	});

	afterEach(() => { bus.dispose(); });

	it("fires the hook after a successful emit", () => {
		bus.emit("ch-1", "EVENT", { value: 1 });
		expect(hookCalls.length).toBe(1);
		expect(hookCalls[0]!.channel).toBe("ch-1");
		expect(hookCalls[0]!.seq).toBeGreaterThanOrEqual(0n);
	});

	it("fires the hook for each emit", () => {
		bus.emit("ch-1", "EVENT", {});
		bus.emit("ch-1", "EVENT", {});
		bus.emit("ch-2", "UPDATE", {});
		expect(hookCalls.length).toBe(3);
	});

	it("supports multiple hooks", () => {
		const hookA: bigint[] = [];
		bus.onPostEmit((_ch, seq) => hookA.push(seq));

		bus.emit("ch-1", "EVENT", {});
		expect(hookCalls.length).toBe(1);
		expect(hookA.length).toBe(1);
		expect(hookCalls[0]!.seq).toBe(hookA[0]!);
	});

	it("does not fire hook on failed send", () => {
		const failingBus = new InternalEventBus(
			createFailingSend(),
			new SequenceGenerator(),
			() => {},
		);
		const calls: bigint[] = [];
		failingBus.onPostEmit((_ch, seq) => calls.push(seq));

		failingBus.emit("ch-1", "EVENT", {});
		expect(calls.length).toBe(0);
	});

	it("survives a hook throwing an error", () => {
		bus.onPostEmit(() => { throw new Error("boom"); });
		expect(() => bus.emit("ch-1", "EVENT", {})).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// F20-AC3: Queue overflow -> WS close 1013
// ---------------------------------------------------------------------------

describe("F20-AC3: Queue overflow -> WS close 1013", () => {
	it("constants are correct", () => {
		expect(MAX_OUTBOUND_QUEUE).toBe(500);
		expect(CLOSE_CODE_QUEUE_OVERFLOW).toBe(1013);
	});

	it("calls close with 1013 when queue depth >= MAX_OUTBOUND_QUEUE", () => {
		const { close, calls } = createMockClose();
		const seqGen = new SequenceGenerator();

		const bus = new InternalEventBus(
			() => { /* no-op send */ },
			seqGen,
			close,
		);

		// Simulate queue reaching MAX_OUTBOUND_QUEUE depth
		bus.setQueueDepthForTest(MAX_OUTBOUND_QUEUE);

		// Emit should trigger the overflow check
		bus.emit("ch-1", "EVENT", {});

		expect(calls.length).toBe(1);
		expect(calls[0]!.code).toBe(1013);
		expect(calls[0]!.reason).toBe("Outbound queue overflow");

		bus.dispose();
	});
});

// ---------------------------------------------------------------------------
// F20-AC4: Failed deliver -> drop, not crash
// ---------------------------------------------------------------------------

describe("F20-AC4: Failed deliver -> drop, not crash", () => {
	let bus: InternalEventBus;

	beforeEach(() => {
		bus = new InternalEventBus(
			createFailingSend(),
			new SequenceGenerator(),
			() => {},
		);
	});

	afterEach(() => { bus.dispose(); });

	it("does not crash when send throws", () => {
		expect(() => bus.emit("ch-1", "EVENT", { value: 1 })).not.toThrow();
	});

	it("returns a seq number even on failure", () => {
		const result = bus.emit("ch-1", "EVENT", { value: 1 });
		expect(result.seq).toBeGreaterThanOrEqual(0n);
	});

	it("keeps queue empty after failure (frame dropped)", () => {
		bus.emit("ch-1", "EVENT", { value: 1 });
		expect(bus.queueSize).toBe(0);
	});

	it("keeps the bus usable after a failure", () => {
		bus.emit("ch-1", "EVENT", { value: 1 });
		bus.emit("ch-1", "EVENT", { value: 2 });
		expect(bus.queueSize).toBe(0);
	});

	it("does not fire post-emit hooks on failure", () => {
		let fired = false;
		bus.onPostEmit(() => { fired = true; });
		bus.emit("ch-1", "EVENT", {});
		expect(fired).toBeFalse();
	});
});

// ---------------------------------------------------------------------------
// Disposal
// ---------------------------------------------------------------------------

describe("InternalEventBus disposal", () => {
	let bus: InternalEventBus;

	beforeEach(() => {
		const { send } = createMockSend();
		bus = new InternalEventBus(send, new SequenceGenerator(), () => {});
	});

	it("does not emit after disposal", () => {
		bus.dispose();
		const result = bus.emit("ch-1", "EVENT", {});
		expect(result.seq).toBe(0n);
	});

	it("clears hooks on disposal", () => {
		const calls: bigint[] = [];
		bus.onPostEmit((_ch, seq) => calls.push(seq));
		bus.dispose();
		bus.emit("ch-1", "EVENT", {});
		expect(calls.length).toBe(0);
	});

	it("returns zero queue size after disposal", () => {
		bus.dispose();
		expect(bus.queueSize).toBe(0);
	});
});
