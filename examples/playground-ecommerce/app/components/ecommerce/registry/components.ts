/**
 * Workspace-local ecommerce component registry — 19 entries for the
 * VaahStore guest-shopper journey.
 *
 * Mirrors the journey spec `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md`
 * §4 file list verbatim. The entries are intentionally inline literals
 * so this file stays under the EJG-LAYOUT-2 50-line cap; per-entry
 * schemas live next to their event lists for readability.
 *
 * The 18 components land in M5.2-T4 (Vue implementations). This task
 * ships the schema + stub `.vue` files (M5.2-T3-05/06). The render path
 * reads this array via `resolve-mounted-component.ts`.
 *
 * @module playground-ecommerce/app/components/ecommerce/registry/components
 *
 * @see {M5.2-T3} — workspace registry landing
 * @see {EJG-LAYOUT-2} — this file must stay ≤ 50 executable lines
 */
import { Type } from '@sinclair/typebox';
import type { EcommerceComponentEntry } from './types.js';

const commonEvents = <T extends string>(names: readonly T[]) => names.map((n) => ({ name: n }));

export const ECOMMERCE_REGISTRY: readonly EcommerceComponentEntry[] = [
  { name: 'ProductGrid', import: () => import('../ui/ProductGrid.vue'), propsSchema: Type.Object({ rows: Type.Array(Type.Record(Type.String(), Type.Unknown())), filters: Type.Optional(Type.Record(Type.String(), Type.Unknown())) }, { additionalProperties: false }), events: commonEvents(['product-selected', 'filter-changed']), examples: [] },
  { name: 'ProductDetail', import: () => import('../ui/ProductDetail.vue'), propsSchema: Type.Object({ product: Type.Record(Type.String(), Type.Unknown()) }, { additionalProperties: false }), events: commonEvents(['variant-changed', 'add-to-cart', 'add-to-wishlist']), examples: [] },
  { name: 'ProductCard', import: () => import('../ui/ProductCard.vue'), propsSchema: Type.Object({ product: Type.Record(Type.String(), Type.Unknown()) }, { additionalProperties: false }), events: commonEvents(['product-selected']), examples: [] },
  { name: 'VariationPicker', import: () => import('../ui/VariationPicker.vue'), propsSchema: Type.Object({ variations: Type.Array(Type.Record(Type.String(), Type.Unknown())) }, { additionalProperties: false }), events: commonEvents(['variant-changed']), examples: [] },
  { name: 'FilterChips', import: () => import('../ui/FilterChips.vue'), propsSchema: Type.Object({ filters: Type.Array(Type.Record(Type.String(), Type.Unknown())) }, { additionalProperties: false }), events: commonEvents(['filter-changed']), examples: [] },
  { name: 'StockBadge', import: () => import('../ui/StockBadge.vue'), propsSchema: Type.Object({ count: Type.Integer({ minimum: 0 }) }, { additionalProperties: false }), events: [], examples: [] },
  { name: 'PriceTag', import: () => import('../ui/PriceTag.vue'), propsSchema: Type.Object({ amount: Type.Number({ minimum: 0 }), currency: Type.Optional(Type.String({ minLength: 3, maxLength: 3 })) }, { additionalProperties: false }), events: [], examples: [] },
  { name: 'MiniCartToast', import: () => import('../ui/MiniCartToast.vue'), propsSchema: Type.Object({ productName: Type.String({ minLength: 1, maxLength: 256 }) }, { additionalProperties: false }), events: commonEvents(['dismiss', 'go-to-cart']), examples: [] },
  { name: 'CartPanel', import: () => import('../ui/CartPanel.vue'), propsSchema: Type.Object({ items: Type.Array(Type.Record(Type.String(), Type.Unknown())) }, { additionalProperties: false }), events: commonEvents(['qty-changed', 'remove-item', 'checkout-clicked']), examples: [] },
  { name: 'CartLineItem', import: () => import('../ui/CartLineItem.vue'), propsSchema: Type.Object({ item: Type.Record(Type.String(), Type.Unknown()) }, { additionalProperties: false }), events: commonEvents(['qty-changed', 'remove-item']), examples: [] },
  { name: 'CheckoutIdentityPrompt', import: () => import('../ui/CheckoutIdentityPrompt.vue'), propsSchema: Type.Object({}, { additionalProperties: false }), events: commonEvents(['continue-as-guest', 'signup-then-checkout']), examples: [] },
  { name: 'CheckoutForm', import: () => import('../ui/CheckoutForm.vue'), propsSchema: Type.Object({ step: Type.Integer({ minimum: 0, maximum: 4 }), contact: Type.Optional(Type.Record(Type.String(), Type.Unknown())), shipping: Type.Optional(Type.Record(Type.String(), Type.Unknown())) }, { additionalProperties: false }), events: commonEvents(['checkout-field-changed', 'payment-method-selected', 'place-order']), examples: [] },
  { name: 'CheckoutField', import: () => import('../ui/CheckoutField.vue'), propsSchema: Type.Object({ label: Type.String({ minLength: 1, maxLength: 64 }), value: Type.String(), error: Type.Optional(Type.String({ maxLength: 256 })) }, { additionalProperties: false }), events: commonEvents(['checkout-field-changed']), examples: [] },
  { name: 'OrderProcessing', import: () => import('../ui/OrderProcessing.vue'), propsSchema: Type.Object({ steps: Type.Array(Type.Record(Type.String(), Type.Unknown())) }, { additionalProperties: false }), events: commonEvents(['step-retry']), examples: [] },
  { name: 'OrderConfirmation', import: () => import('../ui/OrderConfirmation.vue'), propsSchema: Type.Object({ order: Type.Record(Type.String(), Type.Unknown()) }, { additionalProperties: false }), events: commonEvents(['track-order', 'create-account']), examples: [] },
  { name: 'ShipmentTracker', import: () => import('../ui/ShipmentTracker.vue'), propsSchema: Type.Object({ events: Type.Array(Type.Record(Type.String(), Type.Unknown())) }, { additionalProperties: false }), events: [], examples: [] },
  { name: 'OrderSummaryCard', import: () => import('../ui/OrderSummaryCard.vue'), propsSchema: Type.Object({ order: Type.Record(Type.String(), Type.Unknown()) }, { additionalProperties: false }), events: [], examples: [] },
  { name: 'OrderLookupPrompt', import: () => import('../ui/OrderLookupPrompt.vue'), propsSchema: Type.Object({}, { additionalProperties: false }), events: commonEvents(['lookup-order']), examples: [] },
  { name: 'AccountUpgradePrompt', import: () => import('../ui/AccountUpgradePrompt.vue'), propsSchema: Type.Object({ orderId: Type.String({ minLength: 1, maxLength: 64 }) }, { additionalProperties: false }), events: commonEvents(['upgrade-account', 'dismiss']), examples: [] },
];