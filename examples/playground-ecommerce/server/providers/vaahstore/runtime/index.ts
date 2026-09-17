/**
 * VaahStore provider adapter — implements `ProviderAdaptor` for the
 * VaahStore headless commerce HTTP API.
 *
 * The adapter exposes 12 agent-callable tools (see §5 of
 * `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md`)
 * whose handlers are wrapped with F14 trust-boundary validation. When
 * `VITE_VAAHSTORE_LIVE=0` (the default) every tool resolves from
 * `examples/playground-ecommerce/__fixtures__/vaahstore/<tool>.json`;
 * when `VITE_VAAHSTORE_LIVE=1` the same handlers `fetch()` against
 * `${VAAHSTORE_BASE_URL}/api/<resource>` with the live bearer token.
 *
 * @module playground-ecommerce/server/providers/vaahstore/runtime
 *
 * @see {M5.2-T2} — VaahStore chat provider adapter (origin)
 * @see {M5.2-T2-1} — moved out of core into this workspace
 * @see {F14} — trust-boundary validation
 * @see {F76} — provider-registry docs
 *
 * Implementation notes:
 *   - Mirrors the `ClaudeCodeAdaptor` shape (factory → singleton) but
 *     the runtime is fundamentally different: VaahStore is an HTTP
 *     tool-caller, not a CLI spawn. The `ProviderAdaptor` interface
 *     stays CLI-shaped; the `callTool(name, args)` method is the
 *     VaahStore-only extension that `chat-handler.ts` routes MCP
 *     `tools/call` requests into.
 *   - The bearer token is loaded once at construction time from
 *     `env.VAHSTORE_BEARER_TOKEN`. It is held in a module-private
 *     slot, scrubbed from any string that crosses the process boundary
 *     (`console.*`, thrown errors, fixture keys), and never echoed
 *     back to the LLM (EJG-ADAPT-3).
 *   - The adapter honours the `VITE_VAAHSTORE_LIVE` env switch at
 *     call time, not construction time — operators can flip the
 *     switch without restarting the server (EJG-ADAPT-1).
 *   - As of M5.2-T2-1 this file lives at
 *     `examples/playground-ecommerce/server/providers/vaahstore/runtime/`.
 *     Validation imports use the workspace-local
 *     `../validation/` barrel (shallow-copies of F14 primitives).
 *     `ProviderAdaptor` etc. come from `../../types.js`.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { TSchema } from '@sinclair/typebox';

import { validateToolInput } from '../../validation/index.js';
import { stripProtoKeys } from '../../validation/strip-proto-keys.js';
import type {
  ProviderAdaptor,
  ProviderConfig,
  ParsedLine,
  ChatEvent,
} from '../../types.js';

// ---------------------------------------------------------------------------
// Env contract — single source of truth for the env-var names
// (kept in one place so M5.1-T15's docs and the playground providers
// dropdown stay aligned).
// ---------------------------------------------------------------------------

export const VAAHSTORE_ENV = {
  baseUrl: 'VAAHSTORE_BASE_URL',
  storeId: 'VAAHSTORE_STORE_ID',
  bearerToken: 'VAAHSTORE_BEARER_TOKEN',
  liveSwitch: 'VITE_VAAHSTORE_LIVE',
} as const;

export interface VaahstoreEnv {
  /** Base URL with no trailing slash (e.g. `https://store.example.com`). */
  readonly baseUrl: string;
  /** Sanctum `PersonalAccessToken` plaintext; scrubbed from all output. */
  readonly bearerToken: string;
  /** Default `selected_store` query value. Empty string means "use upstream default". */
  readonly storeId: string;
}

/**
 * Read VaahStore env vars into a typed record. Missing keys default to
 * empty strings — the live-mode handler fails closed if any are blank.
 *
 * Never logs the bearer token (EJG-ADAPT-3). The `process.env` lookup
 * is intentionally bypassed in tests via the `env` argument to
 * `createVaahstoreProvider`.
 */
