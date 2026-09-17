<template>
  <button
    type="button"
    class="product-card"
    :data-component="ProductCard"
    :data-product-id="productId"
    data-test="product-card"
    @click="onSelect"
  >
    <div class="product-card-media">
      <span class="product-card-media-placeholder" aria-hidden="true">
        {{ initials }}
      </span>
    </div>

    <div class="product-card-body">
      <div class="product-card-title">{{ title }}</div>
      <Tag v-if="brand" :value="brand" severity="secondary" class="product-card-brand" />
      <PriceTag :amount="priceAmount" :currency="priceCurrency" :compare-at="compareAt" />
      <StockBadge :count="stock" />
    </div>
  </button>
</template>

<script setup lang="ts">
/**
 * ProductCard — extracted reusable product row.
 *
 * Used by ProductGrid (one row per item), OrderSummaryCard (line items),
 * and wishlist (future). Pure props-in — emits `product-selected` with
 * the product id when the card is clicked.
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import { computed } from 'vue';
import Tag from 'primevue/tag';
import PriceTag from './PriceTag.vue';
import StockBadge from './StockBadge.vue';

interface ProductCardProduct {
  id: string;
  title: string;
  brand?: string;
  price?: { amount?: number; currency_code?: string };
  stock?: number;
  compare_at?: number | null;
  image_url?: string;
}

interface Props {
  /** Product record — only `id`, `title`, `brand`, `price`, `stock`, `compare_at` are read. */
  product: ProductCardProduct;
}

const props = defineProps<Props>();

const ProductCard = 'ProductCard';

const emit = defineEmits<{
  (e: 'product-selected', payload: { id: string }): void;
}>();

const productId = computed<string>(() => String(props.product.id));
const title = computed<string>(() => String(props.product.title ?? ''));
const brand = computed<string>(() => String(props.product.brand ?? ''));
const priceAmount = computed<number>(() => Number(props.product.price?.amount ?? 0));
const priceCurrency = computed<string>(() => String(props.product.price?.currency_code ?? 'USD'));
const stock = computed<number>(() => {
  const raw = Number(props.product.stock ?? 0);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
});
const compareAt = computed<number | null>(() => {
  const raw = props.product.compare_at;
  if (raw === undefined || raw === null) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
});

const initials = computed<string>(() => {
  const parts = title.value.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + second).toUpperCase() || '·';
});

function onSelect(): void {
  emit('product-selected', { id: productId.value });
}
</script>

<style scoped>
.product-card {
  appearance: none;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius-md, 8px);
  background: var(--gp-surface);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  font: inherit;
}

.product-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.product-card:focus-visible {
  outline: 2px solid var(--gp-accent);
  outline-offset: 2px;
}

.product-card-media {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--gp-radius-sm, 4px);
  background: var(--gp-surface-hover);
  overflow: hidden;
}

.product-card-media-placeholder {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--gp-text-muted);
  letter-spacing: 0.05em;
}

.product-card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.product-card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--gp-text);
  line-height: 1.3;
}

.product-card-brand {
  align-self: flex-start;
}
</style>