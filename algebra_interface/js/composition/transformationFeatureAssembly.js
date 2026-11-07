/** Application composition of mathematical Transformation Features.
 * The registry is a lookup mechanism, not an Engine or a gesture resolver.
 * Keep proposal validation here so app.js does not grow with every new rule.
 */
import { expandNegationAction, compressNegationAction } from '../manipulator/negationGesture.js';
import { describeNegationCandidate } from '../manipulator/negationVisual.js';
import { proposeExpandNegation, proposeCompressNegation } from '../operations/negation.js';
import { createTransformationFeatureRegistry } from '../manipulator/transformationFeatures.js';
import { applyFunctionToEquality } from '../relations/equalityFunctionApplication.js';
import { equalityFunctionActionRequest } from '../manipulator/equalityFunctionGesture.js';
import { describeEqualityApplicationPreview, describeEqualityApplicationFeedback } from '../manipulator/equalityFunctionVisual.js';
import { proposeIdentityInsertion } from '../operations/identityInsertion.js';
import { interpretIdentityPointer } from '../manipulator/identityGesture.js';
import { describeIdentityPreview } from '../manipulator/identityVisual.js';
import { distributionActionRequest } from '../manipulator/distributionGesture.js';
import { describeDistributionPreview } from '../manipulator/distributionVisual.js';
import { groupingActionRequest } from '../manipulator/groupingGesture.js';
import { describeGroupingPreview } from '../manipulator/groupingVisual.js';
import { factorisationActionRequest } from '../manipulator/factorisationGesture.js';
import { describeFactorisationPreview } from '../manipulator/factorisationVisual.js';
import { rearrangementActionRequest } from '../manipulator/rearrangementGesture.js';
import { describeRearrangementFeedback } from '../manipulator/rearrangementVisual.js';
import { proposeRearrangement } from '../manipulator/rearrangementRule.js';
import { findNodeById } from '../core/treeUtils.js';
import { getDistributionPlan } from '../operations/distribution.js';
import { getRangeGroupingPlan, groupOperandRange } from '../operations/grouping.js';
import { getFactorisationPlan, applyFactorisation } from '../operations/factorisation.js';
import { checkFactorisationTeachingPolicy } from '../teaching/factorisationPolicy.js';
import { normaliseWithRules } from '../core/normalization.js';
import { prepareNumericCombinationCommitCandidate } from '../manipulator/numericCombinationCommitCandidate.js';
import { numericCombinationActionRequest, describeNumericCombinationFeedback } from '../manipulator/numericCombinationGesture.js';

function proposeFactorisation(root, parameters) {
  const plan = getFactorisationPlan(root, parameters.sourceFactorIds);
  if (!plan || plan.direction !== parameters.direction || plan.sumId !== parameters.sumId ||
      plan.groupId !== parameters.groupId ||
      plan.productIds.join('|') !== parameters.productIds.join('|') ||
      !checkFactorisationTeachingPolicy(root, plan).allowed) return null;
  const rewritten = applyFactorisation(root, plan);
  if (!rewritten) return null;
  const proposal = { ...rewritten, root: normaliseWithRules(rewritten.root), plan };
  // The shared commit gate expects result.root, while older visual adapters
  // consume result.proposal. Expose both without changing either contract.
  return { root: proposal.root, plan, proposal };
}

