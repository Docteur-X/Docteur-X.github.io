/**
 * Rule-adapter boundary for a settled ordinary drag target.
 *
 * This module decides WHICH existing rule to ask, never whether an algebraic
 * transformation is correct on its own. Each callback must consult the live
 * mathematical model. The caller still revalidates at preview/commit time.
 * No DOM, geometry, mutation, history or preview dependencies belong here.
 *
 * A missing callback, unknown target or exception fails closed. This prevents
 * a partially migrated gesture from accidentally becoming an eligible drop.
 */
export function validateOrdinaryDragTarget({ target, rules } = {}) {
  if (!target || typeof target !== 'object' || !rules || typeof rules !== 'object') return false;
  const kind = target.kind;
  try {
    // Every drop-target kind is contributed by a rule bundle (stage 4) and
    // validated by that rule, through the generic `ruleTarget(kind)` adapter.
    return typeof rules.ruleTarget === 'function' && rules.ruleTarget(kind) === true;
  } catch { return false; }
}
