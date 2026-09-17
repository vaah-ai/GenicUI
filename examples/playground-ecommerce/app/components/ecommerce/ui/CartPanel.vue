<template>
  <Card class="cart-panel" :data-component="CartPanel" data-test="cart-panel">
    <template #title>
      <span class="cart-panel-title">Your cart</span>
    </template>
    <template #subtitle>
      <span class="cart-panel-subtitle">
        {{ normalizedItems.length }} item<span v-if="normalizedItems.length !== 1">s</span>
      </span>
    </template>

    <template #content>
      <div v-if="normalizedItems.length === 0" class="cart-panel-empty" data-test="cart-panel-empty">
        Your cart is empty. Add a product to get started.
      </div>

      <div v-else class="cart-panel-lines" data-test="cart-panel-lines">
        <CartLineItem
          v-for="item in normalizedItems"
          :key="item.id"
          :item="item"
          @qty-changed="onQty"
          @remove-item="onRemove"
        />
      </div>

      <div v-if="normalizedItems.length > 0" class="cart-panel-footer">
        <div class="cart-panel-totals">
          <span>Subtotal</span>
          <PriceTag :amount="subtotalAmount" :currency="currency" />
        </div>
        <Button
          label="Checkout"
          icon="pi pi-credit-card"
          severity="primary"
          class="cart-panel-checkout"
          data-test="cart-panel-checkout"
          @click="emit('checkout-clicked', { itemCount: normalizedItems.length })"
        />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
/**
 * CartPanel — full cart view (Step 4 Path B + Step 5 trigger).
 *
 * Pure props-in. Emits `qty-changed`, `remove-item`, `checkout-clicked`.
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import { computed } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import PriceTag from './PriceTag.vue';
import CartLineItem from './CartLineItem.vue';

interface CartItem {
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
  items: readonly CartItem[];
}

const props = defineProps<Props>();

const CartPanel = 'CartPanel';

const normalizedItems = computed<readonly CartItem[]>(() =>
  Array.isArray(props.items) ? props.items : [],
);

const currency = computed<string>(() => {
  const first = normalizedItems.value[0];
  return String(first?.currency_code ?? 'USD');
});

const subtotalAmount = computed<number>(() => {
  return normalizedItems.value.reduce((sum, item) => {
    const line = Number(item.line_amount ?? item.unit_amount ?? 0);
    return sum + (Number.isFinite(line) ? line : 0);
  }, 0);
});

const emit = defineEmits<{
  (e: 'qty-changed', payload: { id: string; quantity: number }): void;
  (e: 'remove-item', payload: { id: string }): void;
  (e: 'checkout-clicked', payload: { itemCount: number }): void;
}>();

function onQty(payload: { id: string; quantity: number }): void {
  emit('qty-changed', payload);
}

function onRemove(payload: { id: string }): void {
  emit('remove-item', payload);
}
</script>

<style scoped>
.cart-panel {
  width: 100%;
  max-width: 720px;
  margin: 16px auto;
}

.cart-panel-title {
  font-size: 1.125rem;
}

.cart-panel-subtitle {
  font-size: 0.875rem;
  color: var(--gp-text-muted);
}

.cart-panel-empty {
  padding: 24px 0;
  text-align: center;
  color: var(--gp-text-muted);
}

.cart-panel-lines {
  display: flex;
  flex-direction: column;
}

.cart-panel-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--gp-border);
}

.cart-panel-totals {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 1rem;
  font-weight: 500;
  color: var(--gp-text);
}

.cart-panel-checkout {
  align-self: flex-end;
}
</style>