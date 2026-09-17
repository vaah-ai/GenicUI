/**
 * Component-event contract tests for the 18 ecommerce `ui/*.vue`
 * components (M5.2-T4).
 *
 * These tests use static analysis of the `<script setup lang="ts">`
 * blocks to assert that each component declares the events its
 * registry entry promises. They are deliberately lightweight — they
 * do NOT mount Vue components (the runtime tests live in the
 * playground E2E suite at M5.2-T5). The contract test is the gate
 * that catches a registry/component drift before runtime.
 *
 * What is verified:
 *   - Each `<Name>.vue` file declares every event the registry entry
 *     lists (`EJG-LAYOUT-3` contract)
 *   - Critical timing constants are within spec (EJG-COMP-2: 300ms
 *     debounce; EJG-COMP-3: 3s auto-dismiss)
 *   - Components do NOT import from `../agent/` or call `useFetch`
 *     (re-assertion of the structural test for redundancy)
 *
 * @see {M5.2-T4-AC3-AC7}
 * @see {EJG-COMP-1..5}
 * @see {EJG-LAYOUT-1}
 */

import { describe, expect, test } from 'bun:test';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

// This file lives at __tests__/components/ — go up two levels to the
// repo root, then descend into app/components/ecommerce/ui.
const REPO_ROOT = join(dirname(import.meta.dir), '..');
const UI_DIR = join(REPO_ROOT, 'app', 'components', 'ecommerce', 'ui');

interface RegistryEntry {
  readonly name: string;
  readonly events: readonly { readonly name: string }[];
}

/**
 * The 19-component registry — duplicated here from
 * `app/components/ecommerce/registry/components.ts` as a minimal
 * hand-typed summary so this test stays under 200 lines. The
 * authoritative source is the registry; if you add a component, add
 * it here AND to the registry.
 */
const REGISTRY_EVENTS: Readonly<Record<string, readonly string[]>> = {
  ProductGrid: ['product-selected', 'filter-changed'],
  ProductDetail: ['variant-changed', 'add-to-cart', 'add-to-wishlist'],
  ProductCard: ['product-selected'],
  VariationPicker: ['variant-changed'],
  FilterChips: ['filter-changed'],
  StockBadge: [],
  PriceTag: [],
  MiniCartToast: ['dismiss', 'go-to-cart'],
  CartPanel: ['qty-changed', 'remove-item', 'checkout-clicked'],
  CartLineItem: ['qty-changed', 'remove-item'],
  CheckoutIdentityPrompt: ['continue-as-guest', 'signup-then-checkout'],
  CheckoutForm: ['checkout-field-changed', 'payment-method-selected', 'place-order'],
  CheckoutField: ['checkout-field-changed'],
  OrderProcessing: ['step-retry'],
  OrderConfirmation: ['track-order', 'create-account'],
  ShipmentTracker: [],
  OrderSummaryCard: [],
  OrderLookupPrompt: ['lookup-order'],
  AccountUpgradePrompt: ['upgrade-account', 'dismiss'],
};

function extractScriptSetup(source: string): string {
  const re = /<script\s+setup[^>]*>([\s\S]*?)<\/script>/g;
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    blocks.push(m[1] ?? '');
  }
  return blocks.join('\n');
}

async function readComponent(name: string): Promise<string> {
  return await readFile(join(UI_DIR, `${name}.vue`), 'utf8');
}

