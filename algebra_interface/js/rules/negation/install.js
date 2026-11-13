/**
 * Negation rule bundle: its interaction.
 *
 * `installNegation(ctx)` connects negation to one view, using only the rule
 * context `ctx` that app.js gives every rule (see RULE_CONTEXT below). It
 * never imports app.js, another rule, or application state.
 *
 * What negation does:
 * - expand: click or press Enter/Space on the minus of −(…) to preview the
 *   hidden −1 factor (decision 1.2: only from an idle view);
 * - compress: drag a −1 factor onto a neighbouring Symbol or bracket to
 *   preview writing it as a minus sign;
 * - both open a preview through the shared preview host; confirm commits
 *   one history step, Escape or Cancel leaves everything unchanged.
 *
 * RULE_CONTEXT (what app.js supplies; generic, the same for every rule):
 *   view, viewId, viewMode, router          the view and its input router
 *   resolver                                semantic target resolver
 *   getRoot(), activeObjectId()             the current mathematics
 *   propose(request)                        the transformation coordinator; returns a
 *                                           candidate { action, result, confirmationMode }:
 *                                           the Engine's result is candidate.result
 *   sourceStamp(), isSourceCurrent(stamp)   freshness of the mathematics
 *   intentArbiter                           the shared intent arbiter
 *   renderCandidate(root)                   detached rendering of a tree
 *   createPreviewHost({ owner, presentation })
 *   createFeedback()                        a Visual Feedback Controller
 *   commitTransformation({ resultRoot, actionLabel, operation })
 *   afterCommit()                           re-sync input and re-render
 *   setStatus(text)
 *   registerDropTarget(contributor)         a drop-target kind for ordinary drags:
 *     { kind, validate({ drag, target }), drop({ drag, target, sourceId, targetId, clearDrag }),
 *       find?({ drag, x, y }) / show?(found) / clear?()   when the rule finds its own targets,
 *       accepts?({ drag, target })   veto a target the shared geometry suggested,
 *       canTarget?(drag, id)         answer the shared geometry's "may this glow?",
 *       enterStatus? }               message when the target becomes active
 *     `drop` must call clearDrag() itself, before or after committing.
 *   registerPreviewDismissal({ active, dismiss })
 *   registerRerenderCancel(fn)              runs before the equation re-renders
 */
import { negationRequestFromEvent } from './activation.js';
import { arbitrateNegationOperator } from './operatorArbitration.js';
import { createCandidatePreview } from '../../view/preview/candidatePreview.js';
import { describeNegationCandidate } from './visual.js';
import { resolveNegationCompressionTarget } from './compressionTarget.js';