export function readVaahstoreEnv(env: NodeJS.ProcessEnv = process.env): VaahstoreEnv {
  const baseUrlRaw = env[VAAHSTORE_ENV.baseUrl];
  const bearerRaw = env[VAAHSTORE_ENV.bearerToken];
  const storeIdRaw = env[VAAHSTORE_ENV.storeId];
  return {
    baseUrl: typeof baseUrlRaw === 'string' ? baseUrlRaw.replace(/\/$/, '') : '',
    bearerToken: typeof bearerRaw === 'string' ? bearerRaw : '',
    storeId: typeof storeIdRaw === 'string' ? storeIdRaw : '',
  };
}

// ---------------------------------------------------------------------------
// Tool schemas — 12 TypeBox schemas, one per §5 row.
// ---------------------------------------------------------------------------

/**
 * Compact re-export of the @sinclair/typebox builders we use so the
 * schema literals below stay readable. Each schema sets
 * `additionalProperties: false` (F14 guardrail — never accept unknown
 * keys from untrusted LLM output).
 */
import { Type } from '@sinclair/typebox';

/** `list_products` — paged listing with VaahStore filter shape. */
export const TListProducts = Type.Object(
  {
    query: Type.Optional(Type.String({ minLength: 1, maxLength: 128 })),
    category: Type.Optional(Type.String({ minLength: 1, maxLength: 128 })),
    /** Decimal `min_price` filter (NOT minor units — verified M5.2-T1). */
    min_price: Type.Optional(Type.Number({ minimum: 0 })),
    max_price: Type.Optional(Type.Number({ minimum: 0 })),
    /** Variation slugs to match — VaahStore shape is
     *  `filter[product_variations][]=<slug>`. */
    variations: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 32 })),
    per_page: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    page: Type.Optional(Type.Integer({ minimum: 1 })),
  },
  { additionalProperties: false },
);

/** `get_product` — single product + joined medias/variations/stocks. */
export const TGetProduct = Type.Object(
  { id: Type.String({ minLength: 1, maxLength: 64 }) },
  { additionalProperties: false },
);

/** `get_variations` — variations for one product. */
export const TGetVariations = Type.Object(
  { id: Type.String({ minLength: 1, maxLength: 64 }) },
  { additionalProperties: false },
);

/** `check_stock` — query product-stocks endpoint. */
export const TCheckStock = Type.Object(
  {
    product_id: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })),
    variation_id: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })),
  },
  { additionalProperties: false },
);

/** `create_cart` — returns a VaahStore cart UUID with `vh_user_id=null`
 *  for guests (verified M5.2-T1 — there is no `is_guest` flag). */
export const TCreateCart = Type.Object(
  { currency_code: Type.Optional(Type.String({ minLength: 3, maxLength: 3 })) },
  { additionalProperties: false },
);

/** `add_to_cart` — push a line item onto a guest cart. */
export const TAddToCart = Type.Object(
  {
    cart_uuid: Type.String({ minLength: 1, maxLength: 64 }),
    product_id: Type.String({ minLength: 1, maxLength: 64 }),
    variation_id: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })),
    quantity: Type.Integer({ minimum: 1, maximum: 999 }),
  },
  { additionalProperties: false },
);

/** `list_shipping` — shipment methods for a cart. */
export const TListShipping = Type.Object(
  { cart_uuid: Type.String({ minLength: 1, maxLength: 64 }) },
  { additionalProperties: false },
);

/** `list_payment_methods` — store payment methods. */
export const TListPaymentMethods = Type.Object(
  { cart_uuid: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })) },
  { additionalProperties: false },
);

/** `create_order` — finalise checkout (auth-protected in live mode). */
export const TCreateOrder = Type.Object(
  {
    cart_uuid: Type.String({ minLength: 1, maxLength: 64 }),
    shipping_method_id: Type.String({ minLength: 1, maxLength: 64 }),
    payment_method_id: Type.String({ minLength: 1, maxLength: 64 }),
    address_id: Type.String({ minLength: 1, maxLength: 64 }),
    // `minLength: 3` + simple `@` check is enough — TypeBox's `format:
    // 'email'` requires a registered formatter and silently fails as
    // "Unknown format" otherwise. Validation: a single `@` after
    // position 0.
    customer_email: Type.RegExp(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, { maxLength: 254 }),
  },
  { additionalProperties: false },
);

