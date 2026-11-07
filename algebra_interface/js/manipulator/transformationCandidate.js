/**
 * Read the materialized mathematical result from a registered proposal.
 *
 * Some historical features produce eligibility-only plans, while others
 * produce a complete AST. Do not force eager materialization on every hover:
 * that would be wasteful on low-end devices. This small accessor provides a
 * stable contract without silently changing legacy feature result formats.
 */
export function materializedRoot(candidate) {
  const result = candidate?.result;
  return result?.root ?? result?.proposal?.root ?? null;
}

export function candidateStage(candidate) {
  if (!candidate?.result) return 'absent';
  return materializedRoot(candidate) ? 'materialized' : 'eligibility';
}
