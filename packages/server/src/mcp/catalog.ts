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

/** TypeBox schema for InputPair props — two numeric inputs with a
 *  Submit button. Emits `submit` events on click.
 *
 *  Mirrors @genicul-primevue/registry/src/input-pair-schema.ts so the
 *  server-side validation matches what the playground's renderer
 *  expects. Keep in sync with `registries/primevue/src/input-pair-schema.ts`.
 *
 *  @see {F47} — Component-event interactivity (M5-T7) */
const InputPairPropsSchema: TSchema = Type.Object({
  input1: Type.Optional(Type.Number()),
  input2: Type.Optional(Type.Number()),
  label1: Type.Optional(Type.String()),
  label2: Type.Optional(Type.String()),
  submitLabel: Type.Optional(Type.String()),
  resultComponentId: Type.Optional(Type.String()),
}, { additionalProperties: false });

/** TypeBox schema for ResultCard props — display-only computed value.
 *
 *  Mirrors @genicul-primevue/registry/src/result-card-schema.ts.
 *
 *  @see {F47} — Component-event interactivity (M5-T7) */
const ResultCardPropsSchema: TSchema = Type.Object({
  input1: Type.Optional(Type.Number()),
  input2: Type.Optional(Type.Number()),
  sum: Type.Number(),
  operation: Type.Optional(
    Type.Union([
      Type.Literal('add'),
      Type.Literal('subtract'),
      Type.Literal('multiply'),
      Type.Literal('divide'),
    ]),
  ),
  title: Type.Optional(Type.String()),
}, { additionalProperties: false });

/** TypeBox schema for CityPicker props — interactive dropdown of cities
 *  with a Submit button. Emits a `submit` event when the user picks
 *  a city and clicks Submit, carrying `{ city }` as the payload.
 *
 *  Mirrors @genicul-primevue/registry/src/city-picker-schema.ts.
 *
 *  @see {F47} — Component-event interactivity (M5-T7) */
const CityPickerPropsSchema: TSchema = Type.Object({
  initialCity: Type.Optional(Type.String()),
  cityOptions: Type.Array(Type.String(), { minItems: 2 }),
  label: Type.Optional(Type.String()),
}, { additionalProperties: false });

/** TypeBox schema for WeatherCard props — display-only weather card.
 *
 *  Mirrors @genicul-primevue/registry/src/weather-card-schema.ts.
 *
 *  @see {F47} — Component-event interactivity (M5-T7) */