export function createApplicationTransformationFeatures() {
  return createTransformationFeatureRegistry([
    { id: 'negation.expand', propose: proposeExpandNegation, gesture: expandNegationAction, visual: describeNegationCandidate, confirmationMode: 'preview' },
    { id: 'negation.compress', propose: proposeCompressNegation, gesture: compressNegationAction, visual: describeNegationCandidate, confirmationMode: 'preview' },
    // This rule used to be called directly from app.js. The composition
    // layer now owns the adapter, Engine and visual-descriptor wiring, just
    // like the older rules. The clipboard is passed as a captured operand;
    // neither this registry nor the Engine reads session clipboard state.
    { id: 'equality.apply-function',
      propose(root, parameters) {
        if (!parameters || root?.type !== 'Equal' || root.id !== parameters.relationId ||
            !parameters.operandRoot) return null;
        try {
          return applyFunctionToEquality(root, parameters.operandRoot, parameters.context,
            parameters.groupingPolicy ? { groupingPolicy: parameters.groupingPolicy } : {});
        } catch (error) {
          // Invalid mathematical requests are rejected without touching the
          // authoritative AST. Other features likewise return null on refusal.
          if (error instanceof TypeError || error instanceof RangeError) return null;
          throw error;
        }
      },
      gesture: equalityFunctionActionRequest,
      gestures: [equalityFunctionActionRequest],
      feedback: describeEqualityApplicationFeedback,
      visual: describeEqualityApplicationPreview,
      confirmationMode: 'preview' },
    { id: 'identity.introduce', propose: proposeIdentityInsertion,
      gesture: interpretIdentityPointer, visual: describeIdentityPreview, confirmationMode: 'preview' },
    { id: 'multiplication.distribute',
      propose(root, plan) {
        const product = findNodeById(root, plan.productId);
        const verified = getDistributionPlan(product, plan.sourceFactorId, plan.sumId);
        return verified && verified.direction === plan.direction ? { plan: verified } : null;
      },
      gesture: distributionActionRequest, visual: describeDistributionPreview, confirmationMode: 'preview' },
    { id: 'grouping.range',
      propose(root, parameters) {
        const verified = getRangeGroupingPlan(root, parameters.operandIds);
        return verified && verified.parentId === parameters.parentId &&
          verified.parentType === parameters.parentType &&
          verified.operandIds.length === parameters.operandIds.length &&
          verified.operandIds.every((id, index) => id === parameters.operandIds[index])
          ? (() => {
              // Prepare a complete candidate on detached data. The grouping
              // rule mutates its input AST, so NEVER run it on the live root
              // during preview. The preview's blue envelope remains purely UI.
              const detached = structuredClone(root);
              const grouped = groupOperandRange(detached, verified.operandIds, parameters.bracketStyle);
              return grouped ? {
                plan: verified,
                root: normaliseWithRules(detached),
                provenance: grouped.provenance,
                groupId: grouped.group.id
              } : null;
            })() : null;
      },
      gesture: groupingActionRequest, visual: describeGroupingPreview, confirmationMode: 'preview' },
    { id: 'factorisation.left', propose: proposeFactorisation,
      gesture: factorisationActionRequest, visual: describeFactorisationPreview, confirmationMode: 'preview' },
    { id: 'factorisation.right', propose: proposeFactorisation,
      gesture: factorisationActionRequest, visual: describeFactorisationPreview, confirmationMode: 'preview' },
    // Numerical calculation uses immediate drop confirmation. Both operations
    // share a detached candidate builder, but retain distinct stable rule IDs.
    // The existing live pointer handler is intentionally not rewired in v3:
    // registration makes the capabilities discoverable without changing UX.
    ...['addition.combine-numeric', 'multiplication.combine-numeric'].map(id => ({
      id, confirmationMode: 'immediate',
      gesture: numericCombinationActionRequest,
      visual: describeNumericCombinationFeedback,
      propose(root, parameters) {
        const candidate = prepareNumericCombinationCommitCandidate(root, parameters);
        return candidate?.action.ruleId === id ? { ...candidate.result, actionLabel: candidate.actionLabel, resultText: candidate.resultText } : null;
      }
    })),
    { id: 'addition.rearrange', propose: proposeRearrangement,
      gesture: rearrangementActionRequest, visual: describeRearrangementFeedback, confirmationMode: 'immediate' },
    { id: 'multiplication.rearrange', propose: proposeRearrangement,
      gesture: rearrangementActionRequest, visual: describeRearrangementFeedback, confirmationMode: 'immediate' }
  ]);
}
