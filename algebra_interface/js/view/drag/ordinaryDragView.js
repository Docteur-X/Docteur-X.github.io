/**
 * Ordinary drag in the equation view (stage 6): picking up one occurrence,
 * following the pointer, and the exits (select, a rule's drop, cancel).
 *
 * WHY: before stage 6 this was about 365 lines of app.js. The code is the
 * same; its collaborators are now passed in by name (see the parameter list),
 * so what the drag depends on is visible in one place.
 *
 * NON-MUTATING: during the gesture the mathematical tree is untouched. A
 * floating clone follows the pointer, hitTesting.js compares the pointer to
 * cached rectangles and dragFeedback.js changes only CSS classes and an
 * overlay. Only a rule's drop (extensions.dropTargets) may commit, through the
 * rule context. Cancelling needs no inverse operation.
 *
 * Every kind of target belongs to a rule bundle: the shared code here asks
 * `extensions.dropTarget(kind)` to validate, accept, find and drop.
 */
import { expressionToDisplayString } from '../../engine/parser.js';
import { findNodeById, findNodeLocation } from '../../engine/treeUtils.js';
import { hitTestDrag, hitTestVisibleInsertion, retainInsertionDuringTransition } from './hitTesting.js';
import { createOrdinaryDragController } from './ordinaryDragController.js';
import { classifyOrdinaryDragCompletion } from './ordinaryDragCompletion.js';
import { completeOrdinaryDragSelection } from './ordinaryDragSelectionExit.js';
import { validateOrdinaryDragTarget } from './ordinaryDragEligibility.js';
import { decideOrdinaryDragDrop } from './ordinaryDragDropDecision.js';
import { createOrdinaryDragRuleAdapters } from './ordinaryDragRuleAdapters.js';
import { isOrdinaryDragSourceCurrent } from './ordinaryDragSourceValidity.js';
import { createOrdinaryDragGhost, positionOrdinaryDragGhost } from './ordinaryDragVisual.js';
import { captureOrdinaryDragSnapshot } from './ordinaryDragGeometry.js';
import { createSemanticDragSession, checkSemanticDragSession } from './semanticDragSession.js';
import { arbitrateOrdinaryDrop } from './ordinaryDropArbitration.js';
import { arbitrateIntents as arbitrateOrdinaryDropArbiter } from './intentArbitration.js';

