/**
 * Range-grouping rule bundle: its interaction.
 *
 * When the student has selected adjacent addends or factors, a thin blue
 * envelope appears around them (the overlay, outside #equation so it never
 * affects layout or drag hitboxes). Clicking the envelope, or "Preview
 * grouping" in the selection toolbar, opens a preview through the shared
 * host: click the blue bracketed region or Confirm to commit; Escape,
 * Cancel or a click elsewhere cancels and keeps the selection.
 *
 * The multi-selection itself (which terms are selected, the selection
 * toolbar) belongs to app.js, because factorisation uses it too. This bundle
 * reaches it only through the rule context:
 *   selectedIds(), clearMultiSelection(), updateSelectionToolbar(),
 *   paintSelection(), registerSelectionDecoration({ paint, refresh, clear, reset }),
 *   registerCommand(name, fn)
 * plus the services listed in js/rules/negation/install.js.
 */
import { getRangeGroupingPlan } from '../../engine/operations/grouping.js';
import { arbitrateGroupingPreview } from './intentArbitration.js';
import { createGroupingPreview } from './overlay.js';
import { groupingActionRequest } from './gesture.js';
import { describeGroupingPreview } from './visual.js';
import { installExplicitBrackets } from './explicitBrackets.js';

export function installGrouping(ctx) {
  const styleSelect = ctx.ui('groupStyle');
  const confirmButton = ctx.ui('confirmRangeGroupButton');
  const rangePlan = () => getRangeGroupingPlan(ctx.getRoot(), ctx.selectedIds());
  let previewPlan = null; // the plan the preview is showing

  const overlay = createGroupingPreview(document, ctx.view, {
    onEnterPreview: () => enter(),
    onConfirm: () => commit()
  });

  const host = ctx.createPreviewHost({
    owner: 'grouping',
    presentation: {
      show(candidate) {
        const visual = describeGroupingPreview(candidate);
        previewPlan = candidate.result.plan;
        // The preview actions appear in normal document flow. Publish that
        // layout change BEFORE measuring the fixed-position bracket, or the
        // equation moves after the overlay has been positioned.
        ctx.updateSelectionToolbar();
        overlay.enterPreview(visual.bracketStyle);
      },
      clear() { cleanPresentation(); }
    }
  });

  /**
   * Grouping's reset must not depend on any one DOM cleanup succeeding: a
   * failed overlay call must not leave the toolbar in preview mode.
   */
  function cleanPresentation({ clearOverlay = false } = {}) {
    previewPlan = null;
    for (const step of [
      () => clearOverlay ? overlay.clear() : overlay.setSelection(rangePlan()?.operandIds || []),
      () => ctx.updateSelectionToolbar()
    ]) {
      try { step(); }
      catch (error) { console.error('Grouping presentation cleanup failed', error); }
    }
  }

  function enter() {
    if (!ctx.viewMode.isIdle()) return;
    const plan = rangePlan();
    const action = groupingActionRequest(plan, styleSelect.value);
    const sourceStamp = ctx.sourceStamp();
    const candidate = action ? ctx.propose(action) : null;
    // Selection is not a preview. Only this deliberate, Engine-approved
    // request may open one; the arbiter never validates mathematics.
    const decision = arbitrateGroupingPreview({
      arbitrateIntents: ctx.intentArbiter,
      session: { viewId: ctx.viewId, objectId: sourceStamp.objectId,
        sessionToken: `grouping-intent-${sourceStamp.revision}` },
      sourceValid: ctx.isSourceCurrent(sourceStamp),
      modalBlocked: ctx.viewMode.isPreview(),
      plan, action, candidate
    });
    if (decision.status !== 'chosen') return;
    try {
      if (!host.open({ candidate, stamp: sourceStamp })) return;
      confirmButton.focus({ preventScroll: true });
      ctx.setStatus('Grouping preview: click the blue bracketed region or Confirm. Click elsewhere or press Escape to cancel.');
    } catch (error) {
      try { host.cancel(); }
      catch (cleanupError) { console.error('Grouping preview cleanup failed', cleanupError); }
      ctx.setStatus(`Grouping preview unavailable: ${error.message}`);
    }
  }

  function cancel() {
    if (!ctx.viewMode.isPreview('grouping') && !host.isOpen()) return;
    try { host.cancel(); }
    catch (error) { console.error('Grouping preview cancellation failed', error); }
    cleanPresentation();
    ctx.setStatus('Grouping preview cancelled. Your selected operands are unchanged.');
  }

  /**
   * Confirm through the shared single-use gate. The source stamp and the exact
   * sibling range are rechecked before history is prepared on detached data.
   * Selected operand IDs are preserved; cancelling never commits.
   */
  function commit() {
    if (!ctx.viewMode.isPreview('grouping') || !host.isOpen()) return;
    let outcome;
    try {
      outcome = host.confirm(ctx.sourceStamp(), candidate => {
        const parameters = candidate.action.parameters;
        const current = getRangeGroupingPlan(ctx.getRoot(), parameters.operandIds);
        const original = candidate.result.plan;
        if (!current || !original || current.parentId !== original.parentId ||
            current.parentType !== original.parentType ||
            current.operandIds.join('|') !== original.operandIds.join('|') ||
            current.operandIds.join('|') !== previewPlan?.operandIds.join('|')) {
          throw new Error('Grouping is no longer mathematically eligible.');
        }
        ctx.commitTransformation({
          resultRoot: candidate.result.root,
          actionLabel: `Grouped ${original.count} adjacent ${original.parentType === 'Add' ? 'addends' : 'factors'}`,
          transformation: candidate.result.provenance,
          kind: 'rule-transform',
          operation: {
            ruleId: 'grouping.range', ruleVersion: 1,
            inputs: { bracketStyle: parameters.bracketStyle, parentId: original.parentId },
            affectedNodeIds: original.operandIds
          }
        });
        ctx.setSelectedNode(candidate.result.groupId);
        ctx.renderHistory();
      });
    } catch (error) {
      // Keep the original error. Cancellation and cleanup are independent,
      // and a failed commit is never retried implicitly.
      try { host.cancel(); }
      catch (cleanupError) { console.error('Grouping proposal cleanup failed', cleanupError); }
      cleanPresentation({ clearOverlay: true });
      ctx.paintSelection();
      ctx.setStatus(`Could not commit grouping: ${error.message}`);
      return;
    }
    if (outcome.status !== 'committed') {
      try { host.cancel(); }
      catch (cleanupError) { console.error('Stale grouping cleanup failed', cleanupError); }
      cleanPresentation({ clearOverlay: true });
      ctx.paintSelection();
      ctx.setStatus('The grouping proposal is stale; nothing changed.');
      return;
    }
    previewPlan = null;
    ctx.clearMultiSelection();
    overlay.clear();
    ctx.syncInput();
    ctx.render();
    ctx.setStatus('Added explicit brackets to the selected range; original operand IDs were preserved.');
  }

  // --- The blue envelope is a decoration of the shared multi-selection ------
  ctx.registerSelectionDecoration({
    paint() {
      if (ctx.viewMode.isPreview('grouping')) overlay.refresh();
      else overlay.setSelection(rangePlan()?.operandIds || []);
    },
    refresh: () => overlay.refresh(),
    clear: () => overlay.clear(),
    // The selection is being reset (object switch, history, rebuild): close a
    // pending preview first, so the proposal can't outlive its selection.
    reset() {
      try { host.cancel(); }
      catch (error) { console.error('Grouping proposal cleanup failed', error); }
      previewPlan = null;
    }
  });
  ctx.registerCommand('grouping.range', enter);

  // --- Own controls and routes -------------------------------------------
  confirmButton.addEventListener('click', commit);
  ctx.ui('cancelRangeGroupButton').addEventListener('click', cancel);
  styleSelect.addEventListener('change', () => {
    if (!ctx.viewMode.isPreview('grouping')) return;
    // The bracket style is part of the request: reopen the proposal so the
    // visible brackets and the committed style agree. Selection is kept.
    cancel();
    enter();
  });
  // In grouping preview, a click outside cancels AND consumes the gesture,
  // so it can't also start an unrelated action (e.g. reopen via Wrap).
  ctx.router.route({ name: 'grouping-preview-outside', on: 'pointerdown', at: 'document-capture', modes: 'preview:grouping',
    handle: event => {
      if (ctx.isContextChangeControl(event)) return;
      if (event.target.closest('.grouping-envelope--preview, #groupingPreviewActions, #groupStyle')) return;
      cancel();
      ctx.consumeOutsidePreviewClick(event);
    } });

  ctx.registerPreviewDismissal({ active: () => host.isOpen() || ctx.viewMode.isPreview('grouping'), dismiss: cancel });
  ctx.registerRerenderCancel(() => { if (ctx.viewMode.isPreview('grouping') || host.isOpen()) cancel(); });
  ctx.registerEscape(() => { if (!ctx.viewMode.isPreview('grouping')) return false; cancel(); return true; });

  // The bracket toolbar: wrap, remove, double-click toggle (./explicitBrackets.js).
  installExplicitBrackets(ctx, { enterRangePreview: enter });

  return Object.freeze({ enter, cancel, commit });
}
