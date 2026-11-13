/**
 * Route DOM-free mathematical intentions to registered Engine proposals.
 * A registry describes capabilities; this coordinator executes proposals.
 * Neither module commits history, interprets pointer coordinates, or renders.
 *
 * Every proposal passes the division invariant (js/engine/divisionInvariant.js):
 * a product never starts with ÷, so a new 1 is put in front where needed, and
 * the preview already shows it. A proposal that changes nothing once the 1 is
 * restored is refused as a no-op: that is what keeps the leading 1 "locked"
 * (it cannot be combined away; it would only come straight back).
 *
 * A rule that declares `requires` (Engine stage E3) is offered only where the
 * type of the expression provides every property it names, for example
 * { operation: 'Add', properties: ['commutative'] }: rules ask, types provide.
 */
import { restoreLeadingOne } from '../engine/divisionInvariant.js';
import { structurallyEqual } from '../engine/structuralEquality.js';
import { requirementsMet } from '../engine/structures.js';
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
      if (feature.requires && !requirementsMet(feature.requires, root).met) return null;
      let result = feature.propose(root, action.parameters);
      if (result?.root) {
        const restored = restoreLeadingOne(result.root);
        if (restored.changed) {
          if (structurallyEqual(restored.root, root)) return null; // a no-op once the 1 is back
          result = { ...result, root: restored.root };
        }
      }
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
