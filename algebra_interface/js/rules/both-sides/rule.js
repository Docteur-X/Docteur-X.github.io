/**
 * "Same to both sides" rule bundle: the pure part (no DOM). Stage 7: the
 * first rule built only as a bundle, to prove the design.
 *
 * Dragging a term of an equation across the = sign proposes adding its
 * opposite to both sides (./engine.js). Interaction is in ./install.js.
 * The rule ID is stored in history, so it never changes (decision 3.2).
 */
import { isRelationNode } from '../../engine/nodeRegistry.js';
import { addOppositeToBothSides } from './engine.js';
import { expressionToDisplayString } from '../../engine/parser.js';

export const BOTH_SIDES_RULE_IDS = Object.freeze(['equality.add-opposite']);

/** DOM-free gesture interpretation: which term was dragged across, in which equation. */
export function bothSidesActionRequest({ relationId, termId }) {
  if (![relationId, termId].every(value => typeof value === 'string' && value.length)) return null;
  return Object.freeze({ ruleId: 'equality.add-opposite', parameters: Object.freeze({ relationId, termId }) });
}

/** Words for the preview and status line. */
export function describeBothSidesCandidate(candidate) {
  const opposite = expressionToDisplayString(candidate.result.opposite);
  return Object.freeze({
    opposite,
    label: `Add ${opposite} to both sides`,
    status: `Preview: ${opposite} is added to both sides. Select an amber term or Confirm; Cancel or Escape leaves the equation unchanged.`
  });
}

export const bothSidesFeatures = Object.freeze([
  { id: 'equality.add-opposite',
    // Adding −t to both sides keeps the relation (=, <, >: each says what
    // adding does, stage E4c), and t + −t cancels.
    requires: [{ relation: 'acted-on', bothSides: 'add' }, { operation: 'Add', properties: ['inverses'] }],
    propose(root, parameters) {
      if (!parameters || !isRelationNode(root) || root.id !== parameters.relationId) return null;
      return addOppositeToBothSides(root, parameters.termId);
    },
    gesture: bothSidesActionRequest,
    visual: describeBothSidesCandidate,
    confirmationMode: 'preview' }
]);

// `sideTerm`: a whole side of an equation, or a term of a sum that is a side
// (js/view/partFromElement.js), exactly the terms the Engine accepts.
export const bothSidesDeclarations = Object.freeze([
  { ruleId: 'equality.add-opposite', kind: 'drag',
    on: { role: 'occurrence', sideTerm: true },
    onto: { role: 'equation-side' },
    description: 'Drag a term of an equation across = to add its opposite to both sides' }
].map(declaration => Object.freeze(declaration)));