export function installNegation(ctx) {
  // --- Preview -------------------------------------------------------------
  // Candidate DOM is managed by the inline preview controller; its amber
  // feedback uses the shared Visual Feedback Controller roles.
  const previewUI = createCandidatePreview({
    name: 'negation', equation: ctx.view, renderCandidate: ctx.renderCandidate,
    feedback: ctx.createFeedback(), describe: candidate => describeNegationCandidate(candidate).label,
    onConfirm: () => confirm(),
    onCancel: () => { cancel(); ctx.setStatus('Negation preview cancelled.'); }
  });
  const host = ctx.createPreviewHost({ owner: 'negation', presentation: previewUI });
  const cancel = () => host.cancel();

  let operatorSequence = 0;
  function open(ruleId, parameters) {
    // Only from an idle view (decision 1.2); the host also refuses otherwise.
    const root = ctx.getRoot();
    if (!root || host.isOpen() || ctx.viewMode.isPreview()) return;
    const candidate = ctx.propose({ ruleId, parameters });
    if (!candidate?.result?.root) return;
    // Click and keyboard activation share this discrete-command arbitration.
    // Compression continues through its independently validated drag path.
    if (ruleId === 'negation.expand') {
      const sourceStamp = ctx.sourceStamp();
      const decision = arbitrateNegationOperator({
        arbitrateIntents: ctx.intentArbiter,
        session: { viewId: ctx.viewId, objectId: sourceStamp.objectId,
          sessionToken: `negation-operator-${++operatorSequence}` },
        sourceValid: ctx.isSourceCurrent(sourceStamp),
        modalBlocked: !ctx.viewMode.isIdle(),
        action: { ruleId, parameters }, candidate
      });
      if (decision.status !== 'chosen') return;
    }
    // Acquire only after the Engine and the intent arbiter accept the request.
    try {
      host.open({
        candidate, stamp: ctx.sourceStamp(),
        onShown: () => ctx.setStatus(describeNegationCandidate(candidate).status)
      });
    } catch (error) {
      ctx.setStatus(`Negation preview could not be displayed: ${error.message}`);
    }
  }

  function confirm() {
    let outcome;
    try {
      outcome = host.confirm(ctx.sourceStamp(), candidate => {
        ctx.commitTransformation({
          resultRoot: candidate.result.root,
          actionLabel: candidate.action.ruleId === 'negation.expand'
            ? 'Expanded negation into a factor of -1'
            : 'Compressed -1 into unary negation',
          operation: {
            ruleId: candidate.action.ruleId, ruleVersion: 1,
            affectedNodeIds: candidate.result.affectedNodeIds
          }
        });
      });
    } catch (error) {
      cancel();
      ctx.setStatus(`Negation could not be committed: ${error.message}`);
      return;
    }
    cancel();
    if (outcome?.status === 'committed') {
      ctx.afterCommit();
      ctx.setStatus('Negation transformation committed.');
    } else ctx.setStatus('Negation preview is no longer current; try again.');
  }

  ctx.registerPreviewDismissal({ active: () => host.isOpen(), dismiss: cancel });
  ctx.registerRerenderCancel(() => { if (host.isOpen()) cancel(); });

  // --- Routes (standard 2) -------------------------------------------------
  // The minus sign is an operator, not a draggable occurrence: stop the
  // pointerdown here so the occurrence-pickup route never sees it.
  ctx.router.route({ name: 'negate-operator-shield', on: 'pointerdown', at: 'view', modes: 'any',
    handle: event => {
      if (event.target.closest('.negate-operator-hitbox, .plus[data-stands-for-minus]')) event.stopImmediatePropagation();
    } });
  // Click and Enter/Space cross the same semantic input boundary.
  function activateFromEvent(event) {
    const request = negationRequestFromEvent({
      event, view: ctx.view, resolver: ctx.resolver,
      viewId: ctx.viewId, objectId: ctx.activeObjectId()
    });
    if (!request) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(request.ruleId, request.parameters);
  }
  ctx.router.route({ name: 'negation-activate-click', on: 'click', at: 'view', modes: 'idle', handle: activateFromEvent });
  ctx.router.route({ name: 'negation-activate-key', on: 'keydown', at: 'view', modes: 'idle', handle: activateFromEvent });
  ctx.router.route({ name: 'negation-preview-escape', on: 'keydown', at: 'document', modes: 'preview:negation',
    handle: event => {
      if (event.key !== 'Escape') return;
      // Escape dismisses exactly one modal interaction. Stop propagation so
      // the window fallback doesn't also clear the student's selection.
      event.stopPropagation();
      cancel();
      ctx.setStatus('Negation preview cancelled.');
    } });

  // --- Drop target: −1 onto a neighbour ----------------------------------
  // A Number(-1) dropped onto a Symbol or explicit Group can expose a compact
  // Negate node. The target is resolved from the exact nested DOM target
  // (bracket vs numeral), and the Engine must accept it before it glows.
  const feedback = ctx.createFeedback();
  const FEEDBACK_OWNER = 'negation-compression-drop';
  const request = (sourceId, targetId) => ({
    ruleId: 'negation.compress', parameters: { minusOneId: sourceId, targetNodeId: targetId }
  });
  ctx.registerDropTarget({
    kind: 'negation-compress',
    enterStatus: 'Release to negate this expression using the factor -1.',
    find({ drag, x, y }) {
      const compression = resolveNegationCompressionTarget({
        equation: ctx.view, root: ctx.getRoot(),
        sourceId: drag.item.id, parentId: drag.parentId, x, y
      });
      if (!compression || !ctx.propose(request(drag.item.id, compression.nodeId))) return null;
      return { id: compression.nodeId, element: compression.element };
    },
    show(found) {
      feedback.show(FEEDBACK_OWNER, [{ element: found.element, role: 'eligible', hint: 'Release to negate' }]);
    },
    clear() { feedback.clear(FEEDBACK_OWNER); },
    validate({ drag, target }) { return Boolean(ctx.propose(request(drag.item.id, target.id))); },
    drop({ sourceId, targetId, clearDrag }) {
      clearDrag();
      open('negation.compress', request(sourceId, targetId).parameters);
    }
  });

  return Object.freeze({ isOpen: () => host.isOpen(), cancel });
}
