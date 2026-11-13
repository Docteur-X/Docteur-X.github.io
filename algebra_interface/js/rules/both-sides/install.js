/**
 * "Same to both sides" rule bundle: its interaction (stage 7).
 *
 * - Drag a term of an equation (a whole side, or a term of a side that is a
 *   sum) and hold it over the OTHER side: that side lights as a target, with
 *   "Release to add −b to both sides". The Engine must accept first.
 * - Release: a preview shows the equation with the opposite added to both
 *   sides, the two new terms in amber. Select an amber term or Confirm to
 *   commit one history step; Cancel, Escape or a click elsewhere cancels.
 *
 * Uses only the rule context (see js/rules/negation/install.js for the list).
 * Nothing outside this folder knows this rule, apart from its line in
 * js/rules/bundles.js and its section in css/previews.css.
 */
import { createCandidatePreview } from '../../view/preview/candidatePreview.js';
import { bothSidesActionRequest, describeBothSidesCandidate } from './rule.js';
import { sideOfTerm, oppositeOf } from './engine.js';
import { expressionToDisplayString } from '../../engine/parser.js';
import { findNodeById } from '../../engine/treeUtils.js';
import { isRelationNode } from '../../engine/nodeRegistry.js';

export function installBothSides(ctx) {
  // --- Preview ---------------------------------------------------------------
  const previewUI = createCandidatePreview({
    name: 'both-sides', equation: ctx.view, renderCandidate: ctx.renderCandidate,
    feedback: ctx.createFeedback(), describe: candidate => describeBothSidesCandidate(candidate).label,
    onConfirm: () => confirm(),
    onCancel: () => { cancel(); ctx.setStatus('Cancelled: nothing was added to either side.'); }
  });
  const host = ctx.createPreviewHost({ owner: 'both-sides', presentation: previewUI });
  const cancel = () => host.cancel();

  const request = termId => bothSidesActionRequest({ relationId: ctx.getRoot()?.id, termId });

  function open(termId) {
    if (host.isOpen() || !ctx.viewMode.isIdle()) return;
    const action = request(termId);
    const candidate = action && ctx.propose(action);
    if (!candidate?.result?.root) return;
    try {
      host.open({ candidate, stamp: ctx.sourceStamp(),
        onShown: () => ctx.setStatus(describeBothSidesCandidate(candidate).status) });
    } catch (error) {
      ctx.setStatus(`The preview could not be shown: ${error.message}`);
    }
  }

  function confirm() {
    let outcome;
    let label = '';
    try {
      outcome = host.confirm(ctx.sourceStamp(), candidate => {
        label = describeBothSidesCandidate(candidate).opposite;
        ctx.commitTransformation({
          resultRoot: candidate.result.root,
          actionLabel: `Added ${label} to both sides`,
          transformation: candidate.result.provenance,
          operation: {
            ruleId: 'equality.add-opposite', ruleVersion: 1,
            inputs: { relationId: candidate.result.provenance.relationId },
            affectedNodeIds: candidate.result.affectedNodeIds
          }
        });
      });
    } catch (error) {
      cancel();
      ctx.setStatus(`Could not add to both sides: ${error.message}`);
      return;
    }
    cancel();
    if (outcome?.status === 'committed') {
      ctx.afterCommit();
      ctx.setStatus(`Added ${label} to both sides. The statement still holds.`);
    } else ctx.setStatus('The preview is no longer current; nothing changed.');
  }

  ctx.registerPreviewDismissal({ active: () => host.isOpen(), dismiss: cancel });
  ctx.registerRerenderCancel(() => { if (host.isOpen()) cancel(); });

  // --- Routes (standard 2) -----------------------------------------------------
  ctx.router.route({ name: 'both-sides-preview-escape', on: 'keydown', at: 'document', modes: 'preview:both-sides',
    handle: event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      cancel();
      ctx.setStatus('Cancelled: nothing was added to either side.');
    } });
  // A click outside the preview cancels it AND is consumed (decision 1.2).
  ctx.router.route({ name: 'both-sides-preview-outside', on: 'pointerdown', at: 'document-capture', modes: 'preview:both-sides',
    handle: event => {
      if (ctx.isContextChangeControl(event)) return;
      if (event.target.closest('[data-candidate-preview-actions], [data-preview-confirm]')) return;
      cancel();
      ctx.consumeOutsidePreviewClick(event);
    } });

  // --- Drop target: the other side of the equation ------------------------------
  const feedback = ctx.createFeedback();
  const FEEDBACK_OWNER = 'both-sides-drop';
  // The rendered sides, in order: [left, right] (renderer: .relation-root's
  // two .expression-root children).
  const sideElements = () => {
    const relation = ctx.view.querySelector('.relation-root');
    return relation ? [...relation.children].filter(child => child.classList.contains('expression-root')) : [];
  };

  ctx.registerDropTarget({
    kind: 'both-sides',
    enterStatus: drag => {
      const term = findNodeById(ctx.getRoot(), drag.item.id);
      return term ? `Release to add ${expressionToDisplayString(oppositeOf(term))} to both sides.` : '';
    },
    find({ drag, x, y }) {
      const root = ctx.getRoot();
      const side = isRelationNode(root) ? sideOfTerm(root, drag.item.id) : null;
      if (!side) return null;
      const other = sideElements()[side === 'left' ? 1 : 0];
      const rect = other?.getBoundingClientRect();
      if (!rect || x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
      const action = request(drag.item.id);
      if (!action || !ctx.propose(action)) return null;
      return { id: drag.item.id, element: other };
    },
    show(found) {
      const term = findNodeById(ctx.getRoot(), found.id);
      feedback.show(FEEDBACK_OWNER, [{ element: found.element, role: 'eligible',
        hint: term ? `Add ${expressionToDisplayString(oppositeOf(term))} to both sides` : '' }]);
    },
    clear() { feedback.clear(FEEDBACK_OWNER); },
    validate({ drag }) {
      const action = request(drag.item.id);
      return Boolean(action && ctx.propose(action));
    },
    drop({ sourceId, clearDrag }) {
      clearDrag();
      open(sourceId);
    }
  });

  return Object.freeze({ isOpen: () => host.isOpen(), cancel });
}
