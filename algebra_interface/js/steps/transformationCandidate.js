/**
 * Read the materialized mathematical result from a registered proposal.
 *
 * Some features return an eligibility-only plan while hovering, others a
 * complete tree. Do not force eager materialization on every hover: that would
 * be wasteful on low-end devices. A materialized result is always result.root
 * (since clean-up C3 every rule uses that one shape).
 */
export function materializedRoot(candidate) {
  return candidate?.result?.root ?? null;
}

export function candidateStage(candidate) {
  if (!candidate?.result) return 'absent';
  return materializedRoot(candidate) ? 'materialized' : 'eligibility';
}
