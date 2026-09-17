<template>
  <form
    class="order-lookup-prompt"
    :data-component="OrderLookupPrompt"
    data-test="order-lookup-prompt"
    @submit.prevent="onSubmit"
  >
    <label class="order-lookup-prompt-label" for="order-lookup-email">
      What's the email you used at checkout?
    </label>
    <div class="order-lookup-prompt-row">
      <InputText
        id="order-lookup-email"
        v-model="emailLocal"
        type="email"
        class="order-lookup-prompt-input"
        placeholder="you@example.com"
        autocomplete="email"
        data-test="order-lookup-email"
      />
      <Button
        type="submit"
        label="Find my order"
        :disabled="emailLocal.trim().length === 0"
        data-test="order-lookup-submit"
      />
    </div>
  </form>
</template>

<script setup lang="ts">
/**
 * OrderLookupPrompt — single email-gate form used by Step 8.
 *
 * Pure props-in component (no props actually required). Emits
 * `lookup-order` with the trimmed email on submit.
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import { ref } from 'vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

const OrderLookupPrompt = 'OrderLookupPrompt';

const emailLocal = ref<string>('');

const emit = defineEmits<{
  (e: 'lookup-order', payload: { email: string }): void;
}>();

function onSubmit(): void {
  const trimmed = emailLocal.value.trim();
  if (trimmed.length === 0) return;
  emit('lookup-order', { email: trimmed });
}
</script>

<style scoped>
.order-lookup-prompt {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius-md, 8px);
  background: var(--gp-surface);
}

.order-lookup-prompt-label {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--gp-text);
}

.order-lookup-prompt-row {
  display: flex;
  gap: 8px;
}

.order-lookup-prompt-input {
  flex: 1 1 auto;
}
</style>