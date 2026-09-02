/**
 * API key validation: format checking, SHA-256 hashing, timing-safe comparison.
 *
 * @module @genicui/server/auth/key-validator
 *
 * @see {F46} — API key auth
 * @see {F46-AC2} — SHA-256 hash compare
 * @see {F46-AC4} — Timing-safe compare (<100µs bound)
 */
import { ApiKeyInfo } from './types.js';
/**
 * Hash a raw API key using SHA-256.
 *
 * @param key - The raw API key string
 * @returns Hex-encoded SHA-256 hash
 *
 * @see {F46-AC2} — SHA-256 hash compare
 */
export declare function hashApiKey(key: string): string;
/**
 * Validate the format of an API key.
 *
 * @param key - The raw API key string
 * @returns `true` if the key matches the expected format
 *
 * @see {F46-AC1} — Format check: gnc_live_ prefix + 32 chars
 */
export declare function validateApiKeyFormat(key: string): boolean;
/**
 * Extract the API key from a Bearer token header value.
 *
 * @param header - The `Authorization` header value
 * @returns The raw key, or `null` if the header is missing or malformed
 */
export declare function parseBearerKey(header: string | undefined): string | null;
/**
 * Parse key information from a raw API key.
 *
 * @param key - The raw API key string
 * @returns Key info, or `null` if the format is invalid
 */
export declare function parseApiKeyInfo(key: string): ApiKeyInfo | null;
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
export declare function validateKey(key: string, storedHashes: Map<string, ApiKeyInfo>, rejectTestKeys: boolean): ApiKeyInfo;
//# sourceMappingURL=key-validator.d.ts.map