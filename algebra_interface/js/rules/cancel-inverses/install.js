/**
 * Cancel-inverses rule bundle: its interaction. Division stage D3.
 *
 * Drag a factor onto its inverse in the same product (b onto ÷b, or ÷b, by
 * its ÷ sign, onto b). While the pointer is over it, it glows green with
 * "b · ÷b = 1, if b ≠ 0"; releasing commits one history step immediately,
 * with the assumption b ≠ 0 kept beside the step and shown on the status line.
 *
 * Uses only the rule context (see js/rules/negation/install.js for the list).
 * The twin of js/rules/cancel-opposites/install.js.
 */
import { cancelInversesActionRequest, describeCancelInverses } from './rule.js';

export function installCancelInverses(ctx) {
  const feedback = ctx.createFeedback();
  const FEEDBACK_OWNER = 'cancel-inverses-drop';
  const propose = (sourceId, targetId) => {
    const action = cancelInversesActionRequest({ sourceId, targetId });
    return action ? ctx.propose({ ...action,
      parameters: { ...action.parameters, substitutions: ctx.substitutions() } }) : null;
  };

  /** The sibling factor under the pointer (same product as the dragged one), if any. */
  function siblingUnder(drag, x, y) {
    // Over ÷b the nearest part may be the b INSIDE it; walk up to the factor.
    let occurrence = document.elementFromPoint(x, y)?.closest?.('[data-hitbox-role="occurrence"][data-node-id]');
    while (occurrence && ctx.view.contains(occurrence) && occurrence.dataset.parentId !== drag.parentId) {
      occurrence = occurrence.parentElement?.closest('[data-hitbox-role="occurrence"][data-node-id]');
    }
    if (!occurrence || !ctx.view.contains(occurrence) || occurrence.dataset.nodeId === drag.item.id) return null;
    return { id: occurrence.dataset.nodeId, element: occurrence };
  }

  ctx.registerDropTarget({
    kind: 'cancel-inverses',
    enterStatus: drag => {
      const target = drag.activeTarget?.id;
      const result = target ? propose(drag.item.id, target)?.result : null;
      return result ? `Release: ${describeCancelInverses(ctx.getRoot(), drag.item.id, target, result.assumptions).hint}.` : '';
    },
    find({ drag, x, y }) {
      const sibling = siblingUnder(drag, x, y);
      const result = sibling ? propose(drag.item.id, sibling.id)?.result : null;
      return result ? { id: sibling.id, element: sibling.element, sourceId: drag.item.id, assumptions: result.assumptions } : null;
    },
    show(found) {
      feedback.show(FEEDBACK_OWNER, [{ element: found.element, role: 'eligible',
        hint: describeCancelInverses(ctx.getRoot(), found.sourceId, found.id, found.assumptions).hint }]);
    },
    clear() { feedback.clear(FEEDBACK_OWNER); },
    validate({ drag, target }) { return Boolean(propose(drag.item.id, target.id)); },
    drop({ sourceId, targetId, clearDrag }) {
      clearDrag();
      if (!ctx.viewMode.isIdle()) return;
      const root = ctx.getRoot();
      // ctx.propose returns a candidate; the Engine's result is candidate.result.
      const result = propose(sourceId, targetId)?.result;
      if (!result?.root) { ctx.setStatus('These two factors are not a number and its inverse; nothing changed.'); return; }
      const words = describeCancelInverses(root, sourceId, targetId, result.assumptions);
      ctx.commitTransformation({
        resultRoot: result.root,
        actionLabel: words.actionLabel,
        transformation: result.provenance,
        assumptions: result.assumptions.map(({ kind, text }) => ({ kind, text })),
        operation: { ruleId: 'multiplication.cancel-inverses', ruleVersion: 1, affectedNodeIds: result.affectedNodeIds }
      });
      ctx.afterCommit();
      ctx.setStatus(words.status);
    }
  });
}
