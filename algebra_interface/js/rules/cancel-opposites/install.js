/**
 * Cancel-opposites rule bundle: its interaction.
 *
 * Drag a term onto its opposite in the same sum (b onto −b, or −b onto b).
 * While the pointer is over the opposite, it glows green with "b + −b = 0";
 * releasing commits one history step immediately (like numeric combination).
 * Numeric pairs are numeric combination's (the Engine refuses them here).
 *
 * Uses only the rule context (see js/rules/negation/install.js for the list).
 * Nothing outside this folder knows this rule, apart from its line in
 * js/rules/bundles.js.
 */
import { cancelOppositesActionRequest, describeCancelOpposites } from './rule.js';

export function installCancelOpposites(ctx) {
  const feedback = ctx.createFeedback();
  const FEEDBACK_OWNER = 'cancel-opposites-drop';
  const propose = (sourceId, targetId) => {
    const action = cancelOppositesActionRequest({ sourceId, targetId });
    return action ? ctx.propose({ ...action,
      parameters: { ...action.parameters, substitutions: ctx.substitutions() } }) : null;
  };

  /** The sibling occurrence under the pointer (same sum as the dragged term), if any. */
  function siblingUnder(drag, x, y) {
    // Walk up from the element under the pointer: over −b the nearest part is
    // the b INSIDE the negation; the term of the same sum is its ancestor.
    let occurrence = document.elementFromPoint(x, y)?.closest?.('[data-hitbox-role="occurrence"][data-node-id]');
    while (occurrence && ctx.view.contains(occurrence) && occurrence.dataset.parentId !== drag.parentId) {
      occurrence = occurrence.parentElement?.closest('[data-hitbox-role="occurrence"][data-node-id]');
    }
    if (!occurrence || !ctx.view.contains(occurrence)) return null;
    const id = occurrence.dataset.nodeId;
    if (id === drag.item.id) return null;
    return { id, element: occurrence };
  }

  ctx.registerDropTarget({
    kind: 'cancel-opposites',
    enterStatus: drag => {
      const target = drag.activeTarget?.id;
      return target ? `Release: ${describeCancelOpposites(ctx.getRoot(), drag.item.id, target).hint}.` : '';
    },
    find({ drag, x, y }) {
      const sibling = siblingUnder(drag, x, y);
      if (!sibling || !propose(drag.item.id, sibling.id)) return null;
      return { id: sibling.id, element: sibling.element, sourceId: drag.item.id };
    },
    show(found) {
      feedback.show(FEEDBACK_OWNER, [{ element: found.element, role: 'eligible',
        hint: describeCancelOpposites(ctx.getRoot(), found.sourceId, found.id).hint }]);
    },
    clear() { feedback.clear(FEEDBACK_OWNER); },
    validate({ drag, target }) { return Boolean(propose(drag.item.id, target.id)); },
    drop({ sourceId, targetId, clearDrag }) {
      clearDrag();
      // Decision 1.2: only from an idle view (the drag has just ended).
      if (!ctx.viewMode.isIdle()) return;
      const root = ctx.getRoot();
      // ctx.propose returns a candidate; the Engine's result is candidate.result.
      const result = propose(sourceId, targetId)?.result;
      if (!result?.root) { ctx.setStatus('These two terms are not opposites; nothing changed.'); return; }
      const words = describeCancelOpposites(root, sourceId, targetId);
      ctx.commitTransformation({
        resultRoot: result.root,
        actionLabel: words.actionLabel,
        transformation: result.provenance,
        operation: { ruleId: 'addition.cancel-opposites', ruleVersion: 1, affectedNodeIds: result.affectedNodeIds }
      });
      ctx.afterCommit();
      ctx.setStatus(words.status);
    }
  });
}
