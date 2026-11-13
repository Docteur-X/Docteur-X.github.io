/**
 * Equation routes (stage 6): the input routes that run AFTER the rule
 * bundles' routes: picking up an occurrence, selecting a nested occurrence,
 * the hover outline, following and releasing an ordinary drag, Escape, and
 * keyboard selection and commands on a focused occurrence. Also the window
 * events that keep a drag correct when the page scrolls, resizes or loses
 * focus.
 *
 * WHY: until stage 6 this was the second half of section 13 of app.js. It is
 * created at the same point as before, so the router runs its routes in the
 * same order relative to the rules' routes (standard 2: order is behaviour).
 */
import { classifyOccurrenceKey, shouldCompleteTouchTap } from './selectionCommandRouting.js';

export function createEquationRoutes({
  cancelDrag,
  dom,
  extensions,
  gapOwner,
  hitboxVisibility,
  inputRouter,
  ordinaryDrag,
  ordinaryDragController,
  refreshDragGeometry,
  renderApplication,
  renderEquation,
  resetRangeSelection,
  selectTouchNode,
  startDrag,
  toggleRangeSelection,
  touch,
  viewMode,
  viewState
}) {
  // While previewing, the amber copies are buttons, not draggable terms.
  // Other clicks cancel the preview; only an intentional copy click commits.
  inputRouter.route({ name: 'occurrence-pickup', on: 'pointerdown', at: 'view', modes: 'idle',
    handle: (event) => {
    if (event.ctrlKey || event.metaKey || (event.pointerType === "touch" && viewState.touchMultiSelectMode)) return;
    if (event.target.closest("[data-preview-confirm]")) return;
    // A nested occurrence is an independent mathematical target, not an
    // Add/Multiply sibling. Do not pick up its outer draggable ancestor: that
    // used to make a click on the inner Number select/drag the outer Group.
    // Mouse selection is handled by the click listener below; touch retains
    // the existing pointerup tap/multi-select controller.
    if (event.target.closest('.nested-occurrence[data-node-id]')) return;
    // A gap or operator of a nested sum/product belongs to that sum/product
    // (R1): a click there selects it (click route below), so it does not pick
    // up the enclosing bracket.
    if (gapOwner(event.target)) return;
    let hitbox = event.target.closest(".factor-slot, .add-operand");
    // Alt+click reaches the enclosing level when hitboxes are nested.
    if (event.altKey && hitbox) {
      hitbox = hitbox.parentElement.closest(".factor-slot, .add-operand") || hitbox;
    }
    if (hitbox) {
      if (viewState.multiSelection.has(hitbox.dataset.nodeId) &&
          extensions.selectedPickups.some(pickup => pickup.start(event, hitbox))) return;
      startDrag(event, hitbox);
    }
  } });

  // A Group's immediate child can now be a separately addressable Number,
  // Symbol or Group. Pointer clicks select that exact occurrence instead of
  // being promoted to its enclosing draggable Group. Bracket clicks continue
  // to select the enclosing Group because the brackets sit outside the child.
  // Do not modify AST/history: this is strictly selection interaction state.
  inputRouter.route({ name: 'nested-occurrence-select', on: 'click', at: 'view', modes: 'idle',
    handle: (event) => {
    if (event.detail === 0 || event.pointerType === 'touch' ||
        event.ctrlKey || event.metaKey || viewState.touchMultiSelectMode) return;
    // Root occurrences are genuine mathematical targets too. Before natural
    // AST roots, the outer Group was an Add operand; now it is rendered as a
    // root-expression-hitbox. It has no Add/Multiply parent and therefore
    // cannot start an operand drag. Treat clicks on its own brackets exactly
    // like clicks on the nested Group brackets, without promoting a child.
    // A gap inside brackets selects the nested sum/product it belongs to
    // (owner, 12 November 2026).
    const target = gapOwner(event.target) ?? event.target.closest(
      '.nested-occurrence[data-node-id], .root-expression-hitbox[data-node-id]'
    );
    if (!target || !dom.equation.contains(target)) return;
    event.stopPropagation();
    viewState.selectedNodeId = target.dataset.nodeId;
    viewState.lastClick = null;
    renderApplication();
  } });

  // Only the innermost hitbox receives the transient hover outline. It shows
  // when the view is idle, and during a preview only on a confirm target
  // marked data-preview-confirm: the one thing the student may click then
  // (decision 1.2). A confirm target with its own hover style (the shared
  // result preview's) is not marked. Drags keep their own feedback.
  const hoverOutlineAllowed = target => viewMode.isIdle() ||
    (viewMode.isPreview() && Boolean(target?.closest?.('[data-preview-confirm]')));
  inputRouter.route({ name: 'hover-outline-move', on: 'pointermove', at: 'view', modes: 'any',
    handle: (event) => {
    hitboxVisibility.updateFromTarget(event.target, hoverOutlineAllowed(event.target));
  } });
  inputRouter.route({ name: 'hover-outline-over', on: 'pointerover', at: 'view', modes: 'any',
    handle: (event) => {
    hitboxVisibility.updateFromTarget(event.target, hoverOutlineAllowed(event.target));
  } });
  inputRouter.route({ name: 'hover-outline-leave', on: 'pointerleave', at: 'view', modes: 'any',
    handle: () => hitboxVisibility.clearHover() });


  // Browser event coordination lives outside the application controller.
  // Mathematical eligibility, hit testing and preview/commit logic remain
  // injected dependencies until their own contracts are migrated.
  inputRouter.route({ name: 'drag-move', on: 'pointermove', at: 'window', modes: 'any',
    handle: (event) => {
    if (touch.tap?.pointerId === event.pointerId &&
        Math.hypot(event.clientX - touch.tap.x, event.clientY - touch.tap.y) > 8) touch.tap.moved = true;
    if (extensions.ownsView()) return;
    ordinaryDragController.move(event);
  } });
  window.addEventListener("resize", () => {
    refreshDragGeometry();
    for (const onResize of extensions.resizes) onResize();
    for (const decoration of extensions.selectionDecorations) decoration.refresh();
  });
  // A capturing scroll listener also notices scrolling of nested panels.
  window.addEventListener("scroll", refreshDragGeometry, true);
  window.addEventListener("scroll", () => {
    for (const decoration of extensions.selectionDecorations) decoration.refresh();
  }, true);
  // A lost tab/window must not leave a floating ghost or stale drag session.
  window.addEventListener("blur", () => { ordinaryDragController.abandon(); extensions.emit('abandonDrags'); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { ordinaryDragController.abandon(); extensions.emit('abandonDrags'); }
  });

  inputRouter.route({ name: 'drag-release', on: 'pointerup', at: 'window', modes: 'any',
    handle: (event) => {
    if (touch.tap?.pointerId === event.pointerId) {
      const tap = touch.tap;
      touch.tap = null;
      if (shouldCompleteTouchTap({
        tap, pointerId: event.pointerId, moved: tap.moved,
        // A rule bundle's own drag or tool counts as extensions.ownsView().
        activeDrag: Boolean(ordinaryDrag()),
        viewBusy: extensions.ownsView() || viewMode.isPreview()
      })) {
        if (tap.nodeId) selectTouchNode(tap.nodeId);
        else if (viewState.touchMultiSelectMode || viewState.multiSelection.size()) resetRangeSelection();
        else if (!tap.nodeId && viewState.selectedNodeId) { viewState.selectedNodeId = null; renderApplication(); }
        return;
      }
    }
    if (extensions.ownsView()) return;
    ordinaryDragController.release(event);
  } });

  inputRouter.route({ name: 'drag-cancel', on: 'pointercancel', at: 'window', modes: 'any',
    handle: (event) => {
    if (touch.tap?.pointerId === event.pointerId) touch.tap = null;
    if (extensions.ownsView()) return;
    ordinaryDragController.cancel(event);
  } });

  inputRouter.route({ name: 'escape-fallback', on: 'keydown', at: 'window', modes: 'any',
    handle: (event) => {
    if (event.key !== "Escape") return;
    // A rule bundle that owns the view handles its own Escape first.
    if (extensions.escapes.some(handleEscape => handleEscape())) return;
    if (ordinaryDrag()) cancelDrag();
    else if (viewState.multiSelection.size()) resetRangeSelection();
  } });


  inputRouter.route({ name: 'occurrence-keyboard', on: 'keydown', at: 'view', modes: 'any',
    handle: (event) => {
    // Preview mode is modal for mathematical interactions, including keyboard
    // reordering and keyboard-triggered distribution, not only pointer drags.
    // A temporary copy is a native button. Let Enter and Space activate it
    // normally; otherwise this editor's hitbox keyboard handler could catch
    // the bubbling event and select a parent Group instead of confirming.
    if (event.target.closest("[data-preview-confirm]")) return;
    // Block keyboard mathematical commands and selection during every modal
    // preview, including families with no feature-specific mode flag.
    if (viewMode.isPreview()) {
      event.preventDefault();
      return;
    }
    const hitbox = event.target.closest(".factor-slot, .add-operand, .nested-occurrence");
    if (!hitbox) return;
    // Selection is not a mathematical intent. Only deliberate commands below
    // may reach the existing mathematical eligibility/commit infrastructure.
    const keyboardAction = classifyOccurrenceKey(event);
    // Accessible equivalent of Ctrl/Cmd+click for keyboard-only students.
    if (keyboardAction === "toggle-selection") {
      event.preventDefault();
      toggleRangeSelection(hitbox.dataset.nodeId);
      return;
    }
    if (keyboardAction === "select") {
      event.preventDefault();
      const selectedId = hitbox.dataset.nodeId;
      viewState.selectedNodeId = selectedId;
      renderEquation(false);
      // The rerender replaces the focused hitbox. Restore keyboard focus to
      // the same stable AST occurrence, rather than leaving keyboard-only
      // students stranded on the document body after selecting it.
      // Search by dataset instead of interpolating an AST ID into a selector.
      const replacement = [...dom.equation.querySelectorAll('[data-node-id]')]
        .find(element => element.dataset.nodeId === selectedId &&
          element.getAttribute('tabindex') === '0');
      replacement?.focus({ preventScroll: true });
      return;
    }
    // Other keyboard commands belong to rule bundles (e.g. rearrangement's
    // arrow keys), registered through the rule context.
    extensions.occurrenceKeys.get(keyboardAction)?.(event, hitbox);
  } });

}