/** `create_address` — shipping/billing address. */
export const TCreateAddress = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 128 }),
    line1: Type.String({ minLength: 1, maxLength: 256 }),
    line2: Type.Optional(Type.String({ maxLength: 256 })),
    city: Type.String({ minLength: 1, maxLength: 128 }),
    region: Type.Optional(Type.String({ maxLength: 128 })),
    postal_code: Type.String({ minLength: 1, maxLength: 32 }),
    country_code: Type.String({ minLength: 2, maxLength: 2 }),
    phone: Type.Optional(Type.String({ maxLength: 32 })),
    customer_email: Type.RegExp(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, { maxLength: 254 }),
  },
  { additionalProperties: false },
);

/** `track_order` — auth-protected in live mode (EJG-ADAPT-3 fallback:
 *  localStorage lookup). */
export const TTrackOrder = Type.Object(
  { order_id: Type.String({ minLength: 1, maxLength: 64 }) },
  { additionalProperties: false },
);

/** `claim_order` — attach a guest order to a newly-created customer. */
export const TClaimOrder = Type.Object(
  {
    customer_id: Type.String({ minLength: 1, maxLength: 64 }),
    order_id: Type.String({ minLength: 1, maxLength: 64 }),
  },
  { additionalProperties: false },
);

/** Map from tool name → TypeBox input schema. The agent reads this
 *  table to know which schema to validate against before invoking. */
export const VAAHSTORE_TOOL_SCHEMAS = {
  list_products: TListProducts,
  get_product: TGetProduct,
  get_variations: TGetVariations,
  check_stock: TCheckStock,
  create_cart: TCreateCart,
  add_to_cart: TAddToCart,
  list_shipping: TListShipping,
  list_payment_methods: TListPaymentMethods,
  create_order: TCreateOrder,
  create_address: TCreateAddress,
  track_order: TTrackOrder,
  claim_order: TClaimOrder,
} as const satisfies Record<string, TSchema>;

export type VaahstoreToolName = keyof typeof VAAHSTORE_TOOL_SCHEMAS;

// ---------------------------------------------------------------------------
// Tool-call result envelope
// ---------------------------------------------------------------------------

/**
 * The shape returned to the chat channel for a single tool invocation.
 *
 * Mirrors `McpServer`'s `CallToolResult` so the chat handler can reuse
 * the existing rendering path that broadcasts `tool_call` /
 * `tool_result` events into the playground chat panel.
 */
