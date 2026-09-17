<template>
  <Card class="account-upgrade-prompt" :data-component="AccountUpgradePrompt" data-test="account-upgrade-prompt">
    <template #title>
      <span>Save this order for next time?</span>
    </template>
    <template #subtitle>
      <span class="account-upgrade-prompt-subtitle">
        Create an account in 10 seconds and your address + order history are ready when you come back.
      </span>
    </template>

    <template #content>
      <div class="account-upgrade-prompt-actions">
        <Button
          label="Create account"
          severity="primary"
          data-test="account-upgrade-create"
          @click="emit('upgrade-account', { orderId })"
        />
        <Button
          label="Not now"
          severity="secondary"
          text
          data-test="account-upgrade-dismiss"
          @click="emit('dismiss', { orderId })"
        />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
/**
 * AccountUpgradePrompt — post-checkout (Step 9) account-conversion CTA.
 *
 * Pure props-in component. Two buttons → `upgrade-account` and `dismiss`,
 * both carrying the order id.
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-AC3} — post-checkout upgrade converts a guest
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import Card from 'primevue/card';
import Button from 'primevue/button';

interface Props {
  /** Order id the upgrade applies to. */
  orderId: string;
}

const props = defineProps<Props>();

const AccountUpgradePrompt = 'AccountUpgradePrompt';

const emit = defineEmits<{
  (e: 'upgrade-account', payload: { orderId: string }): void;
  (e: 'dismiss', payload: { orderId: string }): void;
}>();

void props;
</script>

<style scoped>
.account-upgrade-prompt {
  max-width: 480px;
  margin: 16px auto;
}

.account-upgrade-prompt-subtitle {
  font-size: 0.875rem;
  color: var(--gp-text-muted);
}

.account-upgrade-prompt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
</style>