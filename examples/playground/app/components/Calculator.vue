<template>
  <!--
    Calculator — 4-function calculator with keyboard support.

    Self-contained: the display, accumulator, and pending operator
    all live here. No props are required to render.

    Behavior:
      - Pressing a digit (or `.`) appends to the current entry.
      - Pressing an operator commits the current entry, applies
        any pending operator against the accumulator, and arms
        the new operator.
      - `=` flushes the pending operator against the accumulator
        and shows the result.
      - `AC` clears everything.
      - `⌫` deletes the last digit of the current entry.
      - Keyboard: digits, `.`, `+ - * /`, `Enter`/`=`, `Backspace`,
        `Escape` (AC).

    Emits `keystroke` events through the component-event-bus when
    wired into RenderedComponent, so a backing agent can observe
    user input if it wants.
  -->
  <section class="calculator" aria-label="Calculator">
    <div
      class="calculator-display"
      role="status"
      aria-live="polite"
      data-test="calculator-display"
    >
      <div class="calculator-expression" aria-hidden="true">
        {{ expressionLine || ' ' }}
      </div>
      <div class="calculator-current">{{ currentDisplay }}</div>
    </div>

    <div class="calculator-keys" role="group" aria-label="Calculator keys">
      <button
        type="button"
        class="calculator-key calculator-key-action"
        data-test="calc-ac"
        @click="pressAllClear"
      >AC</button>
      <button
        type="button"
        class="calculator-key calculator-key-action"
        data-test="calc-backspace"
        aria-label="Backspace"
        @click="pressBackspace"
      >⌫</button>
      <button
        type="button"
        class="calculator-key calculator-key-action"
        data-test="calc-percent"
        aria-label="Percent"
        @click="pressPercent"
      >%</button>
      <button
        type="button"
        class="calculator-key calculator-key-op"
        data-test="calc-divide"
        aria-label="Divide"
        @click="pressOperator('divide')"
      >÷</button>

      <button
        v-for="d in ['7','8','9']"
        :key="`r1-${d}`"
        type="button"
        class="calculator-key"
        :data-test="`calc-digit-${d}`"
        @click="pressDigit(d)"
      >{{ d }}</button>
      <button
        type="button"
        class="calculator-key calculator-key-op"
        data-test="calc-multiply"
        aria-label="Multiply"
        @click="pressOperator('multiply')"
      >×</button>

      <button
        v-for="d in ['4','5','6']"
        :key="`r2-${d}`"
        type="button"
        class="calculator-key"
        :data-test="`calc-digit-${d}`"
        @click="pressDigit(d)"
      >{{ d }}</button>
      <button
        type="button"
        class="calculator-key calculator-key-op"
        data-test="calc-subtract"
        aria-label="Subtract"
        @click="pressOperator('subtract')"
      >−</button>

      <button
        v-for="d in ['1','2','3']"
        :key="`r3-${d}`"
        type="button"
        class="calculator-key"
        :data-test="`calc-digit-${d}`"
        @click="pressDigit(d)"
      >{{ d }}</button>
      <button
        type="button"
        class="calculator-key calculator-key-op"
        data-test="calc-add"
        aria-label="Add"
        @click="pressOperator('add')"
      >+</button>

      <button
        type="button"
        class="calculator-key calculator-key-zero"
        data-test="calc-digit-0"
        @click="pressDigit('0')"
      >0</button>
      <button
        type="button"
        class="calculator-key"
        data-test="calc-dot"
        aria-label="Decimal point"
        @click="pressDot"
      >.</button>
      <button
        type="button"
        class="calculator-key calculator-key-equals"
        data-test="calc-equals"
        aria-label="Equals"
        @click="pressEquals"
      >=</button>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Calculator — fully client-stateful 4-function calculator.
 *
 * No props required. Internal state:
 *   - `current`   : the in-progress number the user is typing
 *   - `accumulator`: the LHS held while the user picks an operator
 *   - `pendingOp` : the operator awaiting the next entry (= flushes)
 *   - `justEvaluated` : set after `=` so the next digit starts fresh
 *
 * @see {F43} — interactive components in the chat panel
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

