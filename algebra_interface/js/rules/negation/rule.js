/**
 * Negation rule bundle: the pure part (no DOM).
 *
 * Standard 3 of the interaction standards. This file holds what the rest of
 * the program needs to know about negation without running any interaction:
 * - `features`: the registry entries (rule IDs, Engine proposal, gesture
 *   request builder, visual descriptor, confirmation mode);
 * - `declarations`: the gestures it accepts, as data (standard 2).
 *
 * Its interaction (routes, preview, drop target) is in ./install.js.
 * Rule IDs are stored in history, so they never change (decision 3.2).
 */
import { expandNegationAction, compressNegationAction } from './gesture.js';
import { describeNegationCandidate } from './visual.js';
import { proposeExpandNegation, proposeCompressNegation } from '../../engine/operations/negation.js';

export const NEGATION_RULE_IDS = Object.freeze(['negation.expand', 'negation.compress']);

const NEGATION_REQUIRES = Object.freeze([{ operation: 'Add', properties: ['inverses'] },
  { operation: 'Multiply', properties: ['identity'] }]);

export const negationFeatures = Object.freeze([
  // −b = (−1)·b: −1 is the additive inverse of the multiplicative identity.
  { id: 'negation.expand', requires: NEGATION_REQUIRES, propose: proposeExpandNegation, gesture: expandNegationAction,
    visual: describeNegationCandidate, confirmationMode: 'preview' },
  { id: 'negation.compress', requires: NEGATION_REQUIRES, propose: proposeCompressNegation, gesture: compressNegationAction,
    visual: describeNegationCandidate, confirmationMode: 'preview' }
]);

export const negationDeclarations = Object.freeze([
  { ruleId: 'negation.expand', kind: 'activate',
    on: { role: 'operator', ownerType: 'Negate' },
    description: 'Show the −1 hidden in this minus sign',
    spoken: 'Expand negation as multiplication by negative one',
    hint: 'Click to expose −1' },
  { ruleId: 'negation.compress', kind: 'drag',
    on: { role: 'occurrence', nodeType: 'Number', value: '-1', parentType: 'Multiply' },
    onto: { role: 'occurrence', parentType: 'Multiply' },
    description: 'Drag −1 onto a neighbouring factor to write it as a minus sign' }
].map(declaration => Object.freeze(declaration)));
