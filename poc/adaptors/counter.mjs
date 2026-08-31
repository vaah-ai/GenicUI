// Counter adaptor — proves the basic render/update/event loop.
// Trivial component: a label + value + +/- buttons.

import { BaseAdaptor } from './base-adaptor.mjs';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export const counterAdaptor = new BaseAdaptor({
  schema: {
    name: 'Counter',
    description: 'A simple counter with increment and decrement buttons. ' +
                 'Use when demonstrating basic GenicUI capability or letting ' +
                 'the user adjust a single numeric value.',
    whenToUse: [
      'show a counter',
      'increment or decrement a number',
      'a numeric counter widget',
      'user says "count", "increment", "decrement"',
    ],
    category: 'data-display',
    propDescriptors: [
      { name: 'label', type: 'string', required: false },
      { name: 'value', type: 'number', required: false },
      { name: 'initialValue', type: 'number', required: false, description: 'Alias for value (used in agent prompts).' },
      { name: 'step',  type: 'number', required: false },
    ],
    actions: [
      { name: 'increment', description: 'User clicked +' },
      { name: 'decrement', description: 'User clicked −' },
      { name: 'reset',     description: 'User clicked reset' },
    ],
  },

  component: {
    html(props) {
      const label = escapeHtml(props.label ?? 'Count');
      const value = props.value ?? props.initialValue ?? 0;
      const step = props.step ?? 1;
      return `
<div class="gu-comp gu-counter" data-comp="Counter">
  <span class="gu-counter-label">${label}:</span>
  <button data-act="decrement" class="gu-btn">−</button>
  <span class="gu-counter-value">${value}</span>
  <button data-act="increment" class="gu-btn">+</button>
  <button data-act="reset" class="gu-btn gu-btn-secondary">reset</button>
</div>`;
    },

    wire(el, props, onAction) {
      el.querySelector('[data-act="increment"]').onclick = () =>
        onAction({ action: 'increment', payload: { step: props.step ?? 1 } });
      el.querySelector('[data-act="decrement"]').onclick = () =>
        onAction({ action: 'decrement', payload: { step: props.step ?? 1 } });
      el.querySelector('[data-act="reset"]').onclick = () =>
        onAction({ action: 'reset' });
    },
  },

  getState(props) {
    return {
      value: props.value ?? props.initialValue ?? 0,
      label: props.label ?? 'Count',
    };
  },
});
