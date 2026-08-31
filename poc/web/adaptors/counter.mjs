// Browser-side wiring for Counter. Mirrors the server adaptor's
// `component.wire` but lives in the browser bundle and only touches the
// DOM. The bridge delivers pre-rendered HTML; this just attaches
// click handlers and forwards them as component_action events.
//
// `setState(updater)` is an optional 4th arg. The chat surface passes
// it so this adaptor can keep a local copy of `value` that survives
// across clicks — Submit to Claude then reads the local value and
// summarizes it for the next agent turn. Backward compatible: if no
// `setState` is passed, the wire function still works.

export function wire(el, props, onAction, setState) {
  const update = setState || (() => {});
  const span = el.querySelector('.gu-counter-value');

  el.querySelector('[data-act="increment"]').onclick = () => {
    const step = props.step ?? 1;
    onAction({ action: 'increment', payload: { step } });
    update((s) => {
      const next = { ...s, value: (s.value ?? props.value ?? props.initialValue ?? 0) + step };
      if (span) span.textContent = next.value;
      return next;
    });
  };
  el.querySelector('[data-act="decrement"]').onclick = () => {
    const step = props.step ?? 1;
    onAction({ action: 'decrement', payload: { step } });
    update((s) => {
      const next = { ...s, value: (s.value ?? props.value ?? props.initialValue ?? 0) - step };
      if (span) span.textContent = next.value;
      return next;
    });
  };
  const reset = el.querySelector('[data-act="reset"]');
  if (reset) reset.onclick = () => {
    onAction({ action: 'reset' });
    update((s) => {
      const next = { ...s, value: props.value ?? props.initialValue ?? 0 };
      if (span) span.textContent = next.value;
      return next;
    });
  };
}
