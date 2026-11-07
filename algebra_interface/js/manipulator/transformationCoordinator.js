/**
 * Route DOM-free mathematical intentions to registered Engine proposals.
 * A registry describes capabilities; this coordinator executes proposals.
 * Neither module commits history, interprets pointer coordinates, or renders.
 */
export function createTransformationCoordinator(registryOrDefinitions) {
  // Preserve the original map-based API for external callers during migration.
  const registry = registryOrDefinitions?.get && registryOrDefinitions?.has
    ? registryOrDefinitions
    : { get: id => registryOrDefinitions?.[id] ?? null,
        has: id => Object.hasOwn(registryOrDefinitions ?? {}, id) };
  return Object.freeze({
    propose(root, action) {
      if (!root || !action || typeof action.ruleId !== 'string') return null;
      const feature = registry.get(action.ruleId);
      if (!feature) return null;
      const result = feature.propose(root, action.parameters);
      return result ? { action, result, confirmationMode: feature.confirmationMode || 'preview' } : null;
    },
    hasRule(ruleId) { return registry.has(ruleId); },
    // Feedback is a semantic description, not CSS or DOM mutation. A feature
    // may omit it; this is independent of whether it offers a full preview.
    feedback(candidate) {
      const feature = registry.get(candidate?.action?.ruleId);
      return feature?.feedback ? feature.feedback(candidate) : null;
    },
    describe(candidate) {
      const feature = registry.get(candidate?.action?.ruleId);
      return feature?.visual ? feature.visual(candidate) : null;
    }
  });
}
