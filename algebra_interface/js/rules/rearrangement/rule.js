/**
 * Rearrangement rule bundle: the pure part (no DOM).
 *
 * Reordering an addend in a sum, or a factor in a product. The Engine checks
 * that the reorder is valid (a product may only be reordered where
 * multiplication commutes). Its interaction is in ./install.js.
 */
import { rearrangementActionRequest } from './gesture.js';
import { describeRearrangementFeedback } from './visual.js';
import { proposeRearrangement } from './propose.js';

export const REARRANGEMENT_RULE_IDS = Object.freeze(['addition.rearrange', 'multiplication.rearrange']);

// What each reorder needs from its operation's type (Engine stage E3). A sum
// or product with more than two terms exists only where the operation is
// associative (otherwise it stays left-nested), so commutativity is the one
// property to ask for: with associativity it gives "reorder anything".
const REQUIRES = Object.freeze({
  'addition.rearrange': [{ operation: 'Add', properties: ['commutative'] }],
  'multiplication.rearrange': [{ operation: 'Multiply', properties: ['commutative'] }],
});

export const rearrangementFeatures = Object.freeze(REARRANGEMENT_RULE_IDS.map(id => ({
  id, requires: REQUIRES[id], propose: proposeRearrangement, gesture: rearrangementActionRequest,
  visual: describeRearrangementFeedback, confirmationMode: 'immediate'
})));

export const rearrangementDeclarations = Object.freeze([
  { ruleId: 'addition.rearrange', kind: 'drag-between',
    on: { role: 'occurrence', parentType: 'Add' },
    description: 'Drag between terms to reorder the sum' },
  { ruleId: 'addition.rearrange', kind: 'key', key: 'ArrowLeft/ArrowRight',
    on: { role: 'occurrence', parentType: 'Add' },
    description: 'Press the left or right arrow to move this term',
    spoken: 'Arrows reorder' },
  { ruleId: 'multiplication.rearrange', kind: 'drag-between',
    on: { role: 'occurrence', parentType: 'Multiply' },
    description: 'Drag between factors to reorder the product' },
  { ruleId: 'multiplication.rearrange', kind: 'key', key: 'ArrowLeft/ArrowRight',
    on: { role: 'occurrence', parentType: 'Multiply' },
    description: 'Press the left or right arrow to move this factor',
    spoken: 'Arrows reorder' }
].map(declaration => Object.freeze(declaration)));
