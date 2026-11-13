/**
 * Resolve the intended drop occurrence without performing mathematics.
 *
 * Nested hitboxes matter: dropping on the numeral inside Group(Number(-3))
 * means numerical combination, while dropping on the *bracket* means the
 * outer Group. We only offer direct Multiply siblings to the mathematical
 * coordinator; its pure rule makes the final eligibility decision.
 *
 * The hit-testing adapter must never mutate the AST, attach feedback classes,
 * or decide whether negation is mathematically justified.
 */
import { findNodeById } from '../../engine/treeUtils.js';
import { isNegativeOneLiteral } from '../../engine/operations/negation.js';

export function resolveNegationCompressionTarget({ equation, root, sourceId, parentId, x, y }) {
  if (!equation || !root || !sourceId || !parentId) return null;
  // Only a genuine negative-one factor may initiate this particular gesture.
  // The full mathematical eligibility is checked again by the engine.
  const product = findNode(root, parentId);
  if (product?.type !== 'Multiply' ||
      !product.operands.some(node => node.id === sourceId && isNegativeOneLiteral(node))) return null;
  const element = document.elementFromPoint(x, y);
  if (!element || !equation.contains(element)) return null;
  // A bracket belongs to its Group; a numeral inside the Group belongs to
  // its Number. Never promote a numeral hit into its outer Group.
  const occurrence = element.closest('[data-hitbox-role="occurrence"][data-node-id]');
  if (!occurrence || !equation.contains(occurrence)) return null;
  const nodeId = occurrence.dataset.nodeId;
  if (nodeId === sourceId) return null;
  const target = product.operands.find(node => node.id === nodeId);
  if (!target || !['Group', 'Symbol'].includes(target.type)) return null;
  return { nodeId, element: occurrence };
}

// Any node in the tree, through every child slot (relation sides included).
const findNode = findNodeById;
