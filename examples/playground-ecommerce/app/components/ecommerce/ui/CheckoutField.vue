<template>
  <label class="checkout-field" :data-component="CheckoutField">
    <span class="checkout-field-label">{{ label }}</span>
    <InputText
      :model-value="value"
      type="text"
      class="checkout-field-input"
      :invalid="error !== undefined && error !== null && error !== ''"
      :data-test="`checkout-field-${testId}`"
      @update:model-value="onInput"
    />
    <Message
      v-if="error"
      severity="error"
      class="checkout-field-error"
      :data-test="`checkout-field-error-${testId}`"
    >
      {{ error }}
    </Message>
  </label>
</template>

<script setup lang="ts">
/**
 * CheckoutField — extracted labeled input + inline error pattern.
 *
 * Pure props-in component. Used by `CheckoutForm.vue` for every form
 * field so the validation error UX is consistent across contact /
 * shipping / payment sections.
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';

interface Props {
  /** Field label shown above the input. */
  label: string;
  /** Current input value (controlled). */
  value: string;
  /** Optional validation error message — renders inline PrimeVue Message when present. */
  error?: string;
}

const props = defineProps<Props>();

const CheckoutField = 'CheckoutField';

const emit = defineEmits<{
  /** Fired on every keystroke (debouncing is the parent's concern). */
  (e: 'checkout-field-changed', value: string): void;
}>();

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'field';
}

const testId = (() => {
  const lower = props.label.trim().toLowerCase();
  void lower;
  return slugify(props.label);
})();

function onInput(next: string | undefined): void {
  emit('checkout-field-changed', next ?? '');
}
</script>

<style scoped>
.checkout-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.checkout-field-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gp-text);
}

.checkout-field-input {
  width: 100%;
}

.checkout-field-error {
  margin-top: 4px;
}
</style>