/**
 * Log scrubber to prevent API key leakage in log output.
 *
 * @module @genicui/server/auth/log-scrubber
 *
 * @see {F46-AC3} — Plain-text key never logged
 */
/**
 * Regex to match API keys in log output.
 */
const API_KEY_LOG_REGEX = /gnc_(live|test)_[a-f0-9]{32}/gi;
/**
 * Scrub all API keys from a string, replacing them with redacted placeholders.
 *
 * @param text - The string that may contain API keys
 * @returns The string with all API keys replaced by `gnc_<type>_***REDACTED***`
 *
 * @see {F46-AC3} — Plain-text key never logged
 */
export function scrubApiKey(text) {
    return text.replace(API_KEY_LOG_REGEX, 'gnc_$1_***REDACTED***');
}
/**
 * Create a safe representation of an API key for logging.
 * Shows only the prefix and first 4 characters of the key portion.
 *
 * @param key - The raw API key
 * @returns A safe string like `gnc_live_abcd****`
 */
export function safeLogKey(key) {
    const parts = key.split('_');
    if (parts.length < 3) {
        return 'gnc_****';
    }
    const prefix = `${parts[0]}_${parts[1]}_`;
    const keyPart = parts.slice(2).join('');
    const visible = keyPart.slice(0, 4);
    return `${prefix}${visible}****`;
}
//# sourceMappingURL=log-scrubber.js.map