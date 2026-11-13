/**
 * Identity rules bundle: the pure part (stage E4b). One registry entry per
 * identity, all served by the same engine, and one gesture declaration per
 * direction: tap the operator of the side to change (the function name of
 * sin(a+b); the + of the expanded sum).
 */
import { IDENTITIES } from './identities.js';
import { applyIdentity, sidesOf } from './engine.js';
import { expressionToDisplayString } from '../../engine/parser.js';

export function describeIdentityCandidate(candidate) {
  const identity = IDENTITIES.get(candidate?.action?.parameters?.identityId);
  const label = identity?.label ?? 'identity';
  return Object.freeze({
    label: `Use ${label}`,
    status: `Preview: ${label}. Select an amber part or Confirm; Cancel or Escape leaves the expression unchanged.`,
    committed: `Used ${label}.`
  });
}

export const IDENTITY_RULE_IDS = Object.freeze(IDENTITIES.list.map(identity => identity.id));

export const identityRuleFeatures = Object.freeze(IDENTITIES.list.map(identity => Object.freeze({
  id: identity.id,
  requires: identity.requires,
  propose: (root, parameters) => applyIdentity(root, { ...parameters, identityId: identity.id }),
  // A DOM-free request: which node, which way (from a tap, a key or a menu).
  gesture: target => target?.nodeId && identity.directions.includes(target.direction)
    ? Object.freeze({ ruleId: identity.id, parameters: Object.freeze({ nodeId: target.nodeId, direction: target.direction }) })
    : null,
  visual: describeIdentityCandidate,
  confirmationMode: 'preview'
})));

export const identityRuleDeclarations = Object.freeze(IDENTITIES.list.flatMap(identity => identity.directions.map(direction => {
  const { lhs, rhs } = sidesOf(identity);
  const from = direction === 'expand' ? lhs : rhs;
  const to = direction === 'expand' ? rhs : lhs;
  return Object.freeze({ ruleId: identity.id, kind: identity.interaction,
    on: Object.freeze({ role: 'operator', ownerType: from.type }),
    description: `Tap to rewrite ${expressionToDisplayString(from)} as ${expressionToDisplayString(to)}` });
})));
