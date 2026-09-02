/**
 * Auth module barrel exports.
 *
 * @module @genicui/server/auth
 *
 * @see {F46} — API key auth
 */
export { AUTH_REGEX, AuthError } from './types.js';
export { hashApiKey, validateApiKeyFormat, parseBearerKey, parseApiKeyInfo, validateKey, } from './key-validator.js';
export { scrubApiKey, safeLogKey } from './log-scrubber.js';
//# sourceMappingURL=index.js.map