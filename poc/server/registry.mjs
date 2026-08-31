// ComponentRegistry — in-memory index of adaptors
// Provides semantic (keyword) search over schemas for `find_ui_component`.

export class ComponentRegistry {
  constructor() {
    /** @type {Map<string, import('../adaptors/base-adaptor.mjs').BaseAdaptor>} */
    this.adaptors = new Map();
  }

  register(adaptor) {
    if (!adaptor?.schema?.name) {
      throw new Error('Adaptor must have a schema.name');
    }
    if (this.adaptors.has(adaptor.schema.name)) {
      throw new Error(`Duplicate adaptor registered: ${adaptor.schema.name}`);
    }
    this.adaptors.set(adaptor.schema.name, adaptor);
    console.log(`[registry] registered: ${adaptor.schema.name} (${adaptor.schema.category})`);
  }

  get(name) {
    return this.adaptors.get(name);
  }

  list() {
    return Array.from(this.adaptors.values());
  }

  // Naive semantic search: token overlap with whenToUse + description + name.
  // Good enough for PoC with 3 components; swap for embeddings later.
  search(intent, { topK = 3 } = {}) {
    const terms = (intent || '').toLowerCase().split(/\s+/).filter(t => t.length > 1);
    if (!terms.length) return [];

    const scored = this.list().map(adaptor => {
      let score = 0;
      const haystack = [
        adaptor.schema.name,
        adaptor.schema.description,
        ...(adaptor.schema.whenToUse || []),
      ].join(' ').toLowerCase();

      for (const term of terms) {
        if (haystack.includes(term)) score += 1;
        if (adaptor.schema.name.toLowerCase().includes(term)) score += 2;
        for (const use of adaptor.schema.whenToUse || []) {
          if (use.toLowerCase().includes(term)) score += 1;
        }
      }
      return { adaptor, score };
    });

    return scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(r => ({ adaptor: r.adaptor, score: r.score }));
  }
}
