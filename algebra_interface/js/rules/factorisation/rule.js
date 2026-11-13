/**
 * Factorisation rule bundle: the pure part (no DOM).
 *
 * Extracting a common factor from selected matching factors: ab+ac → a(b+c)
 * (left) or ba+ca → (b+c)a (right). Two separate questions are asked:
 * is the extraction mathematically valid (operations/factorisation.js), and
 * has the student chosen an acceptable scope (teaching/factorisationPolicy.js)?
 * Interaction is in ./install.js.
 */
import { getFactorisationPlan, applyFactorisation } from '../../engine/operations/factorisation.js';
import { checkFactorisationTeachingPolicy } from '../../engine/teaching/factorisationPolicy.js';
import { normaliseWithRules } from '../../engine/normalization.js';
import { factorisationActionRequest } from './gesture.js';
import { describeFactorisationPreview } from './visual.js';

export const FACTORISATION_RULE_IDS = Object.freeze(['factorisation.left', 'factorisation.right']);

function proposeFactorisation(root, parameters) {
  const plan = getFactorisationPlan(root, parameters.sourceFactorIds);
  if (!plan || plan.direction !== parameters.direction || plan.sumId !== parameters.sumId ||
      plan.groupId !== parameters.groupId ||
      plan.productIds.join('|') !== parameters.productIds.join('|') ||
      !checkFactorisationTeachingPolicy(root, plan).allowed) return null;
  const rewritten = applyFactorisation(root, plan);
  if (!rewritten) return null;
  // One result shape, like every other rule: result.root, plus the rule's own
  // fields (extractedFactorId, provenance, plan). Clean-up C3 removed a second
  // copy under result.proposal.
  return { ...rewritten, root: normaliseWithRules(rewritten.root), plan };
}

export const factorisationFeatures = Object.freeze(FACTORISATION_RULE_IDS.map(id => ({
  // Factorising is distribution read backwards: ab + ac = a(b + c).
  id, requires: [{ operation: 'Multiply', properties: ['distributive'] }], propose: proposeFactorisation,
  gesture: factorisationActionRequest, visual: describeFactorisationPreview, confirmationMode: 'preview'
})));

export const factorisationDeclarations = Object.freeze([
  { ruleId: 'factorisation.left', kind: 'command',
    on: { role: 'occurrence', parentType: 'Multiply', selected: true },
    description: 'Take the selected common factor out at the front' },
  { ruleId: 'factorisation.right', kind: 'command',
    on: { role: 'occurrence', parentType: 'Multiply', selected: true },
    description: 'Take the selected common factor out at the back' }
].map(declaration => Object.freeze(declaration)));