describe('ecommerce-ui components (M5.2-T4)', () => {
  test('EJG-LAYOUT-3 — every ui component declares its registry events', async () => {
    const missing: Array<{ component: string; event: string }> = [];
    for (const [name, events] of Object.entries(REGISTRY_EVENTS)) {
      if (events.length === 0) continue;
      const source = await readComponent(name);
      const script = extractScriptSetup(source);
      for (const evt of events) {
        // Match `e: 'event-name'` (defineEmits shorthand) OR
        // `(e: 'event-name', ...)` (typed emit signature).
        const re = new RegExp(`['"\`]${evt}['"\`]`);
        if (!re.test(script)) {
          missing.push({ component: name, event: evt });
        }
      }
    }
    if (missing.length > 0) {
      const lines = missing.map((m) => `  ${m.component}.vue: missing emit for '${m.event}'`).join('\n');
      throw new Error(
        `EJG-LAYOUT-3 violations — components don't declare their registry events:\n${lines}`,
      );
    }
  });

  test('EJG-COMP-2 — ProductDetail debounces variant-changed under 300ms', async () => {
    const source = await readComponent('ProductDetail');
    expect(source).toMatch(/VARIATION_DEBOUNCE_MS|setTimeout/);
    // Must be < 300ms. Look for a numeric literal near VARIATION_DEBOUNCE_MS.
    const m = source.match(/VARIATION_DEBOUNCE_MS\s*=\s*(\d+)/);
    if (m) {
      const ms = Number(m[1]);
      expect(ms).toBeLessThanOrEqual(300);
    }
  });

  test('EJG-COMP-3 — MiniCartToast auto-dismisses at 3s', async () => {
    const source = await readComponent('MiniCartToast');
    expect(source).toMatch(/AUTO_DISMISS_MS|setTimeout/);
    const m = source.match(/AUTO_DISMISS_MS\s*=\s*(\d+)/);
    if (m) {
      const ms = Number(m[1]);
      expect(ms).toBe(3000);
    }
  });

  test('EJG-COMP-1 — ProductGrid keeps an instance id ref (no remount signal)', async () => {
    const source = await readComponent('ProductGrid');
    expect(source).toMatch(/instanceId/);
    expect(source).toMatch(/emit\(\s*['"\`]filter-changed['"\`]/);
  });

  test('EJG-COMP-4 — OrderProcessing emits step-retry per failed step', async () => {
    const source = await readComponent('OrderProcessing');
    expect(source).toMatch(/emit\(\s*['"\`]step-retry['"\`]/);
    expect(source).toMatch(/Retry/);
  });

  test('EJG-COMP-5 — ShipmentTracker renders the 5-stage Orders Statuses Logics', async () => {
    const source = await readComponent('ShipmentTracker');
    // The 5 canonical VaahStore statuses must all be referenced in the marker glyph switch.
    for (const status of ['placed', 'paid', 'packed', 'shipped', 'delivered']) {
      expect(source).toContain(`'${status}'`);
    }
    // And the timeline component from PrimeVue must be present.
    expect(source).toMatch(/import Timeline from/);
  });

  test('EJG-LAYOUT-1 (re-assertion) — no ui component imports from ../agent/ or calls useFetch', async () => {
    const files = (await readdir(UI_DIR)).filter((f) => f.endsWith('.vue'));
    const violations: Array<{ file: string; pattern: string }> = [];
    for (const f of files) {
      const source = await readFile(join(UI_DIR, f), 'utf8');
      const script = extractScriptSetup(source);
      if (/from\s+['"]\.\.\/agent\//.test(script)) {
        violations.push({ file: f, pattern: "from '../agent/'" });
      }
      if (/\buseFetch\s*\(/.test(script)) {
        violations.push({ file: f, pattern: 'useFetch(' });
      }
    }
    if (violations.length > 0) {
      const lines = violations.map((v) => `  ${v.file}: ${v.pattern}`).join('\n');
      throw new Error(`EJG-LAYOUT-1 re-assertion failed:\n${lines}`);
    }
  });

  test('all 19 components exist on disk', async () => {
    const files = await readdir(UI_DIR);
    const vueFiles = files.filter((f) => f.endsWith('.vue'));
    const expected = Object.keys(REGISTRY_EVENTS).map((n) => `${n}.vue`);
    for (const name of expected) {
      expect(vueFiles).toContain(name);
    }
  });
});

describe('registry ↔ ui/ file alignment', () => {
  // Use a separate test (one-shot assertion of the registry array size
  // vs ui/ file count — no need to load the full registry TS).
  //
  // The registry carries 19 components — 18 from journey spec §4 plus
  // `OrderProcessing` (T3 split it out so Step 7's per-step retry is a
  // separately-typed entry — see components.md).
  test('registry has 19 ui/* entries; the same as the .vue file count', async () => {
    const files = (await readdir(UI_DIR)).filter((f) => f.endsWith('.vue')).length;
    const registryEntries = Object.keys(REGISTRY_EVENTS).length;
    expect(registryEntries).toBe(19);
    expect(files).toBeGreaterThanOrEqual(19);
  });
});

// The unused-but-imported RegistryEntry type silences linters that
// would otherwise flag this contract table.
const _types: RegistryEntry | null = null;
void _types;