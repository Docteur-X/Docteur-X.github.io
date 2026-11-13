/**
 * Equality rule bundle: the pure part (no DOM).
 *
 * "Do the same thing to both sides": the student arms a relation's sign (=, <,
 * >) with an operation (add, multiply on the left or right) and applies it with
 * a copied expression from the session clipboard. What it does to the relation
 * comes from the relation's definition; multiplying an inequality by an
 * expression of unknown sign first asks the student for the sign (E4d). The Engine is
 * relations/applyToBothSides.js; the clipboard operand is passed in
 * as request data, so neither the registry nor the Engine reads the clipboard.
 * Interaction is in ./install.js. (Symmetry, swapping the sides, is also in
 * the bundle; it is an immediate history step, not a registry entry.)
 */
import { applyFunctionToEquality } from '../../engine/relations/applyToBothSides.js';
import { isRelationNode } from '../../engine/nodeRegistry.js';
import { RELATIONS } from '../../definitions/relations/relations.js';
import { equalityFunctionActionRequest } from './gesture.js';
import { describeEqualityApplicationPreview, describeEqualityApplicationFeedback } from './visual.js';

export const EQUALITY_RULE_IDS = Object.freeze(['equality.apply-function']);

export const equalityFeatures = Object.freeze([
  { id: 'equality.apply-function',
    // Every relation allows adding to both sides; the Engine checks the rest
    // (multiplying, by sign) against the relation's own definition.
    requires: [{ relation: 'acted-on', bothSides: 'add' }],
    propose(root, parameters) {
      if (!parameters || !isRelationNode(root) || root.id !== parameters.relationId ||
          !parameters.operandRoot) return null;
      try {
        return applyFunctionToEquality(root, parameters.operandRoot, parameters.context, {
          ...(parameters.groupingPolicy ? { groupingPolicy: parameters.groupingPolicy } : {}),
          ...(parameters.sign ? { sign: parameters.sign } : {}) });
      } catch (error) {
        // Invalid requests are refused without touching the live tree.
        if (error instanceof TypeError || error instanceof RangeError) return null;
        throw error;
      }
    },
    gesture: equalityFunctionActionRequest,
    gestures: [equalityFunctionActionRequest],
    feedback: describeEqualityApplicationFeedback,
    visual: describeEqualityApplicationPreview,
    confirmationMode: 'preview' }
]);

// One declaration per relation in the registry (=, <, >): the rule names no
// relation itself, so a new relation is served without an edit here.
export const equalityDeclarations = Object.freeze(RELATIONS.list.map(relation => Object.freeze({
  ruleId: 'equality.apply-function', kind: 'activate',
  on: Object.freeze({ role: 'operator', ownerType: relation.node }),
  description: `Do the same thing to both sides (${relation.spoken ?? relation.id})` })));
