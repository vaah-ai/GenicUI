/**
 * Auth types for API key authentication.
 *
 * @module @genicui/server/auth
 *
 * @see {F46} — API key auth (gnc_live_<32> Bearer)
 */

/**
 * Regular expression for valid API key format.
 *
 * Matches `gnc_live_` or `gnc_test_` followed by exactly 32 hex characters.
 *
 * @see {F46-AC1} — Format check: gnc_live_ prefix + 32 chars
 */
export const AUTH_REGEX = /^gnc_(live|test)_[a-f0-9]{32}$/i;

/**
 * Parsed API key information extracted from a raw key string.
 */
export interface ApiKeyInfo {
  /** Unique identifier derived from the key (prefix + first 4 chars) */
  keyId: string;

  /** Key type: 'live' for production, 'test' for development */
  keyType: 'live' | 'test';
}

/**
 * Authentication error with HTTP status code.
 *
 * Used to distinguish between 401 (unauthenticated) and 403 (test key in prod).
 */
export class AuthError extends Error {
  constructor(
    message: string,
    /** HTTP status code for the response */
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Options for creating an auth middleware.
 */
export interface AuthOptions {
  /**
   * Raw API key (e.g., `gnc_live_abc123...`).
   * Only the SHA-256 hash is stored internally; the plaintext key is never retained.
   */
  apiKey: string;

  /**
   * Whether test keys (`gnc_test_*`) should be rejected.
   * Defaults to `process.env.GENICUI_ENV === 'production'`.
   */
  rejectTestKeys?: boolean;
}
