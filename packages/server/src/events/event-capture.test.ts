/**
 * Tests for EventCapture and TokenBucket — F19.
 *
 * @module @genicui/server/events/event-capture.test
 * @see {F19-AC1} — composed:true required
 * @see {F19-AC2} — Event payload schema validation
 * @see {F19-AC3} — 200 events/sec rate cap
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Type } from "@sinclair/typebox";

import { EventCapture, eventCapture } from "./event-capture.js";
import { TokenBucket } from "./rate-limiter.js";

// ---------------------------------------------------------------------------
// TokenBucket Tests
// ---------------------------------------------------------------------------

describe("TokenBucket", () => {
  let bucket: TokenBucket;

  beforeEach(() => {
    bucket = new TokenBucket({ capacity: 10, intervalMs: 100 });
  });

  afterEach(() => {
    bucket.stop();
  });

  it("starts with full capacity", () => {
    for (let i = 0; i < 10; i++) {
      const result = bucket.allow();
      expect(result.allowed).toBeTrue();
    }
  });

  it("returns allowed:false when tokens are exhausted", () => {
    // Consume all 10 tokens
    for (let i = 0; i < 10; i++) {
      bucket.allow();
    }

    // Next should be rate-limited
    const result = bucket.allow();
    expect(result.allowed).toBeFalse();
    expect(result.dropCount).toBe(1);
  });

  it("increments drop_count for each dropped event", () => {
    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      bucket.allow();
    }

    // Drop 3 more
    bucket.allow();
    bucket.allow();
    bucket.allow();

    expect(bucket.dropCount).toBe(3);
  });

  it("refills tokens after interval", async () => {
    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      bucket.allow();
    }

    // Should be rate-limited
    expect(bucket.allow().allowed).toBeFalse();

    // Wait for refill (100ms interval + small buffer)
    await new Promise((r) => setTimeout(r, 120));

    // Should allow again
    expect(bucket.allow().allowed).toBeTrue();
  });

  it("reset restores capacity and clears drop count", () => {
    // Exhaust tokens
    for (let i = 0; i < 10; i++) {
      bucket.allow();
    }
    bucket.allow(); // drop count = 1

    bucket.reset();
    expect(bucket.dropCount).toBe(0);

    // Should allow 10 more
    for (let i = 0; i < 10; i++) {
      expect(bucket.allow().allowed).toBeTrue();
    }
  });

  it("stop halts the refill timer", async () => {
    // Exhaust tokens
    for (let i = 0; i < 10; i++) {
      bucket.allow();
    }

    bucket.stop();

    // Even after interval, should not refill
    await new Promise((r) => setTimeout(r, 150));
    expect(bucket.allow().allowed).toBeFalse();
  });
});

// ---------------------------------------------------------------------------
// EventCapture — F19-AC1: composed:true required
// ---------------------------------------------------------------------------

describe("EventCapture — F19-AC1: composed:true required", () => {
  let capture: EventCapture;

  beforeEach(() => {
    capture = new EventCapture();
  });

  afterEach(() => {
    capture.clear();
  });

  it("rejects events without composed:true", () => {
    const result = capture.capture(
      "dt-1",
      "row_selected",
      { rowId: "1" },
      false,
    );

    expect(result.captured).toBeFalse();
    expect(result.reason).toBe("not_composed");
    expect(result.event).toBeUndefined();
  });

  it("accepts events with composed:true", () => {
    const result = capture.capture(
      "dt-1",
      "row_selected",
      { rowId: "1" },
      true,
    );

    expect(result.captured).toBeTrue();
    expect(result.event).toBeDefined();
    expect(result.event?.componentId).toBe("dt-1");
    expect(result.event?.action).toBe("row_selected");
    expect(result.event?.detail).toEqual({ rowId: "1" });
  });

  it("captures event data correctly", () => {
    const detail = { rowId: "ORD-002", status: "shipped" };
    const result = capture.capture("dt-1", "row_click", detail, true);

    expect(result.captured).toBeTrue();
    expect(result.event?.detail).toEqual(detail);
  });
});

// ---------------------------------------------------------------------------
// EventCapture — F19-AC2: Schema validation
// ---------------------------------------------------------------------------

describe("EventCapture — F19-AC2: Event payload schema validation", () => {
  let capture: EventCapture;

  beforeEach(() => {
    capture = new EventCapture();

    // Register a schema: row_selected expects { rowId: string }
    // GenicUI enforces additionalProperties: false on all schemas
    capture.registerComponentEvents("dt-1", {
      row_selected: Type.Object(
        { rowId: Type.String({ minLength: 1 }) },
        { additionalProperties: false },
      ),
      sort_change: Type.Object(
        {
          column: Type.String(),
          direction: Type.Union([Type.Literal("asc"), Type.Literal("desc")]),
        },
        { additionalProperties: false },
      ),
    });
  });

  afterEach(() => {
    capture.clear();
  });

  it("accepts valid payloads matching the schema", () => {
    const result = capture.capture(
      "dt-1",
      "row_selected",
      { rowId: "1" },
      true,
    );

    expect(result.captured).toBeTrue();
    expect(result.event?.detail).toEqual({ rowId: "1" });
  });

  it("rejects payloads missing required fields", () => {
    const result = capture.capture("dt-1", "row_selected", {}, true);

    expect(result.captured).toBeFalse();
    expect(result.reason).toBe("schema_invalid");
  });

  it("rejects payloads with wrong types", () => {
    const result = capture.capture(
      "dt-1",
      "row_selected",
      { rowId: 123 },
      true,
    );

    expect(result.captured).toBeFalse();
    expect(result.reason).toBe("schema_invalid");
  });

  it("rejects payloads with extra fields (additionalProperties: false)", () => {
    const result = capture.capture(
      "dt-1",
      "row_selected",
      {
        rowId: "1",
        extra: "field",
      },
      true,
    );

    expect(result.captured).toBeFalse();
    expect(result.reason).toBe("schema_invalid");
  });

  it("validates different schemas per action", () => {
    // row_selected with valid data
    const result1 = capture.capture(
      "dt-1",
      "row_selected",
      { rowId: "1" },
      true,
    );
    expect(result1.captured).toBeTrue();

    // sort_change with valid data
    const result2 = capture.capture(
      "dt-1",
      "sort_change",
      {
        column: "name",
        direction: "asc",
      },
      true,
    );
    expect(result2.captured).toBeTrue();

    // sort_change with invalid direction
    const result3 = capture.capture(
      "dt-1",
      "sort_change",
      {
        column: "name",
        direction: "invalid",
      },
      true,
    );
    expect(result3.captured).toBeFalse();
    expect(result3.reason).toBe("schema_invalid");
  });

  it("allows events for unregistered actions (no schema)", () => {
    const result = capture.capture(
      "dt-1",
      "unknown_event",
      { data: "x" },
      true,
    );

    expect(result.captured).toBeTrue();
  });

  it("allows events for unregistered components (no schema)", () => {
    const result = capture.capture(
      "dt-unknown",
      "row_selected",
      { rowId: "1" },
      true,
    );

    expect(result.captured).toBeTrue();
  });
});

// ---------------------------------------------------------------------------
// EventCapture — F19-AC3: Rate limiting
// ---------------------------------------------------------------------------

describe("EventCapture — F19-AC3: Rate limiting", () => {
  let capture: EventCapture;

  beforeEach(() => {
    capture = new EventCapture();
  });

  afterEach(() => {
    capture.clear();
  });

  it("allows 200 events in a batch (default rate)", () => {
    // The default TokenBucket has 200 tokens and 1s refill
    // All 200 should be allowed immediately
    let allowed = 0;
    let dropped = 0;

    for (let i = 0; i < 200; i++) {
      const result = capture.capture(
        "dt-1",
        "row_selected",
        { rowId: String(i) },
        true,
      );
      if (result.captured) {
        allowed++;
      } else {
        dropped++;
      }
    }

    expect(allowed).toBe(200);
    expect(dropped).toBe(0);
  });

  it("drops events beyond 200/s rate limit", () => {
    let allowed = 0;
    let dropped = 0;

    for (let i = 0; i < 250; i++) {
      const result = capture.capture(
        "dt-1",
        "row_selected",
        { rowId: String(i) },
        true,
      );
      if (result.captured) {
        allowed++;
      } else {
        dropped++;
      }
    }

    expect(allowed).toBe(200);
    expect(dropped).toBe(50);

    // All drops should be rate_limited, not composed or schema
    // (since we're sending valid composed:true events)
  });

  it("rate limit is per-component", () => {
    // Component dt-1: send 200 events
    for (let i = 0; i < 200; i++) {
      capture.capture("dt-1", "row_selected", { rowId: String(i) }, true);
    }

    // Component dt-2 should still have full capacity
    const result = capture.capture(
      "dt-2",
      "row_selected",
      { rowId: "1" },
      true,
    );
    expect(result.captured).toBeTrue();
  });

  it("returns drop_count in result", () => {
    // Send 210 events
    let lastDropCount = 0;
    for (let i = 0; i < 210; i++) {
      const result = capture.capture(
        "dt-1",
        "row_selected",
        { rowId: String(i) },
        true,
      );
      lastDropCount = result.dropCount;
    }

    expect(lastDropCount).toBe(10);
  });

  it("refills after interval", async () => {
    // Exhaust all 200 tokens
    for (let i = 0; i < 200; i++) {
      capture.capture("dt-1", "row_selected", { rowId: String(i) }, true);
    }

    // Should be rate-limited
    const result = capture.capture(
      "dt-1",
      "row_selected",
      { rowId: "0" },
      true,
    );
    expect(result.captured).toBeFalse();

    // Wait for refill (default 1s interval + buffer)
    await new Promise((r) => setTimeout(r, 1200));

    // Should allow again
    const afterRefill = capture.capture(
      "dt-1",
      "row_selected",
      { rowId: "0" },
      true,
    );
    expect(afterRefill.captured).toBeTrue();
  });
});

// ---------------------------------------------------------------------------
// EventCapture — Integration
// ---------------------------------------------------------------------------

describe("EventCapture — Integration", () => {
  let capture: EventCapture;

  beforeEach(() => {
    capture = new EventCapture();
  });

  afterEach(() => {
    capture.clear();
  });

  it("validates all 3 checks in order: composed -> rate limit -> schema", () => {
    // Register schema
    capture.registerComponentEvents("dt-1", {
      click: Type.Object({ x: Type.Number(), y: Type.Number() }),
    });

    // 1. composed check — should reject before schema/rate limit
    const r1 = capture.capture("dt-1", "click", { x: 1, y: 2 }, false);
    expect(r1.captured).toBeFalse();
    expect(r1.reason).toBe("not_composed");

    // 2. Schema check — should reject invalid data
    const r2 = capture.capture("dt-1", "click", { x: "invalid" }, true);
    expect(r2.captured).toBeFalse();
    expect(r2.reason).toBe("schema_invalid");

    // 3. Valid event passes all checks
    const r3 = capture.capture("dt-1", "click", { x: 100, y: 200 }, true);
    expect(r3.captured).toBeTrue();
  });

  it("onComponentUnmount cleans up state", () => {
    capture.registerComponentEvents("dt-1", {
      click: Type.Object({ x: Type.Number() }),
    });

    capture.onComponentUnmount("dt-1");

    // Should allow event (no schema to validate against)
    const result = capture.capture("dt-1", "click", { invalid: true }, true);
    expect(result.captured).toBeTrue();
  });

  it("the global eventCapture singleton works", () => {
    eventCapture.registerComponentEvents("dt-global", {
      ping: Type.Object(
        { value: Type.String() },
        { additionalProperties: false },
      ),
    });

    const result = eventCapture.capture(
      "dt-global",
      "ping",
      { value: "ok" },
      true,
    );
    expect(result.captured).toBeTrue();

    eventCapture.onComponentUnmount("dt-global");
  });
});
