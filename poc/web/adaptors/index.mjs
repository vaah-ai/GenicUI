// Browser-side adaptor registry. Each entry exposes a `wire(el, props,
// onAction, setState)` function that attaches DOM event handlers and
// forwards user interactions as component_action events.
//
// Kept intentionally separate from the server-side `poc/adaptors/*`:
// the server adaptors carry full BaseAdaptor machinery (validateProps,
// getState, html generation) that the browser doesn't need. The bridge
// already ships pre-rendered HTML for `html()` — the browser just needs
// to attach listeners and track local state for the Submit-to-Claude
// flow.
//
// `seedState(props)` returns the initial local state shape — same
// shape as the server adaptor's `getState()`. `summarize(state)`
// produces the human-readable text that the next agent turn sees as
// its user message when the user clicks "Submit to Claude".

import { wire as counterWire } from './counter.mjs';
import { wire as todoListWire } from './todo-list.mjs';
import { wire as cartViewerWire } from './cart-viewer.mjs';

function counterSeed(props) {
  return {
    label: props.label ?? 'Count',
    value: props.value ?? props.initialValue ?? 0,
    step: props.step ?? 1,
  };
}

function counterSummarize(s) {
  return `Counter "${s.label}" current value: ${s.value} (step ${s.step}).`;
}

function todoListSeed(props) {
  return {
    title: props.title ?? 'Todo',
    items: Array.isArray(props.items) ? props.items.map(i => ({ ...i })) : [],
  };
}

function todoListSummarize(s) {
  if (!s.items.length) return `TodoList "${s.title}" is empty.`;
  const lines = s.items.map(it => `  ${it.done ? '[x]' : '[ ]'} ${it.text}`).join('\n');
  const pending = s.items.filter(i => !i.done).length;
  return `TodoList "${s.title}" (${s.items.length} items, ${pending} pending):\n${lines}`;
}

function cartViewerSeed(props) {
  const items = Array.isArray(props.items) ? props.items.map(i => ({ ...i })) : [];
  const subtotal = items.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 0), 0);
  const tax = props.tax ?? Math.round(subtotal * 0.08 * 100) / 100;
  const shipping = props.shipping ?? 0;
  return {
    items,
    subtotal,
    tax,
    shipping,
    total: subtotal + tax + shipping,
  };
}

function cartViewerSummarize(s) {
  if (!s.items.length) return `Cart is empty.`;
  const lines = s.items
    .map(it => `  ${it.qty}× ${it.name} @ $${(it.price || 0).toFixed(2)} = $${((it.price || 0) * (it.qty || 0)).toFixed(2)}`)
    .join('\n');
  return `Cart (${s.items.length} line items):\n${lines}\nSubtotal: $${s.subtotal.toFixed(2)}  Tax: $${s.tax.toFixed(2)}  Shipping: $${s.shipping.toFixed(2)}  Total: $${s.total.toFixed(2)}`;
}

export const adaptors = {
  Counter: { wire: counterWire, seedState: counterSeed, summarize: counterSummarize },
  TodoList: { wire: todoListWire, seedState: todoListSeed, summarize: todoListSummarize },
  CartViewer: { wire: cartViewerWire, seedState: cartViewerSeed, summarize: cartViewerSummarize },
};
