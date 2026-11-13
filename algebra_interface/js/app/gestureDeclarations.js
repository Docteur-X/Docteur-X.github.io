/**
 * Gesture declarations for every rule in the feature registry (standard 2).
 *
 * DATA ONLY. Each entry says which gesture a rule accepts on which labelled
 * part; it never runs the rule. The input router uses these to answer "what
 * can I do here?" (decision 2.2: guided teaching and accessibility).
 *
 * A part pattern (`on`, `onto`) is matched against the plain data that
 * js/view/partFromElement.js reads from the renderer's labels and the tree:
 *   role        'occurrence' | 'operator'
 *   nodeType    the occurrence's node type, e.g. 'Number', 'Symbol', 'Group'
 *   value       a Number's exact value, e.g. '-1'
 *   parentType  the type of the operation the occurrence sits in, e.g. 'Add'
 *   ownerType   for an operator, the type of the node it belongs to:
 *               'Add' (+), 'Negate' (−), 'Equal' (=), 'Multiply' (×)
 *   selected    true when the occurrence is in the current selection
 *
 * Each rule bundle carries its own declarations; tests/view/gesture-declarations.test.js
 * keeps them complete.
 */
import { RULE_BUNDLES } from '../rules/bundles.js';

// Each bundle carries its own declarations (js/rules/bundles.js lists them).
export const GESTURE_DECLARATIONS = Object.freeze(RULE_BUNDLES
  .flatMap(bundle => bundle.declarations)
  .map(declaration => Object.freeze({ ...declaration })));
