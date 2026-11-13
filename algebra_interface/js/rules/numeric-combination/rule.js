/**
 * Numeric combination rule bundle: the pure part (no DOM).
 *
 * Dropping a number onto another number in the same sum (or product) adds
 * (or multiplies) them, exactly. It is immediate: no preview. Both rule IDs
 * share one detached candidate builder. Its interaction is in ./install.js.
 */
import { prepareNumericCombinationCommitCandidate } from './commitCandidate.js';
import { numericCombinationActionRequest, describeNumericCombinationFeedback } from './gesture.js';

export const NUMERIC_COMBINATION_RULE_IDS = Object.freeze(['addition.combine-numeric', 'multiplication.combine-numeric']);

export const numericCombinationFeatures = Object.freeze(NUMERIC_COMBINATION_RULE_IDS.map(id => ({
  id, confirmationMode: 'immediate',
  gesture: numericCombinationActionRequest,
  visual: describeNumericCombinationFeedback,
  propose(root, parameters) {
    const candidate = prepareNumericCombinationCommitCandidate(root, parameters);
    return candidate?.action.ruleId === id
      ? { ...candidate.result, actionLabel: candidate.actionLabel, resultText: candidate.resultText }
      : null;
  }
})));

export const numericCombinationDeclarations = Object.freeze([
  { ruleId: 'addition.combine-numeric', kind: 'drag',
    on: { role: 'occurrence', nodeType: 'Number', parentType: 'Add' },
    onto: { role: 'occurrence', nodeType: 'Number', parentType: 'Add' },
    description: 'Drag onto another number to add them' },
  { ruleId: 'multiplication.combine-numeric', kind: 'drag',
    on: { role: 'occurrence', nodeType: 'Number', parentType: 'Multiply' },
    onto: { role: 'occurrence', nodeType: 'Number', parentType: 'Multiply' },
    description: 'Drag onto another number to multiply them' }
].map(declaration => Object.freeze(declaration)));
