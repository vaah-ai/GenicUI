<template>
  <Card class="order-summary-card" :data-component="OrderSummaryCard" data-test="order-summary-card">
    <template #title>
      <span class="order-summary-card-title">Order {{ orderId }}</span>
    </template>
    <template #subtitle>
      <span class="order-summary-card-subtitle">{{ placedLabel }}</span>
    </template>

    <template #content>
      <div class="order-summary-card-lines" data-test="order-summary-card-lines">
        <CartLineItem
          v-for="line in normalizedLines"
          :key="line.id"
          :item="line"
          @qty-changed="onLineQty"
          @remove-item="onLineRemove"
        />
      </div>

      <div class="order-summary-card-totals">
        <div class="order-summary-card-row">
          <span>Subtotal</span>
          <PriceTag :amount="subtotalAmount" :currency="currency" />
        </div>
        <div v-if="shippingAmount > 0" class="order-summary-card-row">
          <span>Shipping</span>
          <PriceTag :amount="shippingAmount" :currency="currency" />
        </div>
        <div v-if="taxAmount > 0" class="order-summary-card-row">
          <span>Tax</span>
          <PriceTag :amount="taxAmount" :currency="currency" />
        </div>
        <div class="order-summary-card-row order-summary-card-row--total">
          <span>Total</span>
          <PriceTag :amount="totalAmount" :currency="currency" />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
/**
 * OrderSummaryCard — read-only summary card used by ShipmentTracker + OrderConfirmation.
 *
 * Pure props-in component. No events emitted (read-only). Renders
 * `CartLineItem` rows + a totals breakdown.
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import { computed } from 'vue';
import Card from 'primevue/card';
import PriceTag from './PriceTag.vue';
import CartLineItem from './CartLineItem.vue';

interface OrderLine {
  id: string;
  title: string;
  subtitle?: string;
  quantity: number;
  unit_amount?: number;
  line_amount?: number;
  currency_code?: string;
  max_quantity?: number;
}

interface OrderSummary {
  id: string;
  placed_at?: string;
  lines: readonly OrderLine[];
  subtotal?: number;
  shipping?: number;
  tax?: number;
  total: number;
  currency_code?: string;
}

interface Props {
  order: OrderSummary;
}

const props = defineProps<Props>();

const OrderSummaryCard = 'OrderSummaryCard';

const normalizedLines = computed<readonly OrderLine[]>(() => Array.isArray(props.order.lines) ? props.order.lines : []);

const orderId = computed<string>(() => String(props.order.id ?? ''));
const currency = computed<string>(() => String(props.order.currency_code ?? 'USD'));
const subtotalAmount = computed<number>(() => Number(props.order.subtotal ?? props.order.total ?? 0));
const shippingAmount = computed<number>(() => Number(props.order.shipping ?? 0));
const taxAmount = computed<number>(() => Number(props.order.tax ?? 0));
const totalAmount = computed<number>(() => Number(props.order.total ?? 0));

const placedLabel = computed<string>(() => {
  const iso = props.order.placed_at;
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(d);
  } catch {
    return '';
  }
});

const emit = defineEmits<{
  (e: 'qty-changed', payload: { id: string; quantity: number }): void;
  (e: 'remove-item', payload: { id: string }): void;
}>();

function onLineQty(payload: { id: string; quantity: number }): void {
  emit('qty-changed', payload);
}

function onLineRemove(payload: { id: string }): void {
  emit('remove-item', payload);
}
</script>

<style scoped>
.order-summary-card {
  width: 100%;
}

.order-summary-card-title {
  font-family: var(--gp-font-mono, ui-monospace, monospace);
  font-feature-settings: 'tnum' 1;
}

.order-summary-card-subtitle {
  font-size: 0.875rem;
  color: var(--gp-text-muted);
}

.order-summary-card-lines {
  display: flex;
  flex-direction: column;
}

.order-summary-card-totals {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--gp-border);
}

.order-summary-card-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 0.9375rem;
  color: var(--gp-text);
}

.order-summary-card-row--total {
  font-weight: 600;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--gp-border);
}
</style>