/**
 * Identity rule bundle: the pure part (no DOM).
 *
 * Introducing +0 into a sum or ×1 into a product, from the identity toolbar.
 * The Engine (operations/identityInsertion.js) builds the proposed tree; the
 * interaction is in ./install.js.
 */
import { proposeIdentityInsertion } from '../../engine/operations/identityInsertion.js';
import { interpretIdentityPointer } from './gesture.js';
import { describeIdentityPreview } from './visual.js';

export const IDENTITY_RULE_IDS = Object.freeze(['identity.introduce']);

export const identityFeatures = Object.freeze([
  { id: 'identity.introduce', propose: proposeIdentityInsertion,
    gesture: interpretIdentityPointer, visual: describeIdentityPreview, confirmationMode: 'preview' }
]);

export const identityDeclarations = Object.freeze([
  { ruleId: 'identity.introduce', kind: 'drop-tool',
    on: { role: 'occurrence' },
    description: 'Drop +0 or ×1 here' },
  { ruleId: 'identity.introduce', kind: 'drop-tool',
    on: { role: 'operator', ownerType: 'Add' },
    description: 'Drop +0 on this plus sign' }
].map(declaration => Object.freeze(declaration)));
