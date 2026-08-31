// ComponentLifecycle — tracks mounted component instances.
// Each instance carries its props, component name, and the unique componentId.

let idCounter = 0;
function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export class ComponentLifecycle {
  constructor() {
    /** @type {Map<string, {componentId, componentName, adaptor, props, mountedAt}>} */
    this.instances = new Map();
  }

  // Mount a new component instance.
  mount(adaptor, props) {
    const componentId = nextId(adaptor.schema.name.toLowerCase().slice(0, 6) || 'cmp');
    const instance = {
      componentId,
      componentName: adaptor.schema.name,
      adaptor,
      props: structuredClone(props),
      mountedAt: Date.now(),
    };
    this.instances.set(componentId, instance);
    console.log(`[lifecycle] mounted ${adaptor.schema.name} → ${componentId}`);
    return instance;
  }

  // Update props of an existing instance (shallow merge).
  update(componentId, newProps) {
    const instance = this.instances.get(componentId);
    if (!instance) return null;
    instance.props = { ...instance.props, ...newProps };
    console.log(`[lifecycle] updated ${componentId}:`, Object.keys(newProps));
    return instance;
  }

  // Drop instance from registry.
  unmount(componentId) {
    const instance = this.instances.get(componentId);
    if (!instance) return null;
    this.instances.delete(componentId);
    console.log(`[lifecycle] unmounted ${componentId}`);
    return instance;
  }

  get(componentId) {
    return this.instances.get(componentId);
  }

  // Return structured state of an instance via its adaptor.
  getState(componentId) {
    const instance = this.instances.get(componentId);
    if (!instance) return null;
    return instance.adaptor.getState(instance.props);
  }

  // Programmatic action — the adaptor decides what "select_row" etc. means.
  invoke(componentId, action, payload) {
    const instance = this.instances.get(componentId);
    if (!instance) return null;
    console.log(`[lifecycle] invoke ${componentId} ${action}`, payload);
    return { instance, action, payload };
  }

  list() {
    return Array.from(this.instances.values()).map(i => ({
      componentId: i.componentId,
      componentName: i.componentName,
    }));
  }
}
