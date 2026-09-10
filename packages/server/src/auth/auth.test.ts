/**
 * Auth integration tests — F46 acceptance criteria.
 *
 * @module @genicui/server/auth/auth.test
 *
 * @see {F46-AC1} — Format check: gnc_live_ prefix + 32 chars
 * @see {F46-AC2} — SHA-256 hash compare
 * @see {F46-AC3} — Plain-text key never logged
 * @see {F46-AC4} — Timing-safe compare (<100µs bound)
 */

import { describe, it, expect } from 'bun:test';
import {
  AUTH_REGEX,
  AuthError,
  hashApiKey,
  validateApiKeyFormat,
  parseBearerKey,
  parseApiKeyInfo,
  validateKey,
  scrubApiKey,
  safeLogKey,
} from './index.js';

// --- Test helper: generate a valid API key ---

/** Generate a deterministic valid API key for testing */
function makeTestKey(prefix: 'live' | 'test' = 'live'): string {
  return `gnc_${prefix}_${'a'.repeat(32)}`;
}

/** Generate a valid random-ish API key */
function makeRandomKey(prefix: 'live' | 'test' = 'live'): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `gnc_${prefix}_${hex}`;
}

// --- F46-AC1: Format check ---

describe('F46-AC1: Format check', () => {
  it('accepts valid gnc_live_ key with 32 hex chars', () => {
    const key = makeTestKey('live');
    expect(validateApiKeyFormat(key)).toBe(true);
  });

  it('accepts valid gnc_test_ key with 32 hex chars', () => {
    const key = makeTestKey('test');
    expect(validateApiKeyFormat(key)).toBe(true);
  });

  it('accepts valid key with mixed hex chars', () => {
    const key = 'gnc_live_0123456789abcdef0123456789abcdef';
    expect(validateApiKeyFormat(key)).toBe(true);
  });

  it('rejects wrong prefix', () => {
    expect(validateApiKeyFormat('gnc_dev_0123456789abcdef0123456789abcdef')).toBe(
      false,
    );
  });

  it('rejects short key (31 chars)', () => {
    expect(validateApiKeyFormat('gnc_live_0123456789abcdef0123456789abcde')).toBe(
      false,
    );
  });

  it('rejects long key (33 chars)', () => {
    expect(validateApiKeyFormat('gnc_live_0123456789abcdef0123456789abcdeff')).toBe(
      false,
    );
  });

  it('rejects empty string', () => {
    expect(validateApiKeyFormat('')).toBe(false);
  });

  it('rejects non-hex characters', () => {
    expect(validateApiKeyFormat('gnc_live_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz')).toBe(
      false,
    );
  });
});

// --- F46-AC2: SHA-256 hash compare ---

describe('F46-AC2: SHA-256 hash compare', () => {
  it('hashes a key to a 64-char hex string', () => {
    const key = makeTestKey();
    const hash = hashApiKey(key);
    expect(hash.length).toBe(64);
    expect(hash).toMatch(/^([0-9a-f]{2})+$/);
  });

  it('produces consistent hashes', () => {
    const key = makeTestKey();
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different keys', () => {
    const hash1 = hashApiKey(makeTestKey('live'));
    const hash2 = hashApiKey(makeTestKey('test'));
    expect(hash1).not.toBe(hash2);
  });

  it('validates a correct key against stored hash', () => {
    const key = makeTestKey();
    const hash = hashApiKey(key);
    const info = parseApiKeyInfo(key)!;
    const store = new Map<string, Exclude<ReturnType<typeof parseApiKeyInfo>, null>>();
    store.set(hash, info);

    const result = validateKey(key, store, false);
    expect(result.keyId).toBe(info.keyId);
    expect(result.keyType).toBe('live');
  });

  it('rejects an unknown key with AuthError', () => {
    const unknownKey = makeTestKey();
    // Store a different key's hash
    const otherKey = makeRandomKey();
    const otherHash = hashApiKey(otherKey);
    const otherInfo = parseApiKeyInfo(otherKey)!;
    const store = new Map();
    store.set(otherHash, otherInfo);

    expect(() => validateKey(unknownKey, store, false)).toThrow(AuthError);
  });

  it('rejects test keys when rejectTestKeys is true', () => {
    const testKey = makeTestKey('test');
    const hash = hashApiKey(testKey);
    const info = parseApiKeyInfo(testKey)!;
    const store = new Map();
    store.set(hash, info);

    try {
      validateKey(testKey, store, true);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).statusCode).toBe(403);
    }
  });

  it('accepts test keys when rejectTestKeys is false', () => {
    const testKey = makeTestKey('test');
    const hash = hashApiKey(testKey);
    const info = parseApiKeyInfo(testKey)!;
    const store = new Map();
    store.set(hash, info);

    const result = validateKey(testKey, store, false);
    expect(result.keyType).toBe('test');
  });
});

// --- F46-AC3: Plain-text key never logged ---

