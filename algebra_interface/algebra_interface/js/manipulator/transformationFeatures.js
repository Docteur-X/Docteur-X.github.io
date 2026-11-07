/**
 * Transformation Feature Registry v1.
 *
 * A feature is a discoverable bundle of *references* to independent services:
 * Engine proposal, gesture adapter, visual descriptor, and confirmation policy.
 * No DOM, application state, or mathematical AST is owned by the registry.
 * A rule may have several gesture entry points (or none), and different rules
 * may share a visual adapter. Stable rule IDs are also history identifiers.
 */
export function createTransformationFeatureRegistry(features) {
  if (!Array.isArray(features)) throw new TypeError('Features must be an array');
  const byId = new Map();
  for (const feature of features) {
    if (!feature || typeof feature.id !== 'string' || !feature.id ||
        typeof feature.propose !== 'function' ||
        !['preview', 'immediate'].includes(feature.confirmationMode)) {
      throw new TypeError('Invalid transformation feature');
    }
    if (byId.has(feature.id)) throw new Error(`Duplicate transformation rule ID: ${feature.id}`);
    if (feature.gesture != null && typeof feature.gesture !== 'function') throw new TypeError('Invalid gesture adapter');
    // A rule can have several independent entry points (pointer, keyboard,
    // toolbar). Keep the historical singular `gesture` API for older features.
    // The registry owns *references*, never the DOM or the interpretation of
    // a gesture; a gesture adapter returns a DOM-free request.
    if (feature.gestures != null && (!Array.isArray(feature.gestures) ||
        feature.gestures.some(adapter => typeof adapter !== 'function'))) {
      throw new TypeError('Invalid gesture adapters');
    }
    if (feature.feedback != null && typeof feature.feedback !== 'function')
      throw new TypeError('Invalid feedback descriptor');
    if (feature.visual != null && typeof feature.visual !== 'function') throw new TypeError('Invalid visual adapter');
    // Copy the descriptor to avoid callers mutating registry policy later.
    byId.set(feature.id, Object.freeze({
      ...feature,
      // Freeze the collection itself: callers must not add/remove entry points
      // after the registry is constructed. Adapter functions remain reusable.
      ...(feature.gestures ? { gestures: Object.freeze([...feature.gestures]) } : {})
    }));
  }
  return Object.freeze({
    get(id) { return byId.get(id) ?? null; },
    has(id) { return byId.has(id); },
    list() { return Object.freeze([...byId.values()]); }
  });
}