export function createOrdinaryDragView({
  dom,
  documentState,
  viewState,
  viewMode,
  extensions,
  semanticTargetResolver,
  equationViewId,
  transformationSourceStamp,
  activeDocument,
  dragFeedback,
  setStatus,
  selectTouchNode,
  clearSelectionDecorations,
  renderApplication
}) {
  const ordinaryDrag = () => viewMode.drag('ordinary');

  function positionDragGhost(clientX, clientY) {
    positionOrdinaryDragGhost(ordinaryDrag(), clientX, clientY);
  }

  /**
   * Rebuild mathematical distribution eligibility and DOM rectangles as two
   * separate responsibilities. The geometry adapter does not modify the AST;
   * the existing drag-session freshness gate remains authoritative.
   */
  function makeDragGeometry(drag) {
    const snapshot = captureOrdinaryDragSnapshot(dom.equation, documentState.expressionRoot, drag);
    drag.plansBySumId = snapshot.plansBySumId;
    return snapshot.geometry;
  }

  // The shared hit testing asks "may this sibling glow as a combine target?";
  // the numeric-combination bundle answers.
  function canCombineDraggedSibling(targetId) {
    return extensions.dropTarget('combine')?.canTarget?.(ordinaryDrag(), targetId) === true;
  }

  /**
   * Clicking creates a selection; movement beyond six pixels creates a drag.
   * A ghost is prepared on pointerdown but stays invisible for an ordinary
   * click. Keeping the source in place avoids every layout shift on pickup.
   */
  // The pickup controller is composed here, not inside the renderer or the
  // mathematical engine. Application-specific modal guards remain explicit.
  // Composition root: group collaborators by their actual responsibility.
  // The controller cannot accept the old flat pickup/movement injection format.
  const ordinaryDragController = createOrdinaryDragController({
    state: {
      getDrag: () => ordinaryDrag(),
      // The controller checked canStart() first, so the view is idle here.
      publishDrag: (drag) => { viewMode.beginDrag('ordinary', drag); }
    },
    source: {
      resolver: semanticTargetResolver,
      viewId: equationViewId,
      getObjectId: () => activeDocument()?.activeObjectId,
      getExpressionRoot: () => documentState.expressionRoot,
      getSourceStamp: transformationSourceStamp,
      getRenderGeneration: () => semanticTargetResolver.getGeneration(),
      locateNode: findNodeLocation,
      createSession: createSemanticDragSession
    },
    presentation: {
      createGhost: createOrdinaryDragGhost,
      captureGeometry: (drag) => makeDragGeometry(drag),
      positionGhost: (x, y, drag) => positionOrdinaryDragGhost(drag, x, y),
      feedback: dragFeedback,
      isInsideEquation
    },
    policy: {
      canStart: () => viewMode.isIdle()
    },
    lifecycle: { updateTarget: updateDragTarget, finishDrag, cancelDrag }
  });
  function startDrag(event, hitbox) {
    return ordinaryDragController.pickup(event, hitbox);
  }

  /** Clear temporary UI only; never touch the mathematical expression. */
  function clearDragState() {
    for (const target of extensions.dropTargets) target.clear?.();
    dragFeedback.stop();
    ordinaryDrag()?.ghost?.remove();
    viewMode.endDrag(viewMode.dragId('ordinary'));
    dom.body.classList.remove("is-dragging");
  }

  function isInsideEquation(clientX, clientY) {
    const rect = dom.equation.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right &&
      clientY >= rect.top && clientY <= rect.bottom;
  }


  /**
   * Finalize the drag. Cancel, click, reorder, combine and distribute are
   * separate exits, and NONE of them rely on undoing a temporary tree edit.
   */
  function finishDrag(commit) {
    if (!ordinaryDrag()) return;
    const drag = ordinaryDrag();
    // The semantic session is the single freshness gate for ordinary drags.
    // A stale release cancels without consulting geometry or mathematical rules.
    if (checkSemanticDragSession(drag.semanticSession, {
      viewId: equationViewId, pointerId: drag.pointerId,
      renderGeneration: semanticTargetResolver.getGeneration(),
      sourceStamp: transformationSourceStamp()
    })) commit = false;
    const target = drag.activeTarget || { kind: "none" };

    // Phase 3C: the settled, final pointer-up target is the ONLY proposal
    // submitted to the pure arbiter. Do not submit the requested (possibly
    // animating) target or infer mathematical permission from CSS/geometry.
    // All existing rule-specific commit/preview gates remain authoritative.
    // A cancelled/outside drop never asks the arbiter to select an action.
    if (commit && drag.moved) {
      // A preview may have opened since pickup; never arbitrate an immediate
      // transformation while another feature owns the mathematical view.
      if (viewMode.isPreview()) {
        clearDragState();
        setStatus('A preview is active; confirm or cancel it first.');
        return;
      }
      const sourceValid = isOrdinaryDragSourceCurrent({
        drag,
        currentStamp: transformationSourceStamp(),
        root: documentState.expressionRoot,
        findNodeById
      });
      const decision = decideOrdinaryDragDrop({
        commit, moved: drag.moved, drag, target, sourceValid,
        modalBlocked: viewMode.isPreview(),
        arbitrate: args => arbitrateOrdinaryDrop({
          arbitrateIntents: arbitrateOrdinaryDropArbiter, ...args,
          // Every kind a rule bundle registered (stage 7: no list to edit).
          ruleKinds: extensions.dropTargets.map(contributor => contributor.kind)
        }),
        // Only validated mathematical rules can supply eligibility. This
        // check is repeated by the existing commit/preview pathway below.
        validate: () => validateOrdinaryDragTarget({
          target,
          // These adapters deliberately ask the EXISTING live mathematical
          // rules. They are not cached hover permission or geometric hints.
          rules: createOrdinaryDragRuleAdapters({
            drag, target,
            getRoot: () => documentState.expressionRoot,
            validateRuleTarget: (kind, context) => extensions.dropTarget(kind)?.validate(context) === true
          })
        })
      });
      if (decision.status !== 'chosen') {
        clearDragState();
        // Preserve the pre-Phase-3C educational explanation: a student who
        // releases on an invalid mathematical hitbox needs to know *why*
        // nothing happened, rather than being told they cancelled the move.
        setStatus(decision.status === 'blocked'
          ? 'The drag is no longer valid; nothing changed.'
          : target.kind === 'invalid'
            ? 'No rule applies to that hitbox. The expression is unchanged.'
            : 'Move cancelled. The expression is unchanged.');
        return;
      }
    }

    // The pure exit classifier separates "which action?" from the side effects
    // below. Mathematical eligibility was checked above by the arbiter; each
    // rule-specific exit continues to revalidate its live candidate.
    const completion = classifyOrdinaryDragCompletion({
      commit, moved: drag.moved, targetKind: target.kind,
      hasDistributionPlan: Boolean(drag.distributionPlan),
      ruleTargetKinds: extensions.dropTargets.map(t => t.kind)
    });
    if (completion === 'select') {
      completeOrdinaryDragSelection({
        drag, previousClick: viewState.lastClick, now: Date.now(),
        clearDrag: clearDragState,
        selectTouchNode,
        setLastClick: value => { viewState.lastClick = value; },
        setSelectedNode: id => { viewState.selectedNodeId = id; },
        clearMultiSelection: () => viewState.multiSelection.clear(),
        clearGroupingOverlay: () => clearSelectionDecorations(),
        // Double-clicking the selected occurrence: whatever the rules register.
        toggleSelectedGroup: () => { for (const activate of extensions.selectionActivates) activate(); },
        render: renderApplication, setStatus,
        describeExpression: expressionToDisplayString
      });
      return;
    }

    // Keep the side-effectful exits in one local dispatcher. Each handler
    // revalidates its own candidate; the pure classifier never authorises a
    // mathematical operation. This is intentionally local to the composition
    // root until preview/commit ports have a stable common contract.
    if (executeOrdinaryDragExit(completion, drag, target)) return;

    // Invalid hitbox, outside drop, or Escape: the tree and its IDs have not
    // changed, so cancellation needs NO render or mathematical normalization.
    clearDragState();
    if (commit && target.kind === "invalid") {
      setStatus("No rule applies to that hitbox. The expression is unchanged.");
    } else {
      setStatus("Move cancelled. The expression is unchanged.");
    }
  }

  /**
   * Execute a previously classified drop. Returns true only when an exit was
   * handled. The caller owns cancellation and invalid-hitbox messaging.
   *
   * Do not move mathematical permission into the input controller: every
   * branch below deliberately retains its live validation/commit gate.
   */
  function executeOrdinaryDragExit(completion, drag, target) {
    // A rule bundle's drop target exits through that rule.
    const ruleTarget = extensions.dropTarget(completion);
    if (ruleTarget) {
      // A rule's drop that fails must not fail silently (Known Issues, lesson
      // 9): the drag is cleared, the student is told nothing changed, and the
      // error stays in the console for the developer.
      try {
        ruleTarget.drop({ drag, target, sourceId: drag.item.id, targetId: target.id, clearDrag: clearDragState });
      } catch (error) {
        console.error(`The ${completion} drop failed`, error);
        if (ordinaryDrag()) clearDragState();
        setStatus('That step could not be completed; the expression is unchanged.');
      }
      return true;
    }
    switch (completion) {
      default:
        return false;
    }
  }

  function cancelDrag(showMessage = true) {
    if (!ordinaryDrag()) return;
    clearDragState();
    if (showMessage) setStatus("Move cancelled. The expression is unchanged.");
  }

  /**
   * Pointer moves DO NOT call renderEquation(): no replaceChildren(), FLIP,
   * tree mutation, or moving 43px drop-slot is permitted here. The only
   * changes are the ghost's fixed transform and simple feedback CSS classes.
   * An insertion also rearranges an INERT visual clone of the sequence,
   * showing the actual prospective order (including operators). Neither the
   * real DOM geometry nor the mathematical expression tree is modified.
   */
  function updateDragTarget(event) {
    const drag = ordinaryDrag();
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (checkSemanticDragSession(drag.semanticSession, {
      viewId: equationViewId, pointerId: event.pointerId,
      renderGeneration: semanticTargetResolver.getGeneration(),
      sourceStamp: transformationSourceStamp()
    })) {
      cancelDrag(false);
      return;
    }
    drag.lastClientX = event.clientX;
    drag.lastClientY = event.clientY;
    positionDragGhost(event.clientX, event.clientY);
    const distance = Math.hypot(event.clientX - drag.startClientX,
      event.clientY - drag.startClientY);
    if (distance < 6 && !drag.moved) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.ghost.style.visibility = "visible";
      dragFeedback.start(drag.sourceElement, drag.ghost);
      dom.body.classList.add("is-dragging");
    }

    // During a finished blue preview, aim at the VISIBLE arrangement first.
    // Its rectangles were captured AFTER animation completion, never from a
    // moving frame. Outside that image, revert to the original stable layout
    // so that green combination and amber distribution remain available.
    let next = event.previewJustSettled && drag.requestedTarget
      ? drag.requestedTarget
      : hitTestVisibleInsertion(dragFeedback.visualGeometry(),
        event.clientX, event.clientY, canCombineDraggedSibling, drag.geometry)
        || hitTestDrag(drag.geometry, event.clientX, event.clientY,
          canCombineDraggedSibling, drag.activeTarget);

    // A blue rearrangement preview temporarily has no settled rectangles
    // while it animates. In that short interval the ORIGINAL hitboxes can
    // suggest the old index (or an invalid target) under exactly the same
    // stationary pointer. Do not interpret that as a request to undo the
    // preview: keep ownership of the last requested insertion until the
    // transition settles and the visible geometry can make the next decision.
    //
    // We deliberately do NOT retain the proposal when the cursor has left
    // the expression or reached an explicit green/amber target. This avoids
    // sticky drag behaviour and keeps cancellation/other rules responsive.
    next = retainInsertionDuringTransition({
      phase: dragFeedback.rearrangementPhase(),
      previous: drag.requestedTarget,
      candidate: next,
      startIndex: drag.startIndex,
      containerRect: drag.geometry?.containerRect,
      x: event.clientX,
      y: event.clientY
    });

    // The geometry modules can SUGGEST a target (a gap, a sibling); the rule
    // that owns that kind of target must independently authorise it,
    // including for noncommutative products.
    const suggestedOwner = extensions.dropTarget(next.kind);
    if (suggestedOwner?.accepts && !suggestedOwner.accepts({ drag, target: next })) {
      next = { kind: "invalid", id: `${next.kind}-${next.index ?? next.id}` };
    }
    // Rule bundles may contribute their own drop targets (e.g. negation's
    // −1-onto-a-neighbour). The first that finds an Engine-accepted target
    // under the pointer wins; the others clear their feedback.
    let ruleOwner = null;
    for (const target of extensions.dropTargets.filter(t => t.find)) {
      const found = target.find({ drag, x: event.clientX, y: event.clientY });
      if (!found) continue;
      next = { kind: target.kind, id: found.id, ruleOwned: true };
      target.show(found);
      ruleOwner = target;
      break;
    }
    for (const target of extensions.dropTargets) if (target !== ruleOwner) target.clear?.();
    drag.requestedTarget = next;
    // The feedback module reports what is VISUALLY SETTLED, not merely what
    // was queued during a transition. Rapid mouseup can therefore never
    // commit a rearrangement that was not shown to the student.
    const previous = drag.activeTarget;
    const effective = dragFeedback.show(next, drag.geometry);
    drag.activeTarget = effective;
    drag.distributionPlan = effective.kind === "distribution"
      ? drag.plansBySumId.get(effective.id) || null : null;
    drag.invalidTarget = effective.kind === "invalid";

    const enterStatus = extensions.dropTarget(effective.kind)?.enterStatus;
    if (enterStatus && (previous.kind !== effective.kind || previous.id !== effective.id)) {
      setStatus(typeof enterStatus === 'function' ? enterStatus(drag) : enterStatus);
    } else if (effective.kind === "invalid" &&
        (previous.kind !== effective.kind || previous.id !== effective.id)) {
      setStatus("No rule applies to that hitbox. Use a gap to reorder, or a plus sign to distribute.");
    }

  }

  /**
   * Screen coordinates (unlike expression IDs) change on scroll or resize.
   * Refresh the cached rectangles in those cases, then re-evaluate the last
   * pointer position. Hysteresis remains disabled in hitTesting.js.
   */
  function refreshDragGeometry() {
    if (!ordinaryDrag()) return;
    // Previous highlighted DOM targets may no longer be in the same place.
    // Clear their painting before deriving the new target from new rectangles.
    for (const target of extensions.dropTargets) target.clear?.();
    dragFeedback.show({ kind: "none" }, ordinaryDrag().geometry);
    ordinaryDrag().geometry = makeDragGeometry(ordinaryDrag());
    ordinaryDrag().activeTarget = { kind: "none" };
    ordinaryDrag().requestedTarget = { kind: "none" };
    if (ordinaryDrag().moved) {
      updateDragTarget({
        pointerId: ordinaryDrag().pointerId,
        clientX: ordinaryDrag().lastClientX,
        clientY: ordinaryDrag().lastClientY
      });
    }
  }

  return Object.freeze({
    controller: ordinaryDragController,
    pickup: startDrag,
    cancel: cancelDrag,
    updateTarget: updateDragTarget,
    refreshGeometry: refreshDragGeometry
  });
}
