<template>
  <Card class="order-confirmation" :data-component="OrderConfirmation" data-test="order-confirmation">
    <template #title>
      <span class="order-confirmation-title">Order placed</span>
    </template>
    <template #subtitle>
      <span class="order-confirmation-subtitle">Thank you — your order is on its way.</span>
    </template>

    <template #content>
      <div class="order-confirmation-grid">
        <div class="order-confirmation-cell">
          <div class="order-confirmation-label">Order #</div>
          <div class="order-confirmation-value order-confirmation-value--mono">{{ orderId }}</div>
        </div>
        <div class="order-confirmation-cell">
          <div class="order-confirmation-label">ETA</div>
          <div class="order-confirmation-value">{{ etaLabel }}</div>
        </div>
        <div class="order-confirmation-cell">
          <div class="order-confirmation-label">Payment</div>
          <Tag
            :value="paymentStatusLabel"
            :severity="paymentSeverity"
            class="order-confirmation-payment"
            data-test="order-confirmation-payment"
          />
        </div>
        <div v-if="totalAmount > 0" class="order-confirmation-cell">
          <div class="order-confirmation-label">Total</div>
          <PriceTag :amount="totalAmount" :currency="currency" />
        </div>
      </div>

      <div class="order-confirmation-actions">
        <Button
          label="Track this order"
          icon="pi pi-map-marker"
          severity="primary"
          data-test="order-confirmation-track"
          @click="emit('track-order', { orderId })"
        />
        <Button
          v-if="showAccountUpgrade"
          label="Create an account to track later"
          severity="secondary"
          outlined
          data-test="order-confirmation-account"
          @click="emit('create-account', { orderId, email })"
        />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
/**
 * OrderConfirmation — post-Place-Order success screen (Step 7).
 *
 * Pure props-in component. Two CTAs: `track-order` (immediately opens
 * the shipment timeline) and `create-account` (only shown for guest
 * sessions — `showAccountUpgrade`).
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-AC1} — Steps 1→7 success state
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import { computed } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import PriceTag from './PriceTag.vue';

interface OrderConfirmationOrder {
  id: string;
  eta?: string;
  total?: number;
  currency_code?: string;
  payment_status?: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded';
  guest?: boolean;
  email?: string;
}

interface Props {
  order: OrderConfirmationOrder;
}

const props = defineProps<Props>();

const OrderConfirmation = 'OrderConfirmation';

const orderId = computed<string>(() => String(props.order.id ?? ''));
const email = computed<string>(() => String(props.order.email ?? ''));
const totalAmount = computed<number>(() => Number(props.order.total ?? 0));
const currency = computed<string>(() => String(props.order.currency_code ?? 'USD'));
const showAccountUpgrade = computed<boolean>(() => Boolean(props.order.guest));

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

const paymentSeverity = computed<Severity>(() => {
  switch (props.order.payment_status) {
    case 'paid':
    case 'authorized':
      return 'success';
    case 'pending':
      return 'warn';
    case 'failed':
      return 'danger';
    case 'refunded':
      return 'secondary';
    default:
      return 'info';
  }
});

const paymentStatusLabel = computed<string>(() => {
  const status = props.order.payment_status ?? 'pending';
  return status.charAt(0).toUpperCase() + status.slice(1);
});

const etaLabel = computed<string>(() => {
  const eta = props.order.eta;
  if (!eta) return '—';
  try {
    const d = new Date(eta);
    if (Number.isNaN(d.getTime())) return eta;
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(d);
  } catch {
    return eta;
  }
});

const emit = defineEmits<{
  (e: 'track-order', payload: { orderId: string }): void;
  (e: 'create-account', payload: { orderId: string; email: string }): void;
}>();
</script>

<style scoped>
.order-confirmation {
  max-width: 640px;
  margin: 16px auto;
}

.order-confirmation-title {
  font-size: 1.25rem;
}

.order-confirmation-subtitle {
  font-size: 0.875rem;
  color: var(--gp-text-muted);
}

.order-confirmation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  padding: 12px 0;
}

.order-confirmation-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--gp-text-muted);
  margin-bottom: 4px;
}

.order-confirmation-value {
  font-size: 1rem;
  color: var(--gp-text);
}

.order-confirmation-value--mono {
  font-family: var(--gp-font-mono, ui-monospace, monospace);
  font-feature-settings: 'tnum' 1;
}

.order-confirmation-payment {
  text-transform: capitalize;
}

.order-confirmation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
</style>