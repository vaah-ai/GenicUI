/**
 * Log scrubber to prevent API key leakage in log output.
 *
 * @module @genicui/server/auth/log-scrubber
 *
 * @see {F46-AC3} — Plain-text key never logged
 */
/**
 * Scrub all API keys from a string, replacing them with redacted placeholders.
 *
 * @param text - The string that may contain API keys
 * @returns The string with all API keys replaced by `gnc_<type>_***REDACTED***`
 *
 * @see {F46-AC3} — Plain-text key never logged
 */
export declare function scrubApiKey(text: string): string;
/**
 * Create a safe representation of an API key for logging.
 * Shows only the prefix and first 4 characters of the key portion.
 *
 * @param key - The raw API key
 * @returns A safe string like `gnc_live_abcd****`
 */
export declare function safeLogKey(key: string): string;
//# sourceMappingURL=log-scrubber.d.ts.map