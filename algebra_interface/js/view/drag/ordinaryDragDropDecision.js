/**
 * Authoritative, side-effect-free-to-the-AST decision boundary for a settled
 * ordinary drag. The supplied eligibility callback must query live rules;
 * this function never treats visual hover feedback as permission to commit.
 *
 * The arbiter is injected to retain the application's existing intent policy.
 * A malformed or failed arbitration is rejected rather than interpreted as a
 * successful transformation. The caller still revalidates on commit.
 */
export function decideOrdinaryDragDrop({
  commit, moved, drag, target, sourceValid, modalBlocked,
  arbitrate, validate
} = {}) {
  if (!commit || !moved) return { status: 'not-required' };
  if (!drag || !target || typeof arbitrate !== 'function' ||
      typeof validate !== 'function' || sourceValid !== true || modalBlocked) {
    return { status: 'blocked' };
  }
  try {
    const decision = arbitrate({ drag, target, sourceValid, modalBlocked, validate });
    // 'none' (no target under the pointer, e.g. a whole equation side dropped
    // back on itself) is a plain cancel, not a stale drag: pass it through so
    // the student reads "Move cancelled", not "no longer valid".
    return decision && ['chosen', 'blocked', 'rejected', 'none'].includes(decision.status)
      ? decision : { status: 'blocked' };
  } catch {
    return { status: 'blocked' };
  }
}
