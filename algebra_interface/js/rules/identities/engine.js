/**
 * The identity engine (stage E4b): applies any identity of the registry.
 * Pure: no DOM. The patterns are the identities' own two sides, read once
 * with the parser; matching and rebuilding are js/engine/patterns.js.
 */
import { IDENTITIES } from './identities.js';
import { parseExpression } from '../../engine/parser.js';
import { matchPattern, instantiate } from '../../engine/patterns.js';
import { buildPattern, cloneExpression } from '../../engine/nodeFactory.js';
import { findNodeLocation, replaceNodeAtLocation, walkExpression } from '../../engine/treeUtils.js';
import { normaliseWithRules } from '../../engine/normalization.js';

const sides = new Map();
export function sidesOf(identity) {
  // Patterns take pattern-n IDs, not document IDs (js/engine/nodeFactory.js buildPattern).
  if (!sides.has(identity.id)) sides.set(identity.id, buildPattern(() => ({ lhs: parseExpression(identity.lhs), rhs: parseExpression(identity.rhs) })));
  return sides.get(identity.id);
}
const idsOf = root => { const ids = new Set(); walkExpression(root, node => ids.add(node.id)); return ids; };

/** Use one identity on the node `nodeId`, in one direction. Null when it does not apply. */
export function applyIdentity(root, { identityId, nodeId, direction } = {}) {
  const identity = IDENTITIES.get(identityId);
  if (!root || !identity || !identity.directions.includes(direction)) return null;
  const { lhs, rhs } = sidesOf(identity);
  const [from, to] = direction === 'expand' ? [lhs, rhs] : [rhs, lhs];
  const proposal = cloneExpression(root);
  const location = findNodeLocation(proposal, nodeId);
  if (!location) return null;
  const bindings = matchPattern(from, location.node, identity.variables);
  if (!bindings) return null;
  const replacement = instantiate(to, bindings, identity.variables);
  let next = proposal;
  if (location.parent) { if (!replaceNodeAtLocation(location, replacement)) return null; }
  else next = replacement;
  next = normaliseWithRules(next);
  const before = idsOf(root);
  return {
    root: next,
    insertedNodeIds: [...idsOf(replacement)].filter(id => !before.has(id)),
    affectedNodeIds: [nodeId],
    provenance: { identityId, direction, nodeId }
  };
}

/** Every identity (and direction) that applies at `nodeId`, in registry order. */
export function identitiesAt(root, nodeId) {
  return IDENTITIES.list.flatMap(identity => identity.directions
    .filter(direction => applyIdentity(root, { identityId: identity.id, nodeId, direction }))
    .map(direction => ({ identityId: identity.id, direction })));
}
