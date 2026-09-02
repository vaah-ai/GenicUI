/**
 * Frame serialization and parsing for the WebSocket transport.
 *
 * Handles parsing inbound frames (JSON → FrameEnvelope) with prototype-key
 * sanitization, and serializing outbound frames (FrameEnvelope → JSON) with
 * bigint support.
 *
 * @module @genicui/server/transport/frame-handler
 *
 * @see {F11} — Frame envelope + channel multiplexing
 * @see {F11-AC1} — Single-line JSON, monotonic seq
 * @see {F11-AC4} — Malformed frame → WS close 1003
 */
/**
 * WebSocket close code for protocol error (malformed frame).
 *
 * @see {F11-AC4} — Malformed frame → WS close 1003
 */
export const CLOSE_CODE_PROTOCOL_ERROR = 1003;
// ---------------------------------------------------------------------------
// Prototype key stripping
// ---------------------------------------------------------------------------
/** Keys that must be stripped from inbound payloads to prevent prototype poisoning. */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
/**
 * Recursively strip dangerous prototype keys from a value.
 *
 * Uses `Object.keys()` instead of `Object.entries()` to avoid issues with
 * `__proto__` key assignment in V8/JavaScript engines that auto-assign
 * the prototype instead of setting an own property.
 *
 * @param obj - The value to sanitize.
 * @returns A sanitized copy with `__proto__`, `constructor`, `prototype` removed.
 */
function stripDangerousKeys(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => stripDangerousKeys(item));
    }
    // Create a new object with null prototype to prevent any prototype leakage
    const result = Object.create(null);
    const keys = Object.keys(obj);
    for (const key of keys) {
        if (DANGEROUS_KEYS.has(key)) {
            continue;
        }
        result[key] = stripDangerousKeys(obj[key]);
    }
    return result;
}
// ---------------------------------------------------------------------------
// BigInt-aware JSON
// ---------------------------------------------------------------------------
/**
 * JSON reviver that converts strings that look like bigint back to bigint.
 * Used when parsing inbound frames — `seq` and `causes` are bigint at runtime
 * but arrive as strings in JSON (since JSON has no bigint literal).
 *
 * The server accepts `seq` as either a string (from JSON) or a number,
 * then coerces it to bigint.
 */
function bigintReviver(_key, value) {
    // Already handled by parseFrame — this exists for completeness.
    return value;
}
/**
 * JSON replacer that converts bigint to a string representation.
 * `JSON.stringify(bigint)` throws, so we need a custom replacer.
 */
function bigintReplacer(_key, value) {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    if (Array.isArray(value)) {
        return value.map((item) => (typeof item === 'bigint' ? item.toString() : item));
    }
    return value;
}
// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------
/**
 * Parse a raw inbound message into a validated FrameEnvelope.
 *
 * Accepts:
 * - A JSON string containing a valid frame envelope
 * - A pre-parsed object that passes TypeBox validation
 *
 * Returns `null` if the input is not a valid frame (caller should close
 * the WebSocket with code 1003).
 *
 * @see {F11-AC4} — Malformed frame → WS close 1003
 */
export function parseFrame(raw) {
    let parsed;
    // Step 1: Parse JSON if string
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) {
            return null;
        }
        try {
            parsed = JSON.parse(trimmed, bigintReviver);
        }
        catch {
            return null;
        }
    }
    else {
        parsed = raw;
    }
    // Step 2: Basic type guard — must be a non-null object
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
    }
    // Step 3: Strip dangerous prototype keys
    const sanitized = stripDangerousKeys(parsed);
    if (sanitized === null || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
        return null;
    }
    const obj = sanitized;
    // Step 4: Required fields check
    if (typeof obj.v !== 'number' || obj.v !== 1) {
        return null;
    }
    if (typeof obj.channel !== 'string' || obj.channel.length === 0) {
        return null;
    }
    if (typeof obj.type !== 'string' || obj.type.length === 0) {
        return null;
    }
    if (obj.seq === undefined || obj.seq === null) {
        return null;
    }
    if (obj.payload === undefined) {
        return null;
    }
    // Step 5: Coerce `seq` to bigint
    let seq;
    try {
        if (typeof obj.seq === 'bigint') {
            seq = obj.seq;
        }
        else if (typeof obj.seq === 'string') {
            seq = BigInt(obj.seq);
        }
        else if (typeof obj.seq === 'number') {
            seq = BigInt(Math.floor(obj.seq));
        }
        else {
            return null;
        }
    }
    catch {
        return null;
    }
    // Step 6: Coerce `causes` to bigint[] if present
    let causes = undefined;
    if (obj.causes !== undefined) {
        if (!Array.isArray(obj.causes)) {
            return null;
        }
        try {
            causes = obj.causes.map((c) => {
                if (typeof c === 'bigint')
                    return c;
                if (typeof c === 'string')
                    return BigInt(c);
                if (typeof c === 'number')
                    return BigInt(Math.floor(c));
                throw new Error('invalid causes element');
            });
        }
        catch {
            return null;
        }
    }
    // Step 7: Construct validated FrameEnvelope
    const frame = {
        v: 1,
        channel: obj.channel,
        type: obj.type,
        payload: obj.payload,
        seq,
        ...(causes !== undefined ? { causes } : {}),
    };
    return frame;
}
// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------
/**
 * Serialize a FrameEnvelope to a JSON string for transmission over WebSocket.
 *
 * Handles bigint conversion for `seq` and `causes` fields.
 *
 * @see {F11-AC1} — Single-line JSON with monotonic seq
 */
export function serializeFrame(frame) {
    // Replace bigint fields with string representation for JSON compatibility.
    const serializable = {
        v: frame.v,
        channel: frame.channel,
        type: frame.type,
        payload: frame.payload,
        seq: frame.seq.toString(),
    };
    if (frame.causes !== undefined) {
        serializable.causes = frame.causes.map((c) => c.toString());
    }
    return JSON.stringify(serializable, bigintReplacer);
}
// ---------------------------------------------------------------------------
//# sourceMappingURL=frame-handler.js.map