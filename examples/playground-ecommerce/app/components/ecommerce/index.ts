/**
 * Ecommerce workspace barrel — re-exports the workspace-local registry,
 * seed prompts, and types for the rest of the playground to import.
 *
 * @module playground-ecommerce/app/components/ecommerce
 */

export { ECOMMERCE_REGISTRY } from './registry/components.js';
export { SEED_PROMPTS } from './registry/prompts.js';
export type {
  EcommerceComponentEntry,
  EcommerceComponentEvent,
  SeedPrompt,
} from './registry/types.js';