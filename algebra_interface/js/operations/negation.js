/**
 * Explicit negation transformations. Pure mathematical operations: no DOM,
 * gesture coordinates, history or persistence. All rewrites are performed on
 * a detached tree and preserve the existing operand's occurrence identity.
 *
 * Negate(X) -> Multiply(-1, X) is valid for the current scalar algebra.
 * A later type/assumptions engine must check scalar multiplication support
 * before extending this rule to other mathematical structures.
 */
import { createMultiply, createNegate, createNumber } from '../core/nodeFactory.js';
import { findNodeLocation } from '../core/treeUtils.js';

function replaceAt(location, root, replacement) {
  const { parent, index } = location;
  if (!parent) return replacement;
  if (Array.isArray(parent.operands)) parent.operands[index] = replacement;
  else if (parent.type === 'Equal') parent[index] = replacement;
  else if (index === 'operand') parent.operand = replacement;
  else throw new TypeError('Unsupported mathematical parent.');
  return root;
}

export function proposeExpandNegation(root, { negateNodeId } = {}) {
  if (!root || typeof negateNodeId !== 'string') return null;
  const detached = structuredClone(root);
  const location = findNodeLocation(detached, negateNodeId);
  if (location?.node?.type !== 'Negate') return null;
  const operand = location.node.operand;
  const minusOne = createNumber(-1);
  const replacement = createMultiply([minusOne, operand]);
  return { root: replaceAt(location, detached, replacement),
    affectedNodeIds: [negateNodeId], insertedNodeIds: [minusOne.id],
    rule: 'negation.expand' };
}

/**
 * Compress a factor -1 onto a chosen sibling operand. Explicit Group targets
 * remain intact, including Group(Number(-3)); ungrouped numeric targets are
 * intentionally excluded so ordinary numerical multiplication wins.
 */
export function proposeCompressNegation(root, { minusOneId, targetNodeId } = {}) {
  if (!root || !minusOneId || !targetNodeId || minusOneId === targetNodeId) return null;
  const detached = structuredClone(root);
  const source = findNodeLocation(detached, minusOneId);
  const target = findNodeLocation(detached, targetNodeId);
  if (!source || !target || source.node.type !== 'Number' || source.node.value !== -1 ||
      source.parent?.type !== 'Multiply' || source.parent !== target.parent ||
      target.node.type === 'Number') return null;
  const factors = source.parent.operands;
  const targetIndex = factors.findIndex(n => n.id === targetNodeId);
  const sourceIndex = factors.findIndex(n => n.id === minusOneId);
  if (targetIndex < 0 || sourceIndex < 0) return null;
  const negation = createNegate(target.node);
  factors[targetIndex] = negation;
  factors.splice(sourceIndex, 1);
  // When only one factor remains, replace the redundant product wrapper.
  const productLocation = findNodeLocation(detached, source.parent.id);
  const result = factors.length === 1 ? replaceAt(productLocation, detached, factors[0]) : detached;
  return { root: result, affectedNodeIds: [minusOneId, targetNodeId], insertedOperatorOwnerIds: [negation.id], rule: 'negation.compress' };
}