const WeatherCardPropsSchema: TSchema = Type.Object({
  city: Type.String(),
  units: Type.Optional(
    Type.Union([Type.Literal('metric'), Type.Literal('imperial')]),
  ),
}, { additionalProperties: false });

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

  /**
   * InputPair — two-number calculator input form with a Submit button.
   *
   * Emits `submit` events with `{ input1, input2 }` when the user
   * clicks the Submit button. The chat bridge routes the click
   * back into a fresh Claude turn via `[component_event]` so the
   * agent can compute and return a ResultCard.
   *
   * @see {F43} — Interactive components + chat bridge
   * @see {F47} — Component-event interactivity (M5-T7)
   */
  {
    name: 'InputPair',
    version: '1.0.0',
    registryId: '@genicul-primevue/registry',
    description:
      'Two-number input form with a Submit button. Emits `submit` events ' +
      'the chat bridge feeds back to the agent for follow-up computation.',
    whenToUse:
      'When the user wants to perform an arithmetic operation, do a quick ' +
      'computation, or otherwise feed two numbers to the agent for processing. ' +
      'Prefer this over a text input when both numbers are required up front ' +
      'and the result is best surfaced as a ResultCard on submit.',
    tags: [
      'form',
      'input',
      'numeric',
      'submit',
      'calculator',
      'pair',
      'interactivity',
      'chat-bridge',
    ],
    propsSchema: InputPairPropsSchema,
    propsJsonSchema: InputPairPropsSchema as unknown as Record<string, unknown>,
    events: ['submit'],
    examples: [
      { input1: 5, input2: 3, label1: 'First number', label2: 'Second number', submitLabel: 'Add them' },
    ],
  },

  /**
   * ResultCard — display-only computed-value card.
   *
   * Use as the answer surface for an interactive flow. After the
   * agent receives a `submit` event from InputPair, it renders a
   * ResultCard with the computed `sum` (or other operation) so the
   * chat panel shows the answer next to the input form.
   *
   * @see {F43} — Chat as the sole render surface (interactive components)
   */
  {
    name: 'ResultCard',
    version: '1.0.0',
    registryId: '@genicul-primevue/registry',
    description:
      'Display-only card for a computed result. Pairs with InputPair: after ' +
      'the form submits, the agent renders a ResultCard with the answer.',
    whenToUse:
      'When the chat conversation has produced a numeric result that deserves ' +
      'a structured, in-place display alongside the InputPair form that ' +
      'asked for it.',
    tags: [
      'card',
      'result',
      'display',
      'calculator',
      'chat-bridge',
    ],
    propsSchema: ResultCardPropsSchema,
    propsJsonSchema: ResultCardPropsSchema as unknown as Record<string, unknown>,
    events: [],
    examples: [
      { input1: 5, input2: 3, sum: 8, operation: 'add', title: 'Sum' },
    ],
  },

  /**
   * CityPicker — interactive city-selector dropdown with a Submit
   * button. Emits `submit` events with `{ city }` when the user picks
   * a city and clicks Submit. The chat bridge forwards the click
   * into a follow-up agent turn that fetches weather and renders
   * a WeatherCard.
   *
   * @see {F47} — Component-event interactivity (M5-T7)
   */
  {
    name: 'CityPicker',
    version: '1.0.0',
    registryId: '@genicul-primevue/registry',
    description:
      'Interactive dropdown for picking a city, with a Submit button. ' +
      'ALWAYS use this component FIRST when the user asks about weather, ' +
      'temperature, climate, or any city-scoped information — it collects ' +
      'the city via a clean dropdown and emits a `submit` event that the ' +
      'chat bridge forwards back to the agent. The follow-up agent turn ' +
      'then renders a WeatherCard with the result. Do NOT guess a city ' +
      'and render a WeatherCard directly — let the user pick.',
    whenToUse:
      'First choice for ANY weather query: "what\'s the weather", "is it ' +
      'raining", "temperature in Tokyo", "weather forecast", "show me ' +
      'weather", "pick a city and tell me the weather", etc. Also use for ' +
      'other city-scoped lookups where the user should pick the city. ' +
      'Prefer this over a text input — the dropdown covers the common ' +
      'case without free-form typing. After the user submits, the agent ' +
      'will receive a follow-up turn with the chosen city and then ' +
      'render a WeatherCard. Never skip this step by guessing a city.',
    tags: [
      'form',
      'input',
      'dropdown',
      'select',
      'city',
      'weather',
      'pick',
      'choose',
      'temperature',
      'climate',
      'forecast',
      'interactive',
      'chat-bridge',
    ],
    propsSchema: CityPickerPropsSchema,
    propsJsonSchema: CityPickerPropsSchema as unknown as Record<string, unknown>,
    events: ['submit'],
    examples: [
      { cityOptions: ['Paris', 'London', 'Tokyo', 'New York', 'Sydney'], label: 'Pick a city' },
      { initialCity: 'London', cityOptions: ['London', 'Paris', 'Berlin'] },
    ],
  },

  /**
   * WeatherCard — display-only weather card for a single city.
   *
   * Rendered after the user picks a city via CityPicker. The agent
   * fetches the weather (e.g. Open-Meteo) and renders this card with
   * the result.
   *
   * @see {F47} — Component-event interactivity (M5-T7)
   */
  {
    name: 'WeatherCard',
    version: '1.0.0',
    registryId: '@genicul-primevue/registry',
    description:
      'Display-only weather card for a single city — temperature, ' +
      'conditions, and metric/imperial unit choice. Renders AFTER the ' +
      'user has picked a city via CityPicker and the agent has fetched ' +
      'the forecast (e.g. Open-Meteo). This component never asks the user ' +
      'for input.',
    whenToUse:
      'Only after a CityPicker.submit event has fired (or the user has ' +
      'already named a specific city in the original prompt and the ' +
      'agent has the forecast in hand). Pairs 1:1 with CityPicker as the ' +
      'second half of the city-picker → weather-card flow. Do NOT use ' +
      'this on a fresh "show me the weather" prompt without first ' +
      'rendering CityPicker to collect the city.',
    tags: [
      'card',
      'weather',
      'display',
      'city',
      'temperature',
      'climate',
      'forecast',
      'interactive',
      'chat-bridge',
    ],
    propsSchema: WeatherCardPropsSchema,
    propsJsonSchema: WeatherCardPropsSchema as unknown as Record<string, unknown>,
    events: [],
    examples: [
      { city: 'Paris', units: 'metric' },
      { city: 'London', units: 'imperial' },
    ],
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