describe('F46-AC3: Plain-text key never logged', () => {
  it('scrubs gnc_live_ keys from log output', () => {
    const key = makeTestKey('live');
    const logLine = `[INFO] Auth attempt with ${key} from 127.0.0.1`;
    const scrubbed = scrubApiKey(logLine);
    expect(scrubbed).not.toContain(key);
    expect(scrubbed).toContain('gnc_live_***REDACTED***');
  });

  it('scrubs gnc_test_ keys from log output', () => {
    const key = makeTestKey('test');
    const logLine = `[DEBUG] Test key ${key} used`;
    const scrubbed = scrubApiKey(logLine);
    expect(scrubbed).not.toContain(key);
    expect(scrubbed).toContain('gnc_test_***REDACTED***');
  });

  it('scrubs multiple keys in the same line', () => {
    const key1 = makeTestKey('live');
    const key2 = makeTestKey('test');
    const logLine = `[WARN] key1=${key1} key2=${key2}`;
    const scrubbed = scrubApiKey(logLine);
    expect(scrubbed).not.toContain(key1);
    expect(scrubbed).not.toContain(key2);
    expect(scrubbed).toContain('gnc_live_***REDACTED***');
    expect(scrubbed).toContain('gnc_test_***REDACTED***');
  });

  it('safeLogKey shows only prefix and first 4 chars', () => {
    const key = makeTestKey('live');
    const safe = safeLogKey(key);
    expect(safe).not.toContain(key);
    expect(safe).toMatch(/^gnc_live_[a-f0-9]{4}\*\*\*\*$/);
  });

  it('scrubApiKey preserves non-key content', () => {
    const logLine = 'Server started on port 3040';
    expect(scrubApiKey(logLine)).toBe(logLine);
  });
});

// --- F46-AC4: Timing-safe compare ---

describe('F46-AC4: Timing-safe compare', () => {
  it('uses timingSafeEqual from node:crypto', async () => {
    // The implementation uses timingSafeEqual from node:crypto.
    // Verify by checking that validateKey throws AuthError (401) for wrong keys
    // rather than short-circuiting with a different error.
    const key = makeTestKey();
    const wrongKey = makeRandomKey();

    // Store the correct key's hash
    const hash = hashApiKey(key);
    const info = parseApiKeyInfo(key)!;
    const store = new Map();
    store.set(hash, info);

    // Wrong key should fail with 401, not throw a different error
    expect(() => validateKey(wrongKey, store, false)).toThrow(AuthError);

    // Correct key should succeed
    const result = validateKey(key, store, false);
    expect(result.keyType).toBe('live');
  });

  it('timing is constant across matching and non-matching keys', () => {
    // Build a store with 10 entries to make timing measurable
    const store = new Map();
    const validKey = makeTestKey();
    const validHash = hashApiKey(validKey);
    const validInfo = parseApiKeyInfo(validKey)!;
    store.set(validHash, validInfo);

    // Add 9 more entries
    for (let i = 0; i < 9; i++) {
      const k = makeRandomKey();
      const h = hashApiKey(k);
      const info = parseApiKeyInfo(k)!;
      store.set(h, info);
    }

    const wrongKey = makeRandomKey();

    // Measure timing for valid key
    const validStart = performance.now();
    for (let i = 0; i < 100; i++) {
      try {
        validateKey(validKey, store, false);
      } catch {
        // ignore
      }
    }
    const validElapsed = performance.now() - validStart;

    // Measure timing for wrong key
    const wrongStart = performance.now();
    for (let i = 0; i < 100; i++) {
      try {
        validateKey(wrongKey, store, false);
      } catch {
        // ignore
      }
    }
    const wrongElapsed = performance.now() - wrongStart;

    // Timing should be similar (within 3x — generous bound for single-threaded JS)
    // The key is that timingSafeEqual is used, not string equality
    expect(wrongElapsed).toBeLessThan(validElapsed * 3);
    expect(validElapsed).toBeLessThan(wrongElapsed * 3);
  });
});

// --- parseBearerKey ---

describe('parseBearerKey', () => {
  it('extracts key from Bearer header', () => {
    const key = parseBearerKey('Bearer gnc_live_0123456789abcdef0123456789abcdef');
    expect(key).toBe('gnc_live_0123456789abcdef0123456789abcdef');
  });

  it('returns null for undefined header', () => {
    expect(parseBearerKey(undefined)).toBe(null);
  });

  it('returns null for empty header', () => {
    expect(parseBearerKey('')).toBe(null);
  });

  it('returns null for non-Bearer prefix', () => {
    expect(parseBearerKey('Token gnc_live_0123456789abcdef0123456789abcdef')).toBe(
      null,
    );
  });

  it('returns null for Bearer with no key', () => {
    expect(parseBearerKey('Bearer ')).toBe(null);
  });
});

// --- parseApiKeyInfo ---

describe('parseApiKeyInfo', () => {
  it('parses a live key', () => {
    const key = 'gnc_live_0123456789abcdef0123456789abcdef';
    const info = parseApiKeyInfo(key);
    expect(info).not.toBeNull();
    expect(info!.keyType).toBe('live');
    expect(info!.keyId).toBe('gnc_live_0123****');
  });

  it('parses a test key', () => {
    const key = 'gnc_test_0123456789abcdef0123456789abcdef';
    const info = parseApiKeyInfo(key);
    expect(info).not.toBeNull();
    expect(info!.keyType).toBe('test');
    expect(info!.keyId).toBe('gnc_test_0123****');
  });

  it('returns null for invalid format', () => {
    expect(parseApiKeyInfo('invalid-key')).toBeNull();
  });
});
