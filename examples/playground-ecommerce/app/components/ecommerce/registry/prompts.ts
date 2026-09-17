/**
 * Seed prompts for the playground's PromptsPanel — drives the journey
 * without typing. Re-exports the 4 chips from journey spec §7.
 *
 * Wired through `useChatInput().fillAndSubmit` (same pipeline as the
 * empty-state chips) so the playground can kick off Steps 1, 2, 3-7, 8
 * from a single click.
 *
 * @module playground-ecommerce/app/components/ecommerce/registry/prompts
 *
 * @see {M5.2-T3-AC6} — 4 seed prompts from journey spec §7
 */

import type { SeedPrompt } from './types.js';

export const SEED_PROMPTS: readonly SeedPrompt[] = [
  {
    id: 'show-running-shoes',
    label: 'Show me running shoes under $120',
    prompt: 'show me running shoes under $120',
  },
  {
    id: 'pick-size-color',
    label: 'Pick size 10, red or blue',
    prompt: 'pick size 10, red or blue',
  },
  {
    id: 'add-and-checkout',
    label: 'Add to cart and checkout',
    prompt: 'add to cart and checkout',
  },
  {
    id: 'where-is-my-order',
    label: "Where's my order?",
    prompt: "where's my order?",
  },
];