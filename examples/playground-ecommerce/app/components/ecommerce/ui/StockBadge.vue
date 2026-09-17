<template>
  <Tag
    :value="label"
    :severity="severity"
    class="stock-badge"
    :data-component="StockBadge"
    :data-stock-count="count"
    data-test="stock-badge"
  />
</template>

<script setup lang="ts">
/**
 * StockBadge — extracted reusable stock-count indicator.
 *
 * Pure props-in component. Maps a non-negative integer stock count to
 * a PrimeVue Tag severity + label. The four severity bands mirror
 * e-commerce conventions:
 *   - count === 0       → 'danger'  'Out of stock'
 *   - count  1..3       → 'warn'    `Only N left`
 *   - count  4..10      → 'info'    `Only N left`
 *   - count > 10        → 'success' 'In stock'
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-COMP-2} — stock indicator updates within 300ms of variant_changed
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import { computed } from 'vue';
import Tag from 'primevue/tag';

interface Props {
  /** Non-negative integer stock count for the current variation. */
  count: number;
}

const props = defineProps<Props>();

const StockBadge = 'StockBadge';

type Severity = 'success' | 'info' | 'warn' | 'danger';

const severity = computed<Severity>(() => {
  if (props.count === 0) return 'danger';
  if (props.count <= 3) return 'warn';
  if (props.count <= 10) return 'info';
  return 'success';
});

const label = computed<string>(() => {
  if (props.count === 0) return 'Out of stock';
  if (props.count <= 10) return `Only ${props.count} left`;
  return 'In stock';
});
</script>

<style scoped>
.stock-badge {
  text-transform: none;
  letter-spacing: 0.01em;
}
</style>