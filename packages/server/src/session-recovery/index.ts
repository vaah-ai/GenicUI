/**
 * Session recovery module — F33.
 *
 * @module @genicui/server/session-recovery
 */

export { MessageBuffer } from './message-buffer.js';
export {
  parseLastEventId,
  extractLastEventIdHeader,
  extractSessionIdHeader,
  recoverSession,
  shouldSendSnapshot,
  storeSessionBuffer,
  retrieveSessionBuffer,
  removeSessionBuffer,
  cleanupSessionBuffers,
} from './session-recovery.js';
export type {
  LastEventId,
  MessageBufferEntry,
  ReplayResult,
} from './types.js';
export {
  MAX_REPLAY_MESSAGES,
  REPLAY_TTL_MS,
} from './types.js';
