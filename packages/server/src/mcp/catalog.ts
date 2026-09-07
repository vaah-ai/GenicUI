/**
 * In-memory component catalog — stub implementation for MVP.
 *
 * For the MVP (F15), the catalog contains a hard-coded set of components.
 * F37 (Component Registry) replaces this with a dynamic registry loader.
 *
 * @module @genicui/server/mcp/catalog
 * @see {F15} — find_ui_component tool
 */

import type { TSchema } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single entry in the component catalog. */
export interface CatalogEntry {
  /** Component name (e.g., "DataTable"). */
  readonly name: string;

  /** Semantic version string (e.g., "0.1.0"). */
  readonly version: string;

  /** Registry identifier (e.g., "primevue@4.2.0"). */
  readonly registryId: string;

  /** One-line description of what the component does. */
  readonly description: string;

  /** When the agent should choose this component. */
  readonly whenToUse: string;

  /** Keywords for search matching. */
  readonly tags: readonly string[];

  /** TypeBox schema for the component's props. */
  readonly propsSchema: TSchema;

  /** JSON Schema representation of the props schema (for serialization). */
  readonly propsJsonSchema: Readonly<Record<string, unknown>>;

  /** Event names this component can emit. */
  readonly events: readonly string[];

  /** Example prop configurations. */
  readonly examples: readonly Readonly<Record<string, unknown>>[];
}

/** A search result with a relevance score. */
export interface SearchResult {
  /** The catalog entry. */
  readonly entry: CatalogEntry;

  /** Relevance score (0.0 to 1.0). Higher is more relevant. */
  readonly score: number;
}

/** The return type for findComponents. */
export interface FindResult {
  /** Matching components, sorted by score descending. */
  readonly components: readonly SearchResult[];

  /** Present when no components matched the query. */
  readonly reason?: 'no_component_matches';

  /** Present when multiple results need disambiguation. */
  readonly disambiguation?: readonly string[];
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Catalog Entries
// ---------------------------------------------------------------------------

/**
 * Hard-coded catalog entries for the MVP.
 *
 * F37 (Component Registry) will replace this with a dynamic loader.
 */

/** TypeBox schema for DataTable props. */
const DataTablePropsSchema: TSchema = Type.Object({
  rows: Type.Array(Type.Object({}, { additionalProperties: true })),
  pageSize: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 100,
      default: 10,
    }),
  ),
}, { additionalProperties: false });

/** TypeBox schema for Calculator props. Stateless at the wire layer;
 *  the client maintains its own display/operand state and emits
 *  `keystroke` events when the user presses a key. */
const CalculatorPropsSchema: TSchema = Type.Object({}, { additionalProperties: false });

const CATALOG: CatalogEntry[] = [
  /**
   * PrimeVue DataTable — the only component in the MVP catalog.
   * @see {F40} — @genicul-primevue/registry (DataTable only in MVP)
   */
  {
    name: 'DataTable',
    version: '0.1.0',
    registryId: 'primevue@4.2.0',
    description: 'Display tabular data with sorting, pagination, and row selection.',
    whenToUse:
      'When the agent needs to render structured rows the user can interact with — ' +
      'e.g., orders, users, products, or any tabular dataset.',
    tags: [
      'table',
      'grid',
      'rows',
      'data',
      'tabular',
      'sortable',
      'pagination',
      'filterable',
      'selection',
    ],
    propsSchema: DataTablePropsSchema,
    propsJsonSchema: DataTablePropsSchema as unknown as Record<string, unknown>,
    events: ['row_selected', 'sort_change', 'page_change', 'filter_change'],
    examples: [
      {
        rows: [
          { id: '1', name: 'Alice' },
          { id: '2', name: 'Bob' },
        ],
        pageSize: 10,
      },
    ],
  },

  /**
   * Calculator — 4-function calculator with keyboard support.
   *
   * The component is fully client-stateful (display, accumulator,
   * pending operator). It emits `keystroke` events so a backing
   * agent can observe user input if desired, but no server-side
   * state is required to render it.
   *
   * @see {F43} — interactive GenicUI components in the chat panel
   */
  {
    name: 'Calculator',
    version: '0.1.0',
    registryId: 'genicui@core',
    description: 'Four-function calculator with +, −, ×, ÷ and keyboard input.',
    whenToUse:
      'When the user asks for a calculator, a quick arithmetic helper, ' +
      'or any numeric scratchpad that needs +, -, *, /.',
    tags: [
      'calculator',
      'math',
      'arithmetic',
      'add',
      'subtract',
      'multiply',
      'divide',
      'sum',
      'numbers',
    ],
    propsSchema: CalculatorPropsSchema,
    propsJsonSchema: CalculatorPropsSchema as unknown as Record<string, unknown>,
    events: ['keystroke'],
    examples: [{}],
  },
];

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Search Logic
// ---------------------------------------------------------------------------

