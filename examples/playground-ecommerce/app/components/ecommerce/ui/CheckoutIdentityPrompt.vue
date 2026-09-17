<template>
  <Card class="checkout-identity-prompt" :data-component="CheckoutIdentityPrompt" data-test="checkout-identity-prompt">
    <template #title>
      <span class="checkout-identity-prompt-title">Quick check — how do you want to check out?</span>
    </template>
    <template #subtitle>
      <span class="checkout-identity-prompt-subtitle">
        Either way takes 10 seconds. We never auto-create an account.
      </span>
    </template>

    <template #content>
      <div class="checkout-identity-prompt-actions">
        <Button
          label="Continue as guest"
          severity="secondary"
          outlined
          class="checkout-identity-prompt-btn"
          data-test="checkout-identity-guest"
          @click="emit('continue-as-guest', {})"
        />
        <Button
          label="Sign up to save this order"
          severity="primary"
          class="checkout-identity-prompt-btn"
          data-test="checkout-identity-signup"
          @click="emit('signup-then-checkout', {})"
        />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
/**
 * CheckoutIdentityPrompt — guest vs signup gate (Step 5).
 *
 * Pure props-in component (no props required). Two buttons, two
 * distinct events. The agent pauses after rendering this card and
 * waits for one of the events.
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import Card from 'primevue/card';
import Button from 'primevue/button';

const CheckoutIdentityPrompt = 'CheckoutIdentityPrompt';

const emit = defineEmits<{
  (e: 'continue-as-guest', payload: Record<string, never>): void;
  (e: 'signup-then-checkout', payload: Record<string, never>): void;
}>();
</script>

<style scoped>
.checkout-identity-prompt {
  max-width: 520px;
  margin: 16px auto;
}

.checkout-identity-prompt-title {
  font-size: 1.125rem;
}

.checkout-identity-prompt-subtitle {
  font-size: 0.875rem;
  color: var(--gp-text-muted);
}

.checkout-identity-prompt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.checkout-identity-prompt-btn {
  flex: 1 1 200px;
}
</style>