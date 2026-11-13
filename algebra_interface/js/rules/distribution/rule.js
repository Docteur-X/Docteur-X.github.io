/**
 * Distribution rule bundle: the pure part (no DOM).
 *
 * Multiplying a factor into a neighbouring bracketed sum: a(b+c) → ab+ac.
 * The Engine (operations/distribution.js) finds and checks the plan. The
 * interaction is in ./install.js.
 *
 * Note: the rule ID stored in history is `distribution.<direction>` (left or
 * right); the registry entry used for proposals is `multiplication.distribute`.
 * Both stay unchanged (decision 3.2).
 */
import { findNodeById } from '../../engine/treeUtils.js';
import { getDistributionPlan } from '../../engine/operations/distribution.js';
import { distributionActionRequest } from './gesture.js';
import { describeDistributionPreview } from './visual.js';

export const DISTRIBUTION_RULE_IDS = Object.freeze(['multiplication.distribute']);

export const distributionFeatures = Object.freeze([
  { id: 'multiplication.distribute',
    requires: [{ operation: 'Multiply', properties: ['distributive'] }],
    propose(root, plan) {
      const product = findNodeById(root, plan.productId);
      const verified = getDistributionPlan(product, plan.sourceFactorId, plan.sumId);
      return verified && verified.direction === plan.direction ? { plan: verified } : null;
    },
    gesture: distributionActionRequest, visual: describeDistributionPreview, confirmationMode: 'preview' }
]);

export const distributionDeclarations = Object.freeze([
  { ruleId: 'multiplication.distribute', kind: 'drag',
    on: { role: 'occurrence', parentType: 'Multiply' },
    onto: { role: 'operator', ownerType: 'Add' },
    description: 'Drag this factor onto the + of a bracket to multiply it out' },
  { ruleId: 'multiplication.distribute', kind: 'key', key: 'd',
    on: { role: 'occurrence', parentType: 'Multiply' },
    description: 'Press D to multiply out the neighbouring bracket' }
].map(declaration => Object.freeze(declaration)));