/** Tokenize a query string into lowercase keywords. */
function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Score a catalog entry against a set of query tokens.
 *
 * Scoring heuristic:
 * - Exact match on name (case-insensitive): 1.0 per token
 * - Token appears in tags: 0.8 per token
 * - Token appears in description (word-boundary): 0.4 per token
 * - Token appears in whenToUse: 0.2 per token
 *
 * Final score is the average of per-token scores, normalized to [0, 1].
 */
function scoreEntry(entry: CatalogEntry, tokens: string[]): number {
  if (tokens.length === 0) {
    return 0;
  }

  const name = entry.name.toLowerCase();
  const tagSet = new Set(entry.tags.map((t) => t.toLowerCase()));
  const descWords = tokenize(entry.description);
  const useWords = tokenize(entry.whenToUse);

  let totalScore = 0;

  for (const token of tokens) {
    let tokenScore = 0;

    // Exact name match (highest weight)
    if (name === token) {
      tokenScore = 1.0;
    }
    // Name contains the token
    else if (name.includes(token)) {
      tokenScore = 0.7;
    }
    // Tag match
    else if (tagSet.has(token)) {
      tokenScore = 0.8;
    }
    // Description word match
    else if (descWords.some((w) => w.includes(token))) {
      tokenScore = 0.4;
    }
    // whenToUse match
    else if (useWords.some((w) => w.includes(token))) {
      tokenScore = 0.2;
    }

    totalScore += tokenScore;
  }

  return totalScore / tokens.length;
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Search the component catalog for entries matching the query.
 *
 * Returns up to `topK` results, sorted by relevance score (descending).
 * If no entries match, returns an empty array with a `reason` field.
 * If multiple entries match with similar scores, returns a `disambiguation` field.
 *
 * @param query — the search query string
 * @param topK — maximum number of results to return (default: 5)
 * @returns search results with scores and optional disambiguation
 *
 * @see {F15-AC1} — exact tag match returns 1 result
 * @see {F15-AC2} — no match returns empty result with reason
 * @see {F15-AC3} — ambiguous match returns disambiguation candidates
 */
export function findComponents(
  query: string,
  topK: number = 5,
): FindResult {
  const tokens = tokenize(query);

  // Score all entries
  const scored = CATALOG.map((entry) => ({
    entry,
    score: scoreEntry(entry, tokens),
  }));

  // Filter out zero-score entries
  const matches = scored.filter((s) => s.score > 0);

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  // Clamp to topK
  const top = matches.slice(0, topK);

  // F15-AC2: No match
  if (top.length === 0) {
    return { components: [], reason: 'no_component_matches' };
  }

  // F15-AC3: Disambiguation — if multiple entries have similar scores
  // (within 0.1 of each other), list them for the agent to refine.
  if (top.length > 1) {
    const topScore = top[0]!.score;
    const ambiguous = top.filter((s) => Math.abs(s.score - topScore) < 0.1);
    if (ambiguous.length > 1) {
      return {
        components: top.map((s) => ({ entry: s.entry, score: s.score })),
        disambiguation: ambiguous.map((s) => s.entry.name),
      };
    }
  }

  return {
    components: top.map((s) => ({ entry: s.entry, score: s.score })),
  };
}

/**
 * Return the full catalog (for testing and debugging).
 */
export function getCatalog(): readonly CatalogEntry[] {
  return CATALOG;
}
