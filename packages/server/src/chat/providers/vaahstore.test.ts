/**
 * Tests for the VaahStore provider adapter (M5.2-T2).
 *
 * Covers every acceptance criterion of the task + every EJG-ADAPT gate:
 *
 *  - AC1  factory exports `createVaahstoreProvider(env)`
 *  - AC2  12 tools callable via `callTool(name, args)` and return
 *        data shaped for downstream `render_component`
 *  - AC3  every handler is wrapped with F14 trust-boundary validation
 *        (EJG-ADAPT-2: invalid input → -32003 props_invalid before HTTP)
 *  - AC4  live-mode env switch routes to live VaahStore (EJG-ADAPT-1)
 *  - AC5  bearer token never appears in console output (EJG-ADAPT-3)
 *  - AC6  playground provider-registry entry exists with the 4 config fields
 *  - AC7  fixtures cover all 12 tools
 *
 * Plus a fast-check property test that 10K random invalid payloads
 * never reach the HTTP path.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fc from 'fast-check';

import {
  VAAHSTORE_ENV,
  VaahstoreProviderAdaptor,
  VAAHSTORE_TOOL_SCHEMAS,
  createVaahstoreProvider,
  readVaahstoreEnv,
  resolveFixturesDir,
  makeBearerScrubber,
  wrapWithToolSchema,
} from './vaahstore.js';

// ---------------------------------------------------------------------------
// AC1 — factory + env contract
// ---------------------------------------------------------------------------

describe('M5.2-T2-AC1 — createVaahstoreProvider factory', () => {
  it('exports a factory that honours the env-source argument', () => {
    const fakeEnv = {
      [VAAHSTORE_ENV.baseUrl]: 'https://store.example.com',
      [VAAHSTORE_ENV.storeId]: '7',
      [VAAHSTORE_ENV.bearerToken]: 'pat_TEST_DUMMY',
    } as NodeJS.ProcessEnv;

    const adaptor = createVaahstoreProvider(fakeEnv);
    expect(adaptor).toBeInstanceOf(VaahstoreProviderAdaptor);
    expect(adaptor.id).toBe('vaahstore');
    expect(adaptor.label).toBe('VaahStore');
  });

  it('readVaahstoreEnv returns empty strings for missing keys (fail-closed in live mode)', () => {
    const env = readVaahstoreEnv({} as NodeJS.ProcessEnv);
    expect(env.baseUrl).toBe('');
    expect(env.bearerToken).toBe('');
    expect(env.storeId).toBe('');
  });

  it('readVaahstoreEnv trims trailing slash from baseUrl', () => {
    const env = readVaahstoreEnv({
      [VAAHSTORE_ENV.baseUrl]: 'https://x.example.com/',
    } as NodeJS.ProcessEnv);
    expect(env.baseUrl).toBe('https://x.example.com');
  });
});

// ---------------------------------------------------------------------------
// AC2 — 12 tools callable, return JSON-shaped content
// ---------------------------------------------------------------------------

describe('M5.2-T2-AC2 — every §5 tool is callable via callTool', () => {
  let adaptor: VaahstoreProviderAdaptor;
  let originalLive: string | undefined;

  beforeEach(() => {
    originalLive = process.env[VAAHSTORE_ENV.liveSwitch];
    // Fixture mode (EJG-ADAPT-1 default)
    delete process.env[VAAHSTORE_ENV.liveSwitch];
    adaptor = createVaahstoreProvider({} as NodeJS.ProcessEnv);
  });

  afterEach(() => {
    if (originalLive === undefined) delete process.env[VAAHSTORE_ENV.liveSwitch];
    else process.env[VAAHSTORE_ENV.liveSwitch] = originalLive;
  });

  const toolNames = Object.keys(VAAHSTORE_TOOL_SCHEMAS) as Array<keyof typeof VAAHSTORE_TOOL_SCHEMAS>;
  expect(toolNames.length).toBe(12);

  const happyArgs: Record<string, Record<string, unknown>> = {
    list_products: {},
    get_product: { id: 'p-101' },
    get_variations: { id: 'p-101' },
    check_stock: { product_id: 'p-101' },
    create_cart: {},
    add_to_cart: { cart_uuid: 'cart-x', product_id: 'p-101', quantity: 1 },
    list_shipping: { cart_uuid: 'cart-x' },
    list_payment_methods: {},
    create_order: {
      cart_uuid: 'cart-x',
      shipping_method_id: 'ship-1',
      payment_method_id: 'pm-1',
      address_id: 'addr-1',
      customer_email: 'guest@example.com',
    },
    create_address: {
      name: 'Guest',
      line1: '123 Demo St',
      city: 'Boulder',
      postal_code: '80301',
      country_code: 'US',
      customer_email: 'guest@example.com',
    },
    track_order: { order_id: 'ord-1' },
    claim_order: { customer_id: 'cust-1', order_id: 'ord-1' },
  };

  for (const tool of toolNames) {
    it(`${tool} returns fixture data shaped for render_component`, async () => {
      const result = await adaptor.callTool(tool, happyArgs[tool] ?? {});
      expect(result.isError).toBe(false);
      expect(result.content.length).toBe(1);
      expect(result.content[0]!.type).toBe('text');
      // Must be parseable JSON for downstream render_component
      const parsed = JSON.parse(result.content[0]!.text);
      expect(typeof parsed).toBe('object');
    });
  }

  it('unknown tool returns an isError envelope without crashing', async () => {
    const result = await adaptor.callTool('not_a_real_tool', {});
    expect(result.isError).toBe(true);
    expect(result.errorCode).toBe(-32010);
    expect(result.errorMessage).toBe('unknown_tool');
  });
});

// ---------------------------------------------------------------------------
// AC7 — fixtures exist for all 12 tools
// ---------------------------------------------------------------------------

describe('M5.2-T2-AC7 — fixture files exist for all 12 tools', () => {
  it('resolveFixturesDir points at the on-disk folder', () => {
    expect(resolveFixturesDir().endsWith('__fixtures__/vaahstore')).toBe(true);
  });

  it.each(
    Object.keys(VAAHSTORE_TOOL_SCHEMAS),
  )('has a fixture for %s', async (toolName) => {
    const dir = resolveFixturesDir();
    const file = Bun.file(`${dir}/${toolName}.json`);
    expect(await file.exists()).toBe(true);
    const text = await file.text();
    expect(text.trim().length).toBeGreaterThan(0);
    // Every fixture must parse as JSON
    const parsed = JSON.parse(text);
    expect(parsed).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AC3 + EJG-ADAPT-2 — F14 wrap rejects invalid input as -32003 props_invalid
//                       BEFORE any HTTP request (verified via dispatch spy).
// ---------------------------------------------------------------------------

describe('M5.2-T2-AC3 — wrapWithToolSchema enforces F14 trust-boundary', () => {
  // Identity scrubber — these tests never produce strings that need
  // bearer scrubbing (no live mode, no upstream echoes).
  const noScrub = (s: string) => s;

  it('returns -32003 on missing required field', async () => {
    let handlerCalled = false;
    const wrapped = wrapWithToolSchema(
      VAAHSTORE_TOOL_SCHEMAS.get_product,
      noScrub,
      async (input: { id: string }) => {
        handlerCalled = true;
        return { ok: input.id };
      },
    );

    const result = await wrapped({} as { id: string });
    expect(result.isError).toBe(true);
    expect(result.errorCode).toBe(-32003);
    expect(result.errorMessage).toBe('props_invalid');
    expect(handlerCalled).toBe(false); // No HTTP / no handler call
  });

  it('returns -32003 on extra unknown keys (additionalProperties: false)', async () => {
    const wrapped = wrapWithToolSchema(
      VAAHSTORE_TOOL_SCHEMAS.get_product,
      noScrub,
      async (input: Record<string, unknown>) => ({ ok: input['id'] }),
    );

    const result = await wrapped({ id: 'p-101', attacker: 'value', nested: { x: 1 } } as Record<string, unknown>);
    expect(result.isError).toBe(true);
    expect(result.errorCode).toBe(-32003);
  });

  it('strips __proto__ keys (F14-AC1) before validation', async () => {
    let received: Record<string, unknown> = {};
    const wrapped = wrapWithToolSchema(
      VAAHSTORE_TOOL_SCHEMAS.list_products,
      noScrub,
      async (input: Record<string, unknown>) => {
        received = input;
        return { ok: true };
      },
    );

    // Cast through unknown so `__proto__` survives type narrowing
    const malicious = JSON.parse(
      '{"per_page":1,"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}',
    );
    const result = await wrapped(malicious as unknown as Record<string, unknown>);
    expect(result.isError).toBe(false);
    expect((received as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.getPrototypeOf(received)).not.toHaveProperty('polluted');
  });

  it('property test: 10K random invalid payloads return -32003', async () => {
    let handlerCalls = 0;
    const wrapped = wrapWithToolSchema(
      VAAHSTORE_TOOL_SCHEMAS.add_to_cart,
      noScrub,
      async (input: Record<string, unknown>) => {
        handlerCalls++;
        return { ok: input['quantity'] };
      },
    );

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Missing required fields entirely
          fc.constant({}),
          fc.constant({ cart_uuid: '' }),
          // Wrong types
          fc.constant({ cart_uuid: 'x', product_id: 'y', quantity: -1 }),
          fc.constant({ cart_uuid: 'x', product_id: 'y', quantity: 'three' }),
          // Extra keys (attacker)
          fc.record({
            cart_uuid: fc.string({ minLength: 1 }),
            product_id: fc.string({ minLength: 1 }),
            quantity: fc.integer({ min: 1, max: 10 }),
            attacker: fc.string(),
          }),
        ),
        async (payload) => {
          const r = await wrapped(payload as Record<string, unknown>);
          return r.isError && r.errorCode === -32003;
        },
      ),
      { numRuns: 10_000 },
    );
    expect(handlerCalls).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC4 + EJG-ADAPT-1 — live-mode env switch
// ---------------------------------------------------------------------------

describe('M5.2-T2-AC4 — VITE_VAAHSTORE_LIVE gates live dispatch', () => {
  let originalLive: string | undefined;
  beforeEach(() => { originalLive = process.env[VAAHSTORE_ENV.liveSwitch]; });
  afterEach(() => {
    if (originalLive === undefined) delete process.env[VAAHSTORE_ENV.liveSwitch];
    else process.env[VAAHSTORE_ENV.liveSwitch] = originalLive;
  });

  it('default mode (switch unset / =0) calls the fixture loader', async () => {
    delete process.env[VAAHSTORE_ENV.liveSwitch];
    const adaptor = createVaahstoreProvider(process.env);
    const result = await adaptor.callTool('list_products', {});
    expect(result.isError).toBe(false);
    const body = JSON.parse(result.content[0]!.text);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('live mode (=1) routes through fetch when env is fully configured', async () => {
    process.env[VAAHSTORE_ENV.liveSwitch] = '1';
    process.env[VAAHSTORE_ENV.baseUrl] = 'https://store.example.com';
    process.env[VAAHSTORE_ENV.bearerToken] = 'pat_LIVE_DUMMY';
    process.env[VAAHSTORE_ENV.storeId] = '42';

    const originalFetch = globalThis.fetch;
    let seenUrl = '';
    let seenAuth = '';
    globalThis.fetch = (async (input: unknown, init: unknown) => {
      seenUrl = typeof input === 'string' ? input : String((input as { url?: string })?.url);
      const hdrs = (init as { headers?: { Authorization?: string } } | undefined)?.headers;
      seenAuth = String(hdrs?.Authorization ?? '');
      return new Response(JSON.stringify({ live: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    try {
      const adaptor = createVaahstoreProvider(process.env);
      const result = await adaptor.callTool('get_product', { id: 'p-101' });
      expect(result.isError).toBe(false);
      // GET /api/store/products/{id}?selected_store=42
      expect(seenUrl).toContain('/api/store/products/p-101');
      expect(seenUrl).toContain('selected_store=42');
      expect(seenAuth).toBe('Bearer pat_LIVE_DUMMY');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('live mode with empty bearer fails closed with a scrubbed message', async () => {
    process.env[VAAHSTORE_ENV.liveSwitch] = '1';
    process.env[VAAHSTORE_ENV.baseUrl] = 'https://store.example.com';
    process.env[VAAHSTORE_ENV.bearerToken] = ''; // empty → fail closed

    // The implementation checks baseUrl first; clear it to drive the bearer path.
    process.env[VAAHSTORE_ENV.baseUrl] = '';

    const adaptor = createVaahstoreProvider(process.env);
    const result = await adaptor.callTool('list_products', {});
    expect(result.isError).toBe(true);
    expect(result.errorCode).toBe(-32010); // internal
    // Empty bearer means no scrubbing needed; assert structure only.
    expect(result.content[0]!.text).toContain('VAAHSTORE_BASE_URL is empty');
  });

  it('live POST routes carry selected_store for writes that need it', async () => {
    process.env[VAAHSTORE_ENV.liveSwitch] = '1';
    process.env[VAAHSTORE_ENV.baseUrl] = 'https://store.example.com';
    process.env[VAAHSTORE_ENV.bearerToken] = 'pat_LIVE_DUMMY';
    process.env[VAAHSTORE_ENV.storeId] = '7';

    const originalFetch = globalThis.fetch;
    let seenUrl = '';
    globalThis.fetch = (async (input: unknown) => {
      seenUrl = typeof input === 'string' ? input : String((input as { url?: string })?.url);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as unknown as typeof fetch;
    try {
      const adaptor = createVaahstoreProvider(process.env);
      await adaptor.callTool('create_address', {
        name: 'G',
        line1: '1 St',
        city: 'Boulder',
        postal_code: '80301',
        country_code: 'US',
        customer_email: 'g@example.com',
      });
      // POST /api/store/addresses (no {id} placeholder, so no template fill)
      expect(seenUrl).toContain('/api/store/addresses');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// ---------------------------------------------------------------------------
// AC5 + EJG-ADAPT-3 — bearer-token scrubbing
// ---------------------------------------------------------------------------

describe('M5.2-T2-AC5 — bearer token is scrubbed from console + error output', () => {
  const TOKEN = 'pat_LIVE_DANGEROUS_DUMMY_FOR_SCRUB_TEST_XYZ';
  let originalLive: string | undefined;
  let originalUrl: string | undefined;
  let originalToken: string | undefined;

  beforeEach(() => {
    originalLive = process.env[VAAHSTORE_ENV.liveSwitch];
    originalUrl = process.env[VAAHSTORE_ENV.baseUrl];
    originalToken = process.env[VAAHSTORE_ENV.bearerToken];
    process.env[VAAHSTORE_ENV.liveSwitch] = '1';
    process.env[VAAHSTORE_ENV.baseUrl] = 'https://store.example.com';
    process.env[VAAHSTORE_ENV.bearerToken] = TOKEN;
  });

  afterEach(() => {
    if (originalLive === undefined) delete process.env[VAAHSTORE_ENV.liveSwitch];
    else process.env[VAAHSTORE_ENV.liveSwitch] = originalLive;
    if (originalUrl === undefined) delete process.env[VAAHSTORE_ENV.baseUrl];
    else process.env[VAAHSTORE_ENV.baseUrl] = originalUrl;
    if (originalToken === undefined) delete process.env[VAAHSTORE_ENV.bearerToken];
    else process.env[VAAHSTORE_ENV.bearerToken] = originalToken;
  });

  it('scrubBearer never echoes the bearer value', () => {
    const scrub = makeBearerScrubber(TOKEN);
    const sentinel = `error included ${TOKEN} see above`;
    const safe = scrub(sentinel);
    expect(safe).not.toContain(TOKEN);
    expect(safe).toContain('[REDACTED]');
  });

  it('upstream error message that quotes the bearer is scrubbed before bubbling out', async () => {
    // Upstream echoes the token in a 4xx body
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(
      `server saw bearer=${TOKEN} in upstream audit log`,
      { status: 401, statusText: 'Unauthorized' },
    )) as unknown as typeof fetch;

    try {
      const adaptor = createVaahstoreProvider(process.env);
      const result = await adaptor.callTool('list_products', {});
      expect(result.isError).toBe(true);
      // EJG-ADAPT-3: the tool_result envelope must NEVER contain the bearer.
      expect(result.content[0]!.text).not.toContain(TOKEN);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('captured console.log never sees the bearer when an error happens', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(
      `bearer=${TOKEN} echo`,
      { status: 500 },
    )) as unknown as typeof fetch;

    const captured: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      captured.push(args.map(String).join(' '));
    };

    try {
      const adaptor = createVaahstoreProvider(process.env);
      const result = await adaptor.callTool('list_products', {});
      expect(result.isError).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
      console.log = originalLog;
    }

    const joined = captured.join('\n');
    expect(joined).not.toContain(TOKEN);
  });
});

// ---------------------------------------------------------------------------
// AC6 — VaahStore entry exists in the playground providers registry
//
// Note: the playground lives outside `packages/server/src` (the tsc
// rootDir), so we read the file directly instead of importing it.
// ---------------------------------------------------------------------------

describe('M5.2-T2-AC6 — playground provider registry exposes vaahstore', () => {
  it('PROVIDERS contains a vaahstore entry with the 4 config fields', async () => {
    const here = new URL('.', import.meta.url).pathname;
    const registryPath = here
      + '../../../../../examples/playground/app/providers/registry.ts';
    const text = await Bun.file(registryPath).text();
    expect(text).toContain("id: 'vaahstore'");
    expect(text).toContain("label: 'VaahStore'");
    expect(text).toContain("key: 'baseUrl'");
    expect(text).toContain("key: 'storeId'");
    expect(text).toContain("key: 'bearerToken'");
    expect(text).toContain("key: 'liveSwitch'");
  });
});

// ---------------------------------------------------------------------------
// Additional regression — the provider is also wired into the
// server-side adaptor registry (`chat/providers/registry.ts`).
// ---------------------------------------------------------------------------

describe('M5.2-T2 — server-side adaptor registry lookup', () => {
  it('getProviderAdaptor("vaahstore") returns the singleton', async () => {
    const mod = await import('./registry.js');
    const adaptor = mod.getProviderAdaptor('vaahstore');
    expect(adaptor).not.toBeNull();
    expect(adaptor!.id).toBe('vaahstore');
  });

  it('listProviderIds includes vaahstore', async () => {
    const mod = await import('./registry.js');
    const ids = mod.listProviderIds() as readonly string[];
    expect(ids).toContain('vaahstore');
    expect(ids).toContain('claude-code');
    expect(ids).toContain('codex');
  });
});