export interface VaahstoreToolResult {
  /** MCP-style text payload (JSON-stringified body). */
  readonly content: ReadonlyArray<{ readonly type: 'text'; readonly text: string }>;
  /** `true` when the wrapper rejected the input or the handler threw. */
  readonly isError: boolean;
  /** JSON-RPC error code (-32003 trust-boundary, -32010 internal). */
  readonly errorCode?: number;
  /** Machine-readable error message (e.g. `props_invalid`). */
  readonly errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Bearer-token scrubbing helpers (EJG-ADAPT-3)
//
// The scrubber is keyed by the adaptor instance — never by a module-
// global — so each adapter carries its own token. The cross-process
// helper `scrubBearer(input)` defaults to identity when no token is
// registered (i.e. in fixture-only deployments) and unconditionally
// delegates to a per-instance RegExp constructor.
// ---------------------------------------------------------------------------

/**
 * Build a scrubber closure that strips `token` (and every variation of
 * substring collision via the raw value) from any string it sees.
 *
 * `token` is captured in the closure's private slot — never re-emitted.
 */
export function makeBearerScrubber(token: string): (s: string) => string {
  if (!token) return (s) => s;
  const tokenRe = new RegExp(escapeRegExp(token), 'g');
  return (s) => (typeof s === 'string' ? s.replace(tokenRe, '[REDACTED]') : s);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Scrub the active bearer out of any string that crosses the process
 * boundary (console output, thrown error messages, fixture-derived
 * text). Returns the input unchanged for non-strings.
 *
 * The default export here is a no-op fall-through used when no
 * adaptor has been instantiated; tests that exercise the scrubber
 * MUST go through an instance-bound `scrubWithToken()` exposed on
 * the adapter (added in `VaahstoreProviderAdaptor` below).
 */
export function scrubBearer(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  return input;
}

// ---------------------------------------------------------------------------
// Fixture-mode dispatch (EJG-ADAPT-1 default)
// ---------------------------------------------------------------------------

/**
 * Resolve the on-disk fixtures directory.
 *
 * The directory is the `examples/playground-ecommerce/__fixtures__/vaahstore/`
 * folder checked into the repo (committed alongside the workspace).
 * The path is computed relative to this file so the server can resolve
 * fixtures whether it runs from a Bun workspace monorepo install or a
 * global `bun run start`.
 */
export function resolveFixturesDir(): string {
  // The fixtures folder is a sibling of `server/` —
  // i.e. `<repo>/examples/playground-ecommerce/__fixtures__/vaahstore/`.
  // We try a few candidate roots because `import.meta.url` rewrites
  // under `bun test` change the depth at which the file is mounted.
  //
  // Layout: `runtime/index.ts` lives at
  //   examples/playground-ecommerce/server/providers/vaahstore/runtime/
  // so going `..`/`..`/`..` (3 ups) lands at
  //   examples/playground-ecommerce/
  // and the fixtures live at `./__fixtures__/vaahstore/` next to it.
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, '..', '..', '..', '__fixtures__', 'vaahstore'),
    join(here, '..', '..', '..', '..', '__fixtures__', 'vaahstore'),
    join(process.cwd(), 'examples', 'playground-ecommerce', '__fixtures__', 'vaahstore'),
    join(process.cwd(), '__fixtures__', 'vaahstore'),
  ];
  for (const candidate of candidates) {
    if (typeof Bun !== 'undefined') {
      const f = Bun.file(join(candidate, 'list_products.json'));
      if (f.size > 0) return candidate;
    }
  }
  return candidates[0]!;
}

/**
 * Load one fixture JSON file. Rejects with a clean error message that
 * has already been bearer-scrubbed.
 */
async function loadFixture(toolName: string): Promise<unknown> {
  const dir = resolveFixturesDir();
  const path = join(dir, `${toolName}.json`);
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    throw new Error(`VaahStore fixture missing: ${path}`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`VaahStore fixture corrupt (not JSON): ${path}`);
  }
}

// ---------------------------------------------------------------------------
// Live-mode dispatch (EJG-ADAPT-1 enabled mode)
// ---------------------------------------------------------------------------

interface LiveRoute {
  readonly method: 'GET' | 'POST';
  readonly path: string;
  readonly queryFromArgs?: ReadonlyArray<keyof VaahstoreToolNamesArgs>;
}

/** Per-tool routing table — the URLs reflect the M5.2-T1 verification
 *  results (no `vaahstore` segment, no `/v1/`, store-id is a query). */
const LIVE_ROUTES: Record<VaahstoreToolName, LiveRoute> = {
  list_products: { method: 'GET', path: '/api/store/products' },
  get_product: { method: 'GET', path: '/api/store/products/{id}' },
  get_variations: { method: 'GET', path: '/api/store/products/{id}/variations' },
  check_stock: { method: 'GET', path: '/api/store/product-stocks' },
  create_cart: { method: 'POST', path: '/api/store/carts' },
  add_to_cart: { method: 'POST', path: '/api/store/carts/{cart_uuid}/items' },
  list_shipping: { method: 'GET', path: '/api/store/shipments' },
  list_payment_methods: { method: 'GET', path: '/api/store/store-payment-methods' },
  create_order: { method: 'POST', path: '/api/store/orders' },
  create_address: { method: 'POST', path: '/api/store/addresses' },
  track_order: { method: 'GET', path: '/api/store/orders/{order_id}' },
  claim_order: { method: 'POST', path: '/api/store/customers/{customer_id}/orders/{order_id}/claim' },
};

