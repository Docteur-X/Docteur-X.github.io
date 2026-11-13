/**
 * Cancel-inverses rule bundle: the pure part (no DOM). Division stage D3.
 *
 * Dropping a factor onto its inverse in the same product (b onto ÷b, or ÷b
 * onto b) replaces the pair with 1, assuming b ≠ 0 (./engine.js). Immediate,
 * like numeric combination: the green glow while dragging is the preview.
 * The rule ID is stored in history, so it never changes (decision 3.2).
 */
import { cancelInverses } from './engine.js';
import { expressionToDisplayString } from '../../engine/parser.js';
import { findNodeById, walkExpression } from '../../engine/treeUtils.js';

export const CANCEL_INVERSES_RULE_IDS = Object.freeze(['multiplication.cancel-inverses']);

export function cancelInversesActionRequest({ sourceId, targetId }) {
  if (![sourceId, targetId].every(value => typeof value === 'string' && value.length) ||
      sourceId === targetId) return null;
  return Object.freeze({ ruleId: 'multiplication.cancel-inverses', parameters: Object.freeze({ sourceId, targetId }) });
}

/** Words for the glow hint, the history label and the status line. */
export function describeCancelInverses(root, sourceId, targetId, assumptions = []) {
  // Name the pair in the order it appears (b · ÷b), whichever was dragged.
  const order = [];
  walkExpression(root, node => order.push(node.id));
  const [first, second] = [sourceId, targetId].sort((x, y) => order.indexOf(x) - order.indexOf(y))
    .map(id => findNodeById(root, id));
  const pair = first && second
    ? `${expressionToDisplayString(first)} · ${expressionToDisplayString(second)}` : 'the pair';
  const condition = assumptions.map(a => a.text).join(', ');
  const ifCondition = condition ? ', if ' + condition : '';
  return Object.freeze({
    hint: `${pair} = 1${ifCondition}`,
    actionLabel: `Cancelled ${pair} to 1`,
    status: `${pair} = 1, assuming ${condition || 'the divisor is not 0'}: a number times its inverse is 1. The assumption is kept with this step in history.`
  });
}

export const cancelInversesFeatures = Object.freeze([
  { id: 'multiplication.cancel-inverses',
    requires: [{ operation: 'Multiply', properties: ['inverses'] }],
    propose(root, parameters) {
      if (!parameters) return null;
      return cancelInverses(root, parameters.sourceId, parameters.targetId, parameters.substitutions ?? {});
    },
    gesture: cancelInversesActionRequest,
    visual: candidate => Object.freeze({ kind: 'cancel-inverses', oneId: candidate?.oneId ?? null,
      label: 'A factor times its inverse is 1' }),
    confirmationMode: 'immediate' }
]);

// Declared for every kind of factor except a plain number: numeric pairs are
// numeric combination's (patterns match equal values only, hence one each).
export const cancelInversesDeclarations = Object.freeze(['Symbol', 'Group', 'Invert', 'Negate', 'Apply'].map(nodeType =>
  Object.freeze({ ruleId: 'multiplication.cancel-inverses', kind: 'drag',
    on: { role: 'occurrence', nodeType, parentType: 'Multiply' },
    onto: { role: 'occurrence', parentType: 'Multiply' },
    description: 'Drag a factor onto its inverse (b onto ÷b) in the same product: together they make 1, assuming b ≠ 0' })));
