/**
 * API key validation: format checking, SHA-256 hashing, timing-safe comparison.
 *
 * @module @genicui/server/auth/key-validator
 *
 * @see {F46} — API key auth
 * @see {F46-AC2} — SHA-256 hash compare
 * @see {F46-AC4} — Timing-safe compare (<100µs bound)
 */

import { createHash, timingSafeEqual } from 'node:crypto';

import { AUTH_REGEX, ApiKeyInfo, AuthError } from './types.js';

/**
 * Hash a raw API key using SHA-256.
 *
 * @param key - The raw API key string
 * @returns Hex-encoded SHA-256 hash
 *
 * @see {F46-AC2} — SHA-256 hash compare
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Validate the format of an API key.
 *
 * @param key - The raw API key string
 * @returns `true` if the key matches the expected format
 *
 * @see {F46-AC1} — Format check: gnc_live_ prefix + 32 chars
 */
export function validateApiKeyFormat(key: string): boolean {
  return AUTH_REGEX.test(key);
}

/**
 * Extract the API key from a Bearer token header value.
 *
 * @param header - The `Authorization` header value
 * @returns The raw key, or `null` if the header is missing or malformed
 */
export function parseBearerKey(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  const key = header.slice(7);
  if (key.length === 0) {
    return null;
  }
  return key;
}

/**
 * Parse key information from a raw API key.
 *
 * @param key - The raw API key string
 * @returns Key info, or `null` if the format is invalid
 */
export function parseApiKeyInfo(key: string): ApiKeyInfo | null {
  if (!validateApiKeyFormat(key)) {
    return null;
  }
  const match = AUTH_REGEX.exec(key);
  if (!match) {
    return null;
  }
  const keyType = match[1] as 'live' | 'test';
  // Extract the first 4 chars after the prefix (gnc_live_ or gnc_test_)
  const prefixLen = `gnc_${keyType}_`.length;
  const visible = key.slice(prefixLen, prefixLen + 4);
  const keyId = `gnc_${keyType}_${visible}****`;
  return { keyId, keyType };
}

/**
 * Validate an API key against a pre-computed hash store.
 *
 * Performs a **timing-safe comparison** against every stored hash to prevent
 * side-channel attacks. Even when the correct hash is found, all comparisons
 * complete to maintain constant time.
 *
 * @param key - The raw API key to validate
 * @param storedHashes - Map of SHA-256 hash → ApiKeyInfo
 * @param rejectTestKeys - Whether to reject `gnc_test_*` keys
 * @returns The `ApiKeyInfo` if valid, or throws `AuthError`
 *
 * @see {F46-AC2} — SHA-256 hash compare
 * @see {F46-AC4} — Timing-safe compare
 */
export function validateKey(
  key: string,
  storedHashes: Map<string, ApiKeyInfo>,
  rejectTestKeys: boolean,
): ApiKeyInfo {
  // Format check first (fast fail)
  if (!validateApiKeyFormat(key)) {
    throw new AuthError('Unauthorized', 401);
  }

  // Parse key type
  const info = parseApiKeyInfo(key);
  if (!info) {
    throw new AuthError('Unauthorized', 401);
  }

  // Reject test keys in production
  if (rejectTestKeys && info.keyType === 'test') {
    throw new AuthError('Forbidden', 403);
  }

  // Hash the incoming key
  const incomingHash = hashApiKey(key);

  // Timing-safe comparison against all stored hashes
  // We compare against every entry to maintain constant time
  let matched = false;
  let result: ApiKeyInfo | null = null;

  const incomingBuf = Buffer.from(incomingHash, 'hex');

  for (const [storedHash, storedInfo] of storedHashes) {
    const storedBuf = Buffer.from(storedHash, 'hex');
    const equal = timingSafeEqual(incomingBuf, storedBuf);
    if (equal) {
      matched = true;
      result = storedInfo;
    }
  }

  if (!matched || !result) {
    throw new AuthError('Unauthorized', 401);
  }

  return result;
}
