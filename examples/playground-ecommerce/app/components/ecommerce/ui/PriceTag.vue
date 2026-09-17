<template>
  <span class="price-tag" :class="severityClass" :aria-label="ariaLabel" data-component="PriceTag">
    <span class="price-tag-amount">{{ formatted }}</span>
    <span
      v-if="compareAt !== null && compareAt > amount"
      class="price-tag-compare"
      data-test="price-tag-compare"
    >{{ formatAmount(compareAt, currency) }}</span>
  </span>
</template>

<script setup lang="ts">
/**
 * PriceTag — extracted reusable price display.
 *
 * Pure props-in component. Decimal amounts (NOT minor units) per
 * M5.2-T1 verification (VaahStore prices live in `currency.code` as
 * decimals, not minor units). Renders the formatted price + an optional
 * strike-through compare-at price.
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {M5.2-T1} — verification report (decimal amounts)
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import { computed } from 'vue';

interface Props {
  /** Decimal amount (e.g. 119.99 for $119.99). NOT minor units. */
  amount: number;
  /** ISO-4217 currency code. Defaults to 'USD'. */
  currency?: string;
  /** Optional compare-at decimal amount — renders strike-through when greater than `amount`. */
  compareAt?: number | null;
}

const props = withDefaults(defineProps<Props>(), {
  currency: 'USD',
  compareAt: null,
});

/** Build an Intl.NumberFormat once per (currency) tuple via a cache. */
const formatterCache = new Map<string, Intl.NumberFormat>();
function getFormatter(currency: string): Intl.NumberFormat {
  const existing = formatterCache.get(currency);
  if (existing) return existing;
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency });
  formatterCache.set(currency, fmt);
  return fmt;
}

function formatAmount(value: number, currency: string): string {
  if (!Number.isFinite(value) || value < 0) return '—';
  return getFormatter(currency).format(value);
}

const formatted = computed<string>(() => formatAmount(props.amount, props.currency));
const compareFormatted = computed<string>(() => formatAmount(props.compareAt ?? 0, props.currency));

const severityClass = computed<string>(() => {
  if (props.compareAt !== null && props.compareAt !== undefined && props.compareAt > props.amount) {
    return 'price-tag--on-sale';
  }
  return 'price-tag--regular';
});

const ariaLabel = computed<string>(() => {
  if (props.compareAt !== null && props.compareAt !== undefined && props.compareAt > props.amount) {
    return `Sale price ${formatted.value}, was ${compareFormatted.value}`;
  }
  return `Price ${formatted.value}`;
});
</script>

<style scoped>
.price-tag {
  display: inline-flex;
  align-items: baseline;
  gap: 0.5rem;
  font-family: var(--gp-font-mono, ui-monospace, monospace);
  font-feature-settings: 'tnum' 1;
}

.price-tag-amount {
  font-weight: 600;
  font-size: 1rem;
  color: var(--gp-text);
}

.price-tag--on-sale .price-tag-amount {
  color: var(--gp-accent);
}

.price-tag-compare {
  font-size: 0.875rem;
  color: var(--gp-text-muted);
  text-decoration: line-through;
}
</style>