type VaahstoreToolNamesArgs = {
  list_products: { id?: never };
  get_product: { id: string };
  get_variations: { id: string };
  check_stock: Record<string, never>;
  create_cart: Record<string, never>;
  add_to_cart: { cart_uuid: string };
  list_shipping: { cart_uuid: string };
  list_payment_methods: { cart_uuid?: string };
  create_order: { cart_uuid: string };
  create_address: Record<string, never>;
  track_order: { order_id: string };
  claim_order: { customer_id: string; order_id: string };
};

/** Substitute `{key}` placeholders in the route path. Unknown keys
 *  become empty segments — the caller's schema already enforced the
 *  required keys. */
function fillPath(template: string, args: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = args[key];
    return v == null ? '' : encodeURIComponent(String(v));
  });
}

/** Build the VaahStore query string — store-id per the M5.2-T1
 *  verified shape, plus every non-path arg as `key=value`. Variation
 *  filter takes the array form `filter[product_variations][]=<slug>`. */
function buildQueryString(args: Record<string, unknown>, storeId: string): string {
  const q = new URLSearchParams();
  if (storeId) q.set('selected_store', storeId);
  for (const [k, v] of Object.entries(args)) {
    if (v == null || v === '') continue;
    if (Array.isArray(v)) {
      if (k === 'variations') {
        for (const slug of v) q.append('filter[product_variations][]', String(slug));
      } else {
        for (const item of v) q.append(`${k}[]`, String(item));
      }
    } else {
      q.set(k, String(v));
    }
  }
  return q.toString();
}

