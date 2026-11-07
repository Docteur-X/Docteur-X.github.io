/* Identity introduction is a mathematical transformation, not a DOM gesture.
 * The operation module supplies the neutral element and associativity policy;
 * this module performs a local, ID-preserving edit on an independent tree.
 * Never normalise the resulting tree here: doing so could erase the student's
 * deliberately introduced identity before they can manipulate it.
 */
import { cloneExpression, createAdd, createMultiply } from '../core/nodeFactory.js';
import { findNodeLocation, findNodeById } from '../core/treeUtils.js';
import { isAdditionAssociative, createAdditiveIdentity } from './addition.js';
import { isMultiplicationAssociative, createMultiplicativeIdentity } from './multiplication.js';

const OPERATIONS = {
  Add: { createIdentity: createAdditiveIdentity, associative: isAdditionAssociative },
  Multiply: { createIdentity: createMultiplicativeIdentity, associative: isMultiplicationAssociative }
};

/** Future structures can extend this registry with typed identity factories. */
export function getIdentityDefinition(operation) {
  return OPERATIONS[operation] || null;
}

/**
 * @param {object} root committed expression or Equal statement
 * @param {object} request either {operation,targetNodeId,side} or
 *   {operation,parentNodeId,insertionIndex} for an associative operator gap.
 * @returns {{root,identityNodeId,operation,request}|null} independent proposal
 */
export function proposeIdentityInsertion(root, request) {
  const definition = getIdentityDefinition(request?.operation);
  if (!root || !definition) return null;
  const proposal = cloneExpression(root);
  const identity = definition.createIdentity();
  if (request.parentNodeId !== undefined) {
    const parent = findNodeById(proposal, request.parentNodeId);
    if (parent?.type !== request.operation || !definition.associative() ||
        !Number.isInteger(request.insertionIndex) ||
        request.insertionIndex < 1 || request.insertionIndex >= parent.operands.length) return null;
    parent.operands.splice(request.insertionIndex, 0, identity);
  } else {
    const location = findNodeLocation(proposal, request.targetNodeId);
    if (!location || !['left', 'right'].includes(request.side)) return null;
    // If the parent is the same associative operation, insert a sibling;
    // otherwise wrap only the targeted subtree, preserving its original ID.
    if (location.parent?.type === request.operation && definition.associative()) {
      const index = location.index + (request.side === 'right' ? 1 : 0);
      location.parent.operands.splice(index, 0, identity);
    } else {
      const operands = request.side === 'left'
        ? [identity, location.node] : [location.node, identity];
      const wrapper = request.operation === 'Add'
        ? createAdd(operands) : createMultiply(operands);
      const parent = location.parent;
      if (!parent) return null; // Root is a statement or parser Add container.
      if (typeof location.index === 'number') parent.operands[location.index] = wrapper;
      else parent[location.index] = wrapper;
    }
  }
  return { root: proposal, identityNodeId: identity.id,
    operation: request.operation, request: { ...request } };
}
