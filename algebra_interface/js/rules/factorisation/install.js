/**
 * Factorisation rule bundle: its interaction.
 *
 * - When the selected factors can be extracted, an amber extraction zone with
 *   converging arrows appears (the overlay), and the factorisation toolbar
 *   offers "Preview left/right extraction".
 * - Dragging one of the SELECTED factors into the amber zone (view-mode owner
 *   'factor'), clicking the zone, or the toolbar button opens a preview of
 *   the complete factorised expression, laid out by the normal renderer
 *   (the shared transformationPreview). Click the new amber factor or Confirm;
 *   Escape, Cancel or a click elsewhere cancels and keeps the selection.
 *
 * The multi-selection belongs to app.js (grouping uses it too). This bundle
 * reaches it through: selectedIds(), registerSelectionDecoration,
 * registerSelectionToolbar(update), registerSelectionHint(hint),
 * registerSelectedPickup({ accepts, start }), on(event, fn) for
 * 'beforeObjectLoad', 'historyAppend' and 'abandonDrags'; plus the services
 * listed in js/rules/negation/install.js.
 */
import { getFactorisationPlan } from '../../engine/operations/factorisation.js';
import { checkFactorisationTeachingPolicy } from '../../engine/teaching/factorisationPolicy.js';
import { findNodeById } from '../../engine/treeUtils.js';
import { expressionToDisplayString } from '../../engine/parser.js';
import { createTransformationPreview } from '../../view/preview/transformationPreview.js';
import { arbitrateFactorDrop } from './dropArbitration.js';
import { createFactorisationPreview } from './overlay.js';
import { factorisationActionRequest } from './gesture.js';
import { describeFactorisationPreview } from './visual.js';
import { makeInert } from '../../view/rendering/inert.js';

const SAME_SOURCE_FIELDS = ['documentId', 'objectId', 'revision', 'rootId', 'fingerprint'];

