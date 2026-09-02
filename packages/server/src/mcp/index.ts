/**
 * MCP module barrel export.
 *
 * @module @genicui/server/mcp
 * @see {F13} — MCP server with 4 public tools
 */

export { createMcpServer, startStdioMcpServer, handleMcpRequest } from './server.js';
export { registerToolDefinitions, GENICUI_ERROR_CODES } from './tool-registry.js';
export type { GenicUIErrorCode } from './tool-registry.js';
export { findComponents, getCatalog } from './catalog.js';
export type { CatalogEntry, SearchResult, FindResult } from './catalog.js';
export { eventSubscriptionManager, EventSubscriptionManager } from './subscribe-handler.js';
export type {
  EventSubscription,
  ComponentEvent,
  SubscribeResult,
  UnsubscribeResult,
  MatchedEvent,
  SubscribeError,
} from './subscribe-handler.js';

// Event capture (F19)
export { eventCapture, EventCapture } from '../events/event-capture.js';
export { TokenBucket } from '../events/rate-limiter.js';
export type {
  CaptureResult,
  DropReason,
  ComponentEventSchemas,
} from '../events/event-capture.js';
export type {
  RateLimitResult,
  RateLimiterConfig,
} from '../events/rate-limiter.js';

// Trust-boundary validation (F14)
export {
  stripProtoKeys,
  hasProtoKeys,
  validateToolInput,
  checkToolInput,
  rejectOpenSchemas,
  RegistryValidationError,
  validatePatchPath,
  validatePatchOperations,
} from '../validation/index.js';
export type {
  ValidationResult,
  PatchValidationResult,
} from '../validation/index.js';
