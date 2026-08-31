// BaseAdaptor — common shape for all GenicUI adaptors.
// validateProps() walks the schema's propDescriptors and checks each one.
// The browser-side component (renderableHtml) is a function returning a
// string of HTML plus a `wire(el, props, onAction)` function that attaches
// event listeners. Kept dead-simple — no framework.

export class BaseAdaptor {
  /**
   * @param {object} opts
   * @param {object} opts.schema
   * @param {{ html: (props)=>string, wire: (el, props, onAction, bridge)=>void }} opts.component
   * @param {(props)=>object} opts.getState
   */
  constructor({ schema, component, getState }) {
    this.schema = schema;
    this.component = component;
    this.getState = getState;
  }

  // Run prop validation against the schema's propDescriptors.
  // propDescriptors is an array of { name, type, required, itemShape? }.
  validateProps(props) {
    const errors = [];
    const p = props || {};
    for (const def of this.schema.propDescriptors || []) {
      const v = p[def.name];
      if (def.required && (v === undefined || v === null)) {
        errors.push(`Missing required prop: ${def.name}`);
        continue;
      }
      if (v === undefined || v === null) continue;
      const t = def.type;
      if (t === 'string' && typeof v !== 'string') errors.push(`${def.name} must be string`);
      if (t === 'number' && typeof v !== 'number') errors.push(`${def.name} must be number`);
      if (t === 'boolean' && typeof v !== 'boolean') errors.push(`${def.name} must be boolean`);
      if (t === 'array' && !Array.isArray(v)) errors.push(`${def.name} must be array`);
      if (t === 'object' && (typeof v !== 'object' || Array.isArray(v))) {
        errors.push(`${def.name} must be object`);
      }
      if (t === 'array' && def.itemShape) {
        for (let i = 0; i < v.length; i++) {
          for (const [k, kt] of Object.entries(def.itemShape)) {
            if (kt === 'number' && typeof v[i][k] !== 'number') {
              errors.push(`${def.name}[${i}].${k} must be number`);
            }
            if (kt === 'string' && typeof v[i][k] !== 'string') {
              errors.push(`${def.name}[${i}].${k} must be string`);
            }
            if (kt === 'boolean' && typeof v[i][k] !== 'boolean') {
              errors.push(`${def.name}[${i}].${k} must be boolean`);
            }
          }
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }
}
