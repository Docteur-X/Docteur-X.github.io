/**
 * Build a detached rearrangement candidate for the shared commit gate.
 *
 * The hover proposal intentionally contains only an ordered list of node IDs:
 * it must stay cheap and never modify mathematics during pointer movement.
 * At drop or keyboard activation we clone the authoritative AST, revalidate
 * the rule on that clone, and optionally apply the existing pointer-only
 * normalization policy. The original node IDs survive the reordering.
 *
 * This helper is DOM-free and does not append history or write persistence.
 */
import { cloneExpression } from '../core/nodeFactory.js';
import { normaliseWithRules } from '../core/normalization.js';
import { applyRearrangement } from './rearrangementRule.js';

export function prepareRearrangementCommitCandidate(root, candidate, { normalise = false } = {}) {
  if (!root || !candidate?.result?.changed || !candidate?.action?.parameters) return null;
  const detachedRoot = cloneExpression(root);
  if (!applyRearrangement(detachedRoot, candidate.action.parameters)) return null;
  return {
    action: candidate.action,
    result: { root: normalise ? normaliseWithRules(detachedRoot) : detachedRoot }
  };
}
