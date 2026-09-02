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
 * Authentication error with HTTP status code.
 *
 * Used to distinguish between 401 (unauthenticated) and 403 (test key in prod).
 */
export class AuthError extends Error {
    statusCode;
    constructor(message, 
    /** HTTP status code for the response */
    statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AuthError';
    }
}
//# sourceMappingURL=types.js.map