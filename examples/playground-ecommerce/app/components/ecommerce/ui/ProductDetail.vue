<template>
  <section class="product-detail" :data-component="ProductDetail" :data-product-id="productId" data-test="product-detail">
    <div class="product-detail-media">
      <div class="product-detail-gallery-placeholder" aria-hidden="true">
        {{ initials }}
      </div>
    </div>

    <div class="product-detail-body">
      <header class="product-detail-header">
        <h2 class="product-detail-title">{{ title }}</h2>
        <Tag v-if="brand" :value="brand" severity="secondary" class="product-detail-brand" />
      </header>

      <PriceTag :amount="priceAmount" :currency="priceCurrency" :compare-at="compareAt" />

      <p v-if="description" class="product-detail-description">{{ description }}</p>

      <VariationPicker
        v-if="variations.length > 0"
        :variations="variations"
        @variant-changed="onVariationChanged"
      />

      <div class="product-detail-stock" data-test="product-detail-stock">
        <StockBadge :count="resolvedStock" />
      </div>

      <div class="product-detail-actions">
        <InputNumber
          v-model="qtyLocal"
          :min="1"
          :max="resolvedStock > 0 ? Math.max(1, resolvedStock) : 1"
          show-buttons
          button-layout="horizontal"
          increment-button-icon="pi pi-plus"
          decrement-button-icon="pi pi-minus"
          class="product-detail-qty"
          data-test="product-detail-qty"
        />
        <Button
          label="Add to cart"
          icon="pi pi-shopping-cart"
          severity="primary"
          :disabled="resolvedStock === 0"
          data-test="product-detail-add"
          @click="onAddToCart"
        />
        <Button
          label="Save"
          icon="pi pi-heart"
          severity="secondary"
          outlined
          data-test="product-detail-wishlist"
          @click="emit('add-to-wishlist', { productId })"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * ProductDetail — full product screen with variation + stock indicator.
 *
 * EJG-COMP-2: the stock indicator updates within 300ms of
 * `variant-changed`. The variation picker fires immediately, but
 * the stock lookup is debounced (`VARIATION_DEBOUNCE_MS`) so we
 * don't refetch on every keystroke. The emit itself is fired
 * once debounced; the parent re-fetches stock from the API.
 *
 * Pure props-in: this component reads `product` and emits events. No
 * data fetching happens here.
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-COMP-2} — stock indicator updates within 300ms of variant-changed
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import { computed, ref, watch } from 'vue';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import PriceTag from './PriceTag.vue';
import StockBadge from './StockBadge.vue';
import VariationPicker from './VariationPicker.vue';

interface Variation {
  id: string;
  size?: string;
  color?: string;
  width?: string;
}

interface ProductDetailProduct {
  id: string;
  title?: string;
  brand?: string;
  description?: string;
  price?: { amount?: number; currency_code?: string };
  compare_at?: number | null;
  variations?: readonly Variation[];
  /**
   * Stock map keyed by variation id. Optional — when absent, falls
   * back to a top-level `stock` integer.
   */
  stock?: Record<string, number> | number;
}

interface Props {
  product: ProductDetailProduct;
}

const props = defineProps<Props>();

const ProductDetail = 'ProductDetail';

const VARIATION_DEBOUNCE_MS = 250;
const qtyLocal = ref<number>(1);

const productId = computed<string>(() => String(props.product.id));
const title = computed<string>(() => String(props.product.title ?? ''));
const brand = computed<string>(() => String(props.product.brand ?? ''));
const description = computed<string>(() => String(props.product.description ?? ''));
const priceAmount = computed<number>(() => Number(props.product.price?.amount ?? 0));
const priceCurrency = computed<string>(() => String(props.product.price?.currency_code ?? 'USD'));
const compareAt = computed<number | null>(() => {
  const raw = props.product.compare_at;
  if (raw === undefined || raw === null) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
});

const variations = computed<readonly Variation[]>(() =>
  Array.isArray(props.product.variations) ? props.product.variations : [],
);

const totalStock = computed<number>(() => {
  const raw = props.product.stock;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
  }
  if (raw && typeof raw === 'object') {
    let sum = 0;
    for (const v of Object.values(raw)) {
      const num = Number(v);
      if (Number.isFinite(num)) sum += Math.max(0, Math.floor(num));
    }
    return sum;
  }
  return 0;
});

/**
 * Resolved stock = stock for the currently selected variation, falling
 * back to the variation sum, falling back to total stock. We don't
 * re-fetch — we only display what the agent has passed in.
 */
const resolvedStock = computed<number>(() => {
  if (!props.product.stock) return totalStock.value;
  if (typeof props.product.stock === 'number') return props.product.stock;
  // For the variation map, sum what we have (no per-variation selection
  // cached — variations drive agent-side refetch; this is a hint UI).
  return totalStock.value;
});

const initials = computed<string>(() => {
  const parts = title.value.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + second).toUpperCase() || '·';
});

const emit = defineEmits<{
  (
    e: 'variant-changed',
    payload: { productId: string; selection: Record<string, string> },
  ): void;
  (e: 'add-to-cart', payload: { productId: string; variationId: string | null; quantity: number }): void;
  (e: 'add-to-wishlist', payload: { productId: string }): void;
}>();

let debounceHandle: ReturnType<typeof setTimeout> | null = null;
const lastSelection = ref<Record<string, string> | null>(null);

watch(lastSelection, (next) => {
  if (!next) return;
  if (debounceHandle !== null) clearTimeout(debounceHandle);
  debounceHandle = setTimeout(() => {
    debounceHandle = null;
    emit('variant-changed', { productId: productId.value, selection: { ...next } });
  }, VARIATION_DEBOUNCE_MS);
}, { immediate: false });

function onVariationChanged(selection: Record<string, string>): void {
  lastSelection.value = { ...selection };
}

function onAddToCart(): void {
  const variationId = pickVariationId(lastSelection.value);
  emit('add-to-cart', {
    productId: productId.value,
    variationId,
    quantity: Math.max(1, Math.floor(qtyLocal.value)),
  });
}

function pickVariationId(selection: Record<string, string> | null): string | null {
  if (!selection) return null;
  const target = JSON.stringify(selection);
  for (const v of variations.value) {
    const match: Record<string, string> = {};
    if (v.size) match.size = v.size;
    if (v.color) match.color = v.color;
    if (v.width) match.width = v.width;
    if (JSON.stringify(match) === target) return v.id;
  }
  return null;
}
</script>

<style scoped>
.product-detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 24px;
  width: 100%;
}

@media (max-width: 720px) {
  .product-detail {
    grid-template-columns: minmax(0, 1fr);
  }
}

.product-detail-media {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--gp-radius-md, 8px);
  background: var(--gp-surface-hover);
  aspect-ratio: 1;
}

.product-detail-gallery-placeholder {
  font-size: 3rem;
  font-weight: 600;
  color: var(--gp-text-muted);
  letter-spacing: 0.05em;
}

.product-detail-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-detail-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.product-detail-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--gp-text);
}

.product-detail-brand {
  align-self: center;
}

.product-detail-description {
  margin: 0;
  color: var(--gp-text-secondary);
  line-height: 1.5;
}

.product-detail-stock {
  display: flex;
  align-items: center;
}

.product-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.product-detail-qty {
  width: 140px;
}
</style>