type Operator = 'add' | 'subtract' | 'multiply' | 'divide';

const current = ref<string>('0');
const accumulator = ref<number | null>(null);
const pendingOp = ref<Operator | null>(null);
const justEvaluated = ref<boolean>(false);

/** Pretty symbol for the pending operator (shown above the display). */
const operatorSymbol: Record<Operator, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
};

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

const currentDisplay = computed<string>(() => current.value);

/** "LHS op" line shown above the main display. Empty when nothing is armed. */
const expressionLine = computed<string>(() => {
  if (accumulator.value === null || pendingOp.value === null) {
    return '';
  }
  return `${formatNumber(accumulator.value)} ${operatorSymbol[pendingOp.value]}`;
});

// ---------------------------------------------------------------------------
// Number formatting (avoid scientific notation for normal-sized results)
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return 'Error';
  // Use up to 10 significant digits, then strip trailing zeros.
  const rounded = Math.round(n * 1e10) / 1e10;
  return rounded.toString();
}

function toNumber(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

/** Apply a binary operator to (accumulator, current). */
function apply(op: Operator, a: number, b: number): number {
  switch (op) {
    case 'add': return a + b;
    case 'subtract': return a - b;
    case 'multiply': return a * b;
    case 'divide':
      if (b === 0) return Number.NaN;
      return a / b;
  }
}

function commitPending(): number | null {
  if (accumulator.value === null || pendingOp.value === null) {
    return null;
  }
  return apply(pendingOp.value, accumulator.value, toNumber(current.value));
}

function pressDigit(digit: string): void {
  if (justEvaluated.value) {
    current.value = digit;
    accumulator.value = null;
    pendingOp.value = null;
    justEvaluated.value = false;
    return;
  }
  if (current.value === '0') {
    current.value = digit;
  } else if (current.value.length < 15) {
    current.value += digit;
  }
}

function pressDot(): void {
  if (justEvaluated.value) {
    current.value = '0.';
    accumulator.value = null;
    pendingOp.value = null;
    justEvaluated.value = false;
    return;
  }
  if (!current.value.includes('.')) {
    current.value += '.';
  }
}

function pressOperator(op: Operator): void {
  if (accumulator.value !== null && pendingOp.value !== null && !justEvaluated.value) {
    // Chain: flush pending op against current first.
    const result = commitPending();
    if (result === null || !Number.isFinite(result)) {
      current.value = 'Error';
      accumulator.value = null;
      pendingOp.value = null;
      justEvaluated.value = true;
      return;
    }
    accumulator.value = result;
    current.value = formatNumber(result);
  } else {
    accumulator.value = toNumber(current.value);
  }
  pendingOp.value = op;
  justEvaluated.value = false;
  // Next digit starts a fresh entry.
  current.value = '0';
}

function pressEquals(): void {
  if (accumulator.value === null || pendingOp.value === null) {
    // Nothing to do — user pressed = without an operator.
    return;
  }
  const result = commitPending();
  if (result === null || !Number.isFinite(result)) {
    current.value = 'Error';
    accumulator.value = null;
    pendingOp.value = null;
    justEvaluated.value = true;
    return;
  }
  accumulator.value = null;
  pendingOp.value = null;
  current.value = formatNumber(result);
  justEvaluated.value = true;
}

function pressAllClear(): void {
  current.value = '0';
  accumulator.value = null;
  pendingOp.value = null;
  justEvaluated.value = false;
}

function pressBackspace(): void {
  if (justEvaluated.value) {
    pressAllClear();
    return;
  }
  if (current.value.length <= 1 || (current.value.length === 2 && current.value.startsWith('-'))) {
    current.value = '0';
  } else {
    current.value = current.value.slice(0, -1);
  }
}

function pressPercent(): void {
  // Treat the current entry as a percentage of the accumulator if armed,
  // otherwise leave it as-is.
  const value = toNumber(current.value);
  if (accumulator.value !== null) {
    current.value = formatNumber(accumulator.value * value / 100);
  } else {
    current.value = formatNumber(value / 100);
  }
}

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------

function onKeydown(ev: KeyboardEvent): void {
  // Don't hijack typing inside form fields outside the calculator.
  const target = ev.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    if (!target.closest('.calculator')) return;
  }

  const { key } = ev;
  if (/^[0-9]$/.test(key)) {
    ev.preventDefault();
    pressDigit(key);
    return;
  }
  if (key === '.') {
    ev.preventDefault();
    pressDot();
    return;
  }
  if (key === '+' || key === '-') {
    ev.preventDefault();
    pressOperator(key === '+' ? 'add' : 'subtract');
    return;
  }
  if (key === '*') {
    ev.preventDefault();
    pressOperator('multiply');
    return;
  }
  if (key === '/') {
    ev.preventDefault();
    pressOperator('divide');
    return;
  }
  if (key === 'Enter' || key === '=') {
    ev.preventDefault();
    pressEquals();
    return;
  }
  if (key === 'Backspace') {
    ev.preventDefault();
    pressBackspace();
    return;
  }
  if (key === 'Escape' || key === 'Delete') {
    ev.preventDefault();
    pressAllClear();
    return;
  }
  if (key === '%') {
    ev.preventDefault();
    pressPercent();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.calculator {
  display: inline-flex;
  flex-direction: column;
  gap: 8px;
  width: 240px;
  padding: 12px;
  border-radius: var(--gp-radius-md, 8px);
  background: var(--gp-surface, #1e293b);
  border: 1px solid var(--gp-border, #272f42);
  font-family: var(--gp-font-sans, system-ui, sans-serif);
  color: var(--gp-text, #f8fafc);
  user-select: none;
}

.calculator-display {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-end;
  min-height: 64px;
  padding: 8px 12px;
  border-radius: var(--gp-radius-sm, 6px);
  background: var(--gp-topbar, #0b1224);
  border: 1px solid var(--gp-border, #272f42);
}

.calculator-expression {
  min-height: 16px;
  font-size: 0.75rem;
  color: var(--gp-text-muted, #64748b);
  text-align: right;
  font-family: var(--gp-font-mono, monospace);
}

.calculator-current {
  font-size: 1.75rem;
  font-weight: 600;
  text-align: right;
  font-family: var(--gp-font-mono, 'JetBrains Mono', monospace);
  font-feature-settings: 'tnum' 1;
  letter-spacing: 0.02em;
  line-height: 1.1;
  overflow-x: auto;
  white-space: nowrap;
}

.calculator-keys {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.calculator-key {
  appearance: none;
  border: 1px solid var(--gp-border, #272f42);
  background: var(--gp-surface-hover, #272f42);
  color: var(--gp-text, #f8fafc);
  font: inherit;
  font-size: 1rem;
  font-weight: 500;
  padding: 10px 0;
  border-radius: var(--gp-radius-sm, 6px);
  cursor: pointer;
  transition: background 0.1s ease, transform 0.05s ease;
}

.calculator-key:hover {
  background: #2f3a52;
}

.calculator-key:active {
  transform: scale(0.97);
}

.calculator-key:focus-visible {
  outline: 2px solid var(--gp-accent, #22c55e);
  outline-offset: 2px;
}

.calculator-key-action {
  background: #2a3349;
  color: var(--gp-text-secondary, #94a3b8);
  font-size: 0.875rem;
}

.calculator-key-op {
  background: #3a4358;
  color: var(--gp-accent, #22c55e);
  font-size: 1.125rem;
}

.calculator-key-equals {
  background: var(--gp-accent, #22c55e);
  color: #052e16;
  font-weight: 700;
}

.calculator-key-equals:hover {
  background: #16a34a;
}

.calculator-key-zero {
  /* "0" spans one column — leave layout symmetrical for now. */
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .calculator-key {
    transition: none;
  }
  .calculator-key:active {
    transform: none;
  }
}
</style>