<template>
  <div class="cart-line-item" :data-component="CartLineItem" :data-line-id="lineId" data-test="cart-line-item">
    <div class="cart-line-item-info">
      <div class="cart-line-item-title">{{ title }}</div>
      <div v-if="subtitle" class="cart-line-item-subtitle">{{ subtitle }}</div>
      <PriceTag :amount="lineAmount" :currency="lineCurrency" />
    </div>

    <div class="cart-line-item-controls">
      <InputNumber
        :model-value="quantity"
        :min="1"
        :max="maxQuantity"
        show-buttons
        button-layout="horizontal"
        decrement-button-class="cart-line-item-qty-btn"
        increment-button-class="cart-line-item-qty-btn"
        increment-button-icon="pi pi-plus"
        decrement-button-icon="pi pi-minus"
        input-class="cart-line-item-qty-input"
        class="cart-line-item-qty"
        :data-test="`cart-line-item-qty-${lineId}`"
        @update:model-value="onQty"
      />
      <Button
        icon="pi pi-trash"
        severity="danger"
        text
        rounded
        :aria-label="`Remove ${title}`"
        :data-test="`cart-line-item-remove-${lineId}`"
        @click="onRemove"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * CartLineItem — extracted reusable row for CartPanel + OrderSummaryCard.
 *
 * Pure props-in component. Emits `qty-changed` (with quantity) and
 * `remove-item` (with line id).
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import { computed } from 'vue';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import PriceTag from './PriceTag.vue';

interface LineItem {
  id: string;
  title: string;
  subtitle?: string;
  quantity: number;
  unit_amount?: number;
  line_amount?: number;
  currency_code?: string;
  max_quantity?: number;
}

interface Props {
  item: LineItem;
}

const props = defineProps<Props>();

const CartLineItem = 'CartLineItem';

const emit = defineEmits<{
  (e: 'qty-changed', payload: { id: string; quantity: number }): void;
  (e: 'remove-item', payload: { id: string }): void;
}>();

const lineId = computed<string>(() => String(props.item.id));
const title = computed<string>(() => String(props.item.title ?? ''));
const subtitle = computed<string>(() => String(props.item.subtitle ?? ''));
const quantity = computed<number>(() => Math.max(1, Math.floor(Number(props.item.quantity ?? 1))));
const lineAmount = computed<number>(() => Number(props.item.line_amount ?? props.item.unit_amount ?? 0));
const lineCurrency = computed<string>(() => String(props.item.currency_code ?? 'USD'));
const maxQuantity = computed<number>(() => {
  const raw = Number(props.item.max_quantity ?? 99);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 99;
});

function onQty(value: number | undefined): void {
  const next = value === undefined ? quantity.value : Math.max(1, Math.floor(value));
  emit('qty-changed', { id: lineId.value, quantity: next });
}

function onRemove(): void {
  emit('remove-item', { id: lineId.value });
}
</script>

<style scoped>
.cart-line-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--gp-border);
}

.cart-line-item:last-child {
  border-bottom: none;
}

.cart-line-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cart-line-item-title {
  font-weight: 500;
  color: var(--gp-text);
}

.cart-line-item-subtitle {
  font-size: 0.8125rem;
  color: var(--gp-text-muted);
}

.cart-line-item-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cart-line-item-qty {
  width: 120px;
}

.cart-line-item-qty-btn,
.cart-line-item-qty-input {
  font-size: 0.875rem;
}
</style>