export function installFactorisation(ctx) {
  const toolbar = ctx.ui('factorisationToolbar');
  const previewButton = ctx.ui('previewFactorisationButton');
  const previewActions = ctx.ui('factorisationPreviewActions');
  const isPreviewing = () => ctx.viewMode.isPreview('factorisation');
  const drag = () => ctx.viewMode.drag('factor');

  /** The selected factors' plan, if it is both valid and an acceptable scope. */
  function factorPlan() {
    const mathematicalPlan = getFactorisationPlan(ctx.getRoot(), ctx.selectedIds());
    return checkFactorisationTeachingPolicy(ctx.getRoot(), mathematicalPlan).allowed ? mathematicalPlan : null;
  }

  function updateToolbar() {
    const plan = factorPlan();
    toolbar.hidden = !plan && !isPreviewing();
    previewButton.hidden = isPreviewing();
    previewButton.disabled = !plan;
    previewButton.textContent = plan ? `Preview ${plan.direction} extraction` : 'Preview extraction';
    previewActions.hidden = !isPreviewing();
  }

  // The amber extraction zone and arrows: fixed-position, never edits the
  // tree or disturbs the stable hitbox geometry.
  const overlay = createFactorisationPreview(document, ctx.view, { onEnterPreview: () => enter() });
  // The generic result preview: the normal renderer lays out the candidate.
  const candidateView = createTransformationPreview(document, ctx.view, { onConfirm: () => commit() });

  let commitSucceeded = false;
  const host = ctx.createPreviewHost({
    owner: 'factorisation',
    presentation: {
      show(candidate) {
        const proposal = candidate.result;
        const visual = describeFactorisationPreview(candidate);
        if (!proposal || !visual) throw new Error('Factorisation preview cannot be presented');
        const proposedElement = ctx.createEquationElement(proposal.root);
        updateToolbar();
        overlay.clear();
        const opened = candidateView.show({
          candidateElement: proposedElement,
          sourceNodeIds: visual.sourceNodeIds,
          resultNodeId: visual.resultNodeId,
          inlineExtraction: { scopeNodeId: visual.scopeNodeId, direction: visual.direction }
        });
        if (!opened) throw new Error('Could not display factorisation preview');
        candidateView.confirmationElement?.focus({ preventScroll: true });
      },
      clear() {
        // Confirming discards the saved original DOM; cancelling restores it.
        try {
          if (commitSucceeded) candidateView.finish();
          else candidateView.cancel();
        } finally {
          commitSucceeded = false;
          overlay.clear();
          updateToolbar();
          ctx.paintSelection();
        }
      }
    }
  });

  /** Cancel through the shared host; the selected factors stay selected. */
  function cancel(showMessage = true) {
    if (!host.isOpen()) return;
    host.cancel();
    if (showMessage) ctx.setStatus('Factorisation preview cancelled; original expression, IDs and selection are unchanged.');
  }

  /**
   * Open a preview of the COMPLETE factorised expression: the committed tree
   * and history stay unchanged until confirmation.
   */
  function enter() {
    if (!ctx.viewMode.isIdle()) return;
    const action = factorisationActionRequest(factorPlan());
    const candidate = action ? ctx.propose(action) : null;
    if (!candidate) return;
    try {
      if (!host.open({ candidate, stamp: ctx.sourceStamp() })) return;
      ctx.setStatus('Factorisation preview: faded factors and persistent arrows show their extraction. Click the new amber factor or Confirm; Escape / click elsewhere cancels.');
    } catch (error) {
      ctx.setStatus(`Factorisation preview unavailable: ${error.message}`);
    }
  }

  /**
   * Confirm through the shared single-use gate. The plan is rechecked against
   * the live tree and the teaching scope: a changed selection, scope or
   * direction is never silently treated as another operation.
   */
  function commit() {
    if (!isPreviewing() || !host.isOpen()) return;
    let outcome;
    try {
      outcome = host.confirm(ctx.sourceStamp(), candidate => {
        const proposal = candidate.result;
        const original = candidate.result.plan;
        const current = getFactorisationPlan(ctx.getRoot(), candidate.action.parameters.sourceFactorIds);
        if (!proposal || !original || !current ||
            !checkFactorisationTeachingPolicy(ctx.getRoot(), current).allowed ||
            current.direction !== original.direction || current.sumId !== original.sumId ||
            current.groupId !== original.groupId ||
            current.productIds.join('|') !== original.productIds.join('|') ||
            current.sourceFactorIds.join('|') !== original.sourceFactorIds.join('|')) {
          throw new Error('Factorisation is no longer mathematically eligible.');
        }
        ctx.commitTransformation({
          resultRoot: proposal.root,
          actionLabel: 'Extracted common factor',
          transformation: proposal.provenance,
          kind: 'rule-transform',
          operation: {
            ruleId: `factorisation.${original.direction}`, ruleVersion: 1,
            inputs: { direction: original.direction, scopeNodeId: original.scopeNodeId },
            affectedNodeIds: original.sourceFactorIds
          }
        });
        ctx.setSelectedNode(proposal.extractedFactorId);
        ctx.renderHistory();
        commitSucceeded = true;
      });
    } catch (error) {
      // The gate consumed the proposal before the callback: it can't be
      // confirmed twice, even after an exception.
      cancel(false);
      ctx.setStatus(`Could not commit factorisation: ${error.message}`);
      return;
    }
    if (outcome.status !== 'committed') {
      cancel(false);
      ctx.setStatus('Factorisation proposal expired; no mathematical change was committed.');
      return;
    }
    ctx.syncInput();
    ctx.render();
    ctx.setStatus('Common factor extracted. History records which original factors contributed to the new factor.');
  }

  // --- The factor drag: a SELECTED factor into the amber zone ---------------
  // Separate from ordinary rearrangement: only the zone is a valid
  // destination, and the tree, hitboxes and history stay put.
  let dragSequence = 0;
  function startDrag(event, hitbox) {
    const plan = factorPlan();
    if (!plan || !plan.sourceFactorIds.includes(hitbox.dataset.nodeId)) return false;
    event.preventDefault();
    const rect = hitbox.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost math-scope'; // nested-box layout as in #equation (D9)
    // The decorative ghost must never intercept elementFromPoint() targeting.
    ghost.style.pointerEvents = 'none';
    const copy = hitbox.cloneNode(true);
    makeInert(copy, { hidden: true });
    // Match the source's measured size, including deeply nested Groups.
    copy.style.boxSizing = 'border-box';
    copy.style.width = `${rect.width}px`;
    copy.style.height = `${rect.height}px`;
    copy.style.minWidth = '0';
    copy.style.flex = 'none';
    ghost.append(copy);
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.visibility = 'hidden';
    document.body.append(ghost);
    const sourceStamp = ctx.sourceStamp();
    const record = {
      arbitrationViewId: ctx.viewId,
      arbitrationObjectId: sourceStamp.objectId ?? 'standalone-mathematical-object',
      arbitrationSessionToken: `factor-${++dragSequence}`,
      arbitrationSourceStamp: sourceStamp,
      pointerId: event.pointerId, sourceId: hitbox.dataset.nodeId,
      ghost, startX: event.clientX, startY: event.clientY,
      offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top,
      moved: false
    };
    // Only one thing at a time: refuse if the view is not idle.
    if (ctx.viewMode.beginDrag('factor', record) === null) {
      ghost.remove();
      return false;
    }
    return true;
  }

  function moveDrag(event) {
    const record = drag();
    if (!record || record.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - record.startX, event.clientY - record.startY);
    if (!record.moved && distance < 6) return;
    record.moved = true;
    record.ghost.style.visibility = 'visible';
    record.ghost.style.transform = `translate3d(${event.clientX - record.offsetX}px, ${event.clientY - record.offsetY}px, 0)`;
    overlay.highlightZone(overlay.isInsideZone(event.clientX, event.clientY));
  }

  function cancelDrag() {
    if (!drag()) return;
    drag().ghost.remove();
    ctx.viewMode.endDrag(ctx.viewMode.dragId('factor'));
    overlay.highlightZone(false);
  }

  function finishDrag(event, commitRelease) {
    const record = drag();
    if (!record || event.pointerId !== record.pointerId) return;
    // Geometry finds the zone; eligibility comes from the factor plan and
    // its teaching policy.
    const current = ctx.sourceStamp();
    const original = record.arbitrationSourceStamp;
    const sourceValid = Boolean(original) && SAME_SOURCE_FIELDS.every(field => original[field] === current[field]) &&
      Boolean(findNodeById(ctx.getRoot(), record.sourceId));
    const decision = arbitrateFactorDrop({
      arbitrateIntents: ctx.intentArbiter,
      drag: record,
      inZone: commitRelease === true && record.moved === true && overlay.isInsideZone(event.clientX, event.clientY),
      sourceValid,
      modalBlocked: ctx.viewMode.isPreview(),
      validate: () => Boolean(factorPlan()?.sourceFactorIds.includes(record.sourceId))
    });
    cancelDrag();
    if (decision.status === 'chosen') enter();
  }

  ctx.registerSelectedPickup({
    // A selected factor is a legitimate pickup for extraction: picking it up
    // must not clear the multi-selection.
    accepts: hitbox => Boolean(factorPlan()?.sourceFactorIds.includes(hitbox.dataset.nodeId)),
    start: startDrag
  });
  ctx.router.route({ name: 'factor-drag-move', on: 'pointermove', at: 'window', modes: 'dragging:factor', handle: moveDrag });
  ctx.router.route({ name: 'factor-drag-release', on: 'pointerup', at: 'window', modes: 'dragging:factor',
    handle: event => finishDrag(event, true) });
  ctx.router.route({ name: 'factor-drag-cancel', on: 'pointercancel', at: 'window', modes: 'dragging:factor',
    handle: event => finishDrag(event, false) });

  // --- Decorating the shared multi-selection --------------------------------
  ctx.registerSelectionDecoration({
    paint() {
      if (isPreviewing()) return; // the candidate preview is modal; no zone
      const plan = factorPlan();
      overlay.setPlan(plan, plan
        ? expressionToDisplayString(findNodeById(ctx.getRoot(), plan.sourceFactorIds[0])) : '');
    },
    refresh() {
      if (isPreviewing()) candidateView.clearTransition();
      else overlay.refresh();
    },
    clear: () => overlay.clear()
  });
  ctx.registerSelectionToolbar(updateToolbar);
  ctx.registerSelectionLabel(() => isPreviewing() ? 'Factorisation preview — confirm or cancel' : null);
  ctx.registerSelectionHint(() => {
    const plan = factorPlan();
    return plan ? `Matching ${plan.direction} factors selected. Drag one into the amber extraction zone, or choose Preview extraction.` : null;
  });

  // --- Own controls and routes -------------------------------------------
  previewButton.addEventListener('click', enter);
  ctx.ui('confirmFactorisationButton').addEventListener('click', commit);
  ctx.ui('cancelFactorisationButton').addEventListener('click', () => cancel());
  ctx.router.route({ name: 'factorisation-preview-outside', on: 'pointerdown', at: 'document-capture', modes: 'preview:factorisation',
    handle: event => {
      if (ctx.isContextChangeControl(event)) return;
      if (event.target.closest?.('.transformation-preview__confirm, #factorisationPreviewActions')) return;
      cancel();
      ctx.consumeOutsidePreviewClick(event);
    } });

  ctx.registerPreviewDismissal({ active: () => host.isOpen() || isPreviewing(), dismiss: () => cancel(false) });
  ctx.registerRerenderCancel(() => { if (isPreviewing() || host.isOpen()) cancel(false); });
  ctx.registerEscape(() => {
    if (isPreviewing() || host.isOpen()) { cancel(false); return true; }
    if (drag()) { cancelDrag(); return true; }
    return false;
  });
  ctx.registerActivity(() => Boolean(drag()));
  // Restore any candidate DOM against its original tree before an object
  // switch, after a history append, and drop the drag when the window blurs.
  ctx.on('beforeObjectLoad', () => cancel(false));
  ctx.on('historyAppend', () => cancel(false));
  ctx.on('abandonDrags', cancelDrag);

  return Object.freeze({ enter, cancel, commit });
}
