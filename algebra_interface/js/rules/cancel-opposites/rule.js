/**
 * Cancel-opposites rule bundle: the pure part (no DOM).
 *
 * Dropping a term onto its opposite in the same sum replaces the pair with 0
 * (./engine.js), immediately, like numeric combination: the green glow while
 * dragging is the preview. Interaction is in ./install.js.
 * The rule ID is stored in history, so it never changes (decision 3.2).
 */
import { cancelOpposites } from './engine.js';
import { expressionToDisplayString } from '../../engine/parser.js';
import { findNodeById } from '../../engine/treeUtils.js';

export const CANCEL_OPPOSITES_RULE_IDS = Object.freeze(['addition.cancel-opposites']);

/** DOM-free gesture interpretation: which term was dropped onto which. */
export function cancelOppositesActionRequest({ sourceId, targetId }) {
  if (![sourceId, targetId].every(value => typeof value === 'string' && value.length) ||
      sourceId === targetId) return null;
  return Object.freeze({ ruleId: 'addition.cancel-opposites', parameters: Object.freeze({ sourceId, targetId }) });
}

/** Words for the glow hint, the history label and the status line. */
export function describeCancelOpposites(root, sourceId, targetId) {
  const [first, second] = [sourceId, targetId].map(id => findNodeById(root, id));
  const pair = first && second
    ? `${expressionToDisplayString(first)} + ${expressionToDisplayString(second)}` : 'the pair';
  return Object.freeze({
    hint: `${pair} = 0`,
    actionLabel: `Cancelled ${pair} to 0`,
    status: `${pair} = 0: a term and its opposite add to zero. Drag the 0 onto another term to remove it.`
  });
}

export const cancelOppositesFeatures = Object.freeze([
  { id: 'addition.cancel-opposites',
    requires: [{ operation: 'Add', properties: ['inverses'] }],
    propose(root, parameters) {
      if (!parameters) return null;
      return cancelOpposites(root, parameters.sourceId, parameters.targetId, parameters.substitutions ?? {});
    },
    gesture: cancelOppositesActionRequest,
    // The visual contract every feature meets: what the result shows. Immediate,
    // so the green drop glow (install.js) is the only preview.
    visual: candidate => Object.freeze({ kind: 'cancel-opposites', zeroId: candidate?.zeroId ?? null,
      label: 'A term and its opposite make 0' }),
    confirmationMode: 'immediate' }
]);

export const cancelOppositesDeclarations = Object.freeze([
  { ruleId: 'addition.cancel-opposites', kind: 'drag',
    on: { role: 'occurrence', parentType: 'Add' },
    onto: { role: 'occurrence', parentType: 'Add' },
    description: 'Drag a term onto its opposite in the same sum: together they make 0' }
].map(declaration => Object.freeze(declaration)));