/** Live-mode HTTP call. Throws on non-2xx with a scrubbed message. */
async function liveCall(
  env: VaahstoreEnv,
  toolName: VaahstoreToolName,
  args: Record<string, unknown>,
  scrub: (s: string) => string,
): Promise<unknown> {
  if (!env.baseUrl) throw new Error('VaahStore live mode: VAAHSTORE_BASE_URL is empty');
  if (!env.bearerToken) throw new Error('VaahStore live mode: VAHSTORE_BEARER_TOKEN is empty');

  const route = LIVE_ROUTES[toolName];
  const path = fillPath(route.path, args);
  const qs = route.method === 'GET' ? buildQueryString(args, env.storeId) : '';
  const url = `${env.baseUrl}${path}${qs ? `?${qs}` : ''}`;

  const init: RequestInit = {
    method: route.method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${env.bearerToken}`,
    },
  };
  if (route.method === 'POST') {
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
    init.body = JSON.stringify(stripPathKeys(args));
  }

  const res = await fetch(url, init);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    // EJG-ADAPT-3: the upstream response body is upstream-controlled
    // and may include the bearer in an echoed URL — scrub before throw.
    throw new Error(`VaahStore ${toolName} HTTP ${res.status}: ${scrub(detail) || res.statusText}`);
  }
  return res.json().catch(() => ({}));
}

/** Strip out URL-template keys ({id}, {cart_uuid}, …) before sending
 *  the body — they're only meaningful in the path template. */
function stripPathKeys(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (LIVE_ROUTES_PATH_KEYS.has(k)) continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

const LIVE_ROUTES_PATH_KEYS = new Set<string>([
  'id', 'cart_uuid', 'order_id', 'customer_id',
]);

// ---------------------------------------------------------------------------
// Trust-boundary wrapper — F14-AC2 (TypeBox) + F14-AC1 (proto) — surfaces
// -32003 props_invalid before any HTTP request (EJG-ADAPT-2).
// ---------------------------------------------------------------------------

/**
 * Wrap a tool handler with F14 trust-boundary validation.
 *
 * Two phases run before the handler:
 *   1. `stripProtoKeys(input)` (F14-AC1) — sanitise prototype keys.
 *   2. `validateToolInput(schema, sanitized)` (F14-AC2) — surface any
 *      validation errors as `-32003 props_invalid` with field details.
 *
 * Unlike the CLI-side `wrapWithValidation` in `tool-registry.ts`, this
 * wrapper applies the TypeBox schema path (used everywhere outside the
 * MCP surface). The MCP-side `wrapWithValidation` only does the proto
 * strip because the @modelcontextprotocol/sdk already enforces Zod at
 * the boundary.
 *
 * The `scrub` closure threads EJG-ADAPT-3 through the wrapper so any
 * `props_invalid` detail that names a field path AND any thrown
 * message gets the bearer redacted before it bubbles out.
 *
 * @param schema   — TypeBox schema for the input shape
 * @param handler  — the tool handler; receives a sanitized, validated payload
 * @param scrub    — instance-bound bearer scrubber (EJG-ADAPT-3)
 * @returns wrapped handler that returns a `VaahstoreToolResult` envelope
 */
export function wrapWithToolSchema<I extends Record<string, unknown>>(
  schema: TSchema,
  scrub: (s: string) => string,
  handler: (input: I) => Promise<unknown>,
): (input: I) => Promise<VaahstoreToolResult> {
  return async (input: I) => {
    const sanitized = stripProtoKeys(input) as I;
    const verdict = validateToolInput(schema, sanitized);
    if (!verdict.valid) {
      const detail = verdict.errors.map(scrub).join('; ');
      return {
        content: [{ type: 'text', text: `[${verdict.code}] ${verdict.message}: ${detail}` }],
        isError: true,
        errorCode: verdict.code,
        errorMessage: verdict.message,
      };
    }
    try {
      const body = await handler(sanitized);
      return {
        content: [{ type: 'text', text: JSON.stringify(body) }],
        isError: false,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // EJG-ADAPT-3: scrub every error message before it bubbles.
      return {
        content: [{ type: 'text', text: scrub(msg) }],
        isError: true,
        errorCode: -32010, // internal
        errorMessage: scrub(msg),
      };
    }
  };
}

// ---------------------------------------------------------------------------
// The adapter itself
// ---------------------------------------------------------------------------

/** Tool handler shape — one entry per tool name. */
type ToolHandlers = {
  readonly [K in VaahstoreToolName]: (input: Record<string, unknown>) => Promise<VaahstoreToolResult>;
};

/**
 * The VaahStore provider adapter.
 *
 * Mirrors the `ClaudeCodeAdaptor` interface so the chat-handler's
 * provider lookup keeps a single shape, but adds:
 *
 *   - `callTool(name, args)` — the HTTP-facing entry point used by
 *     the MCP `tools/call` path. Routes to one of 12 wrapped handlers.
 *   - `liveMode()` — convenience flag for the playground UI.
 *   - `scrubWithToken(input)` — instance-bound bearer scrubber so
 *     the regulator pattern stays instance-scoped (EJG-ADAPT-3).
 */
export class VaahstoreProviderAdaptor implements ProviderAdaptor {
  public readonly id = 'vaahstore';
  public readonly label = 'VaahStore';

  /** Module-private env. Captured here so tests can construct without
   *  mutating `process.env`. */
  private readonly env: VaahstoreEnv;

  /** Per-instance bearer scrubber. Tokens never leak across instances. */
  private readonly scrub: (s: string) => string;

  /** Per-tool handlers, each already wrapped with `wrapWithToolSchema`. */
  private readonly handlers: ToolHandlers;

  constructor(env: VaahstoreEnv) {
    this.env = env;
    this.scrub = makeBearerScrubber(env.bearerToken);
    this.handlers = buildAllHandlers(env, this.scrub, this.liveMode());
  }

  /**
   * Scrub the active bearer out of any input. Public so the chat
   * handler can route its own log output through the adapter's
   * regex (EJG-ADAPT-3); tests can also assert directly.
   */
  scrubWithToken(input: unknown): unknown {
    if (typeof input !== 'string') return input;
    return this.scrub(input);
  }

  /**
   * Honor the runtime switch — `VITE_VAAHSTORE_LIVE` is read off
   * `process.env` at construction (the chat handler does not flip
   * this for an already-built adapter; restart the server to switch).
   *
   * @see EJG-ADAPT-1
   */
  liveMode(): boolean {
    return process.env[VAAHSTORE_ENV.liveSwitch] === '1';
  }

  // ----- ProviderAdaptor (CLI-shaped — unused but kept for shape parity) -----

  resolveBinary(_config: ProviderConfig): string {
    return ''; // VaahStore is HTTP, not CLI
  }

  buildArgs(_opts: { readonly resumeId: string | null }): string[] {
    return [];
  }

  parseLine(_line: string): ParsedLine {
    return { kind: 'drop' };
  }

  // ----- VaahStore-only extension -----

  /**
   * Invoke one of the 12 tools by name. The chat handler routes MCP
   * `tools/call` requests here. Returns the same envelope shape as
   * MCP `CallToolResult` so the chat-panel renders it unchanged.
   *
   * Unknown tool names return a `-32601 method_not_found`-shaped error
   * envelope (we use `-32010 internal` since the JSON-RPC code is
   * clamped to our GenicUI range).
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<VaahstoreToolResult> {
    const handler = (this.handlers as Record<string, ((i: Record<string, unknown>) => Promise<VaahstoreToolResult>) | undefined>)[name];
    if (!handler) {
      return {
        content: [{ type: 'text', text: `unknown tool: ${name}` }],
        isError: true,
        errorCode: -32010,
        errorMessage: 'unknown_tool',
      };
    }
    return handler(args);
  }

  /**
   * Expose the schemas map so the chat-handler can dump them in
   * `/api/providers/:id` introspection responses (matches the
   * `ProviderWirePayload` contract from F76 docs).
   */
  schemas(): Readonly<Record<VaahstoreToolName, TSchema>> {
    return VAAHSTORE_TOOL_SCHEMAS;
  }

  /**
   * Down-cast the VaahStore shape so the chat-handler's typed
   * `ChatEvent` dispatch can re-broadcast `tool_result` frames without
   * us re-implementing the framing. Returns a `tool_result` event.
   */
  asToolResultEvent(name: string, result: VaahstoreToolResult): ChatEvent {
    return {
      type: 'tool_result',
      data: {
        id: '',
        name,
        result: result.isError
          ? `[${result.errorCode ?? -32010}] ${result.errorMessage ?? ''}`
          : result.content[0]?.text ?? '',
      },
    };
  }
}

// ---------------------------------------------------------------------------
// 12 handlers — each routes through `wrapWithToolSchema`
// ---------------------------------------------------------------------------

/**
 * A no-op handler used in fixture mode: every tool just loads its
 * JSON file and returns the parsed body. In live mode the same
 * dispatch goes through `liveCall()`.
 *
 * Per EJG-ADAPT-1 the choice is `liveMode() ? live : fixture` at
 * call time — flipping the env var and restarting the server swaps
 * modes without code changes.
 */
function buildAllHandlers(env: VaahstoreEnv, scrub: (s: string) => string, liveMode: boolean): ToolHandlers {
  const make = <K extends VaahstoreToolName>(name: K) =>
    wrapWithToolSchema(
      VAAHSTORE_TOOL_SCHEMAS[name],
      scrub,
      async (args: Record<string, unknown>) => {
        if (liveMode) return liveCall(env, name, args, scrub);
        return loadFixture(name);
      },
    );

  return {
    list_products: make('list_products'),
    get_product: make('get_product'),
    get_variations: make('get_variations'),
    check_stock: make('check_stock'),
    create_cart: make('create_cart'),
    add_to_cart: make('add_to_cart'),
    list_shipping: make('list_shipping'),
    list_payment_methods: make('list_payment_methods'),
    create_order: make('create_order'),
    create_address: make('create_address'),
    track_order: make('track_order'),
    claim_order: make('claim_order'),
  } as ToolHandlers;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Build a singleton `VaahstoreProviderAdaptor`. The chat-handler calls
 * this once on first use of the `vaahstore` provider id; the registry
 * `getProviderAdaptor()` caches it for the process lifetime.
 *
 * @param envSource — defaults to `process.env`; tests pass a synthetic
 *                   object to avoid mutating the real env.
 */
export function createVaahstoreProvider(
  envSource: NodeJS.ProcessEnv = process.env,
): VaahstoreProviderAdaptor {
  return new VaahstoreProviderAdaptor(readVaahstoreEnv(envSource));
}
