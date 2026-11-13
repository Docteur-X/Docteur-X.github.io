/**
 * Equation selection routes (stage 6): the input routes that run BEFORE the
 * rule bundles' routes: swallowing the click after a preview was cancelled
 * by an outside click, touch-tap selection, "Select several", and the
 * capturing pointerdown that clears or keeps the multi-selection.
 *
 * WHY: until stage 6 this was the first half of section 13 of app.js. It is
 * created at the same point as before, so the router runs its routes in the
 * same order relative to the rules' routes (standard 2: order is behaviour).
 */


export function createEquationSelectionRoutes({
  documentState,
  dom,
  extensions,
  gapOwner,
  inputRouter,
  isContextChangeControl,
  outsideClick,
  paintRangeSelection,
  renderApplication,
  resetRangeSelection,
  setStatus,
  toggleRangeSelection,
  updateSelectionToolbars,
  viewMode,
  viewState
}) {
  /* ---------------------------------------------------------------------- *
   * 13. Event listeners
   * ---------------------------------------------------------------------- */

  // Prefer the factor hitbox when one is nested inside an outer product/addend.
  // Capturing phase: Ctrl/Cmd+click is selection, NEVER a drag pickup.
  // A preview's own outside-click route cancels it AND consumes the gesture
  // (consumeOutsidePreviewClick); this route swallows the click that follows.
  inputRouter.route({ name: 'suppress-click-after-outside-cancel', on: 'click', at: 'document-capture', modes: 'any',
    handle: (event) => {
    if (!outsideClick.suppress) return;
    outsideClick.suppress = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  } });

  // Touch taps share the existing ID-based selection model with Ctrl/Cmd+click.
  // A completed drag is handled by the drag lifecycle, never as a selection tap.
  // The touch contact that may become a tap selection (shared by the
  // selection routes and the drag routes below).
  const touch = { tap: null };
  function selectTouchNode(nodeId) {
    // Touch selection must obey the same view-local lock as keyboard selection.
    if (viewMode.isPreview()) return;
    if (viewState.touchMultiSelectMode) {
      toggleRangeSelection(nodeId);
      return;
    }
    if (viewState.selectedNodeId === nodeId) {
      viewState.touchMultiSelectMode = true;
      viewState.multiSelection.replace(documentState.expressionRoot, nodeId);
      viewState.selectedNodeId = null;
      viewState.lastClick = null;
      dom.equation.querySelectorAll(".is-selected").forEach(el => el.classList.remove("is-selected"));
      paintRangeSelection();
      updateSelectionToolbars();
      setStatus("Multiple selection: tap terms to add or remove; tap empty space to clear.");
    } else {
      viewState.selectedNodeId = nodeId;
      viewState.lastClick = null;
      renderApplication();
    }
  }
  // Touch multi-selection mode (the "Select several" button, panelControls.js).
  function toggleTouchMultiSelect() {
    if (viewMode.isPreview()) return;
    if (viewState.touchMultiSelectMode) { resetRangeSelection(); return; }
    viewState.touchMultiSelectMode = true;
    if (viewState.selectedNodeId) viewState.multiSelection.replace(documentState.expressionRoot, viewState.selectedNodeId);
    viewState.selectedNodeId = null;
    viewState.lastClick = null;
    dom.equation.querySelectorAll(".is-selected").forEach(el => el.classList.remove("is-selected"));
    paintRangeSelection();
    updateSelectionToolbars();
    setStatus("Multiple selection: tap terms to toggle; tap empty space to clear.");
  }

  inputRouter.route({ name: 'outside-and-selection-pointerdown', on: 'pointerdown', at: 'document-capture',
    // Every mode except a rule tool's own drag, which has its own routes.
    // During a preview this route returns at its `!viewMode.isIdle()` check.
    modes: ['idle', 'dragging:ordinary', 'dragging:factor', 'preview'],
    handle: (event) => {
    // Workspace navigation (including creating a new object/document) is an
    // explicit context transition, not an outside click on mathematics. Its
    // click handler must reach the existing context-dismissal and modal gate.
    // Otherwise the pointer handler cancels the preview but silently eats the
    // creation click, leaving the student on the old mathematical object.
    // Other outside clicks still cancel and consume the gesture below.
    if (isContextChangeControl(event)) return;
    if (!viewMode.isIdle()) return;
    const hitbox = gapOwner(event.target) ?? event.target.closest?.(".factor-slot, .add-operand, .nested-occurrence");
    if (event.pointerType === "touch" && dom.equation.contains(event.target) &&
        !viewMode.isPreview()) {
      touch.tap = { pointerId: event.pointerId, nodeId: hitbox?.dataset.nodeId ?? null,
        x: event.clientX, y: event.clientY, moved: false };
      // In multi-select mode, suppress pickup so taps cannot initiate a drag.
      if (viewState.touchMultiSelectMode) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    }
    if (hitbox && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleRangeSelection(hitbox.dataset.nodeId);
      return;
    }
    // A selected factor is a legitimate pickup for factor extraction. Do NOT
    // clear the multi-selection on its pointerdown: otherwise factorisation
    // could never be initiated by dragging one of the selected factors.
    const selectedFactorPickup = hitbox && extensions.selectedPickups.some(pickup => pickup.accepts(hitbox));
    if (viewState.touchMultiSelectMode && !hitbox && !event.target.closest?.("[data-selection-control]")) {
      resetRangeSelection();
      return;
    }
    if (viewState.multiSelection.size() && !viewState.touchMultiSelectMode && !event.ctrlKey && !event.metaKey &&
        !selectedFactorPickup &&
        !event.target.closest?.("[data-selection-control]")) {
      resetRangeSelection();
    }
  } });

  return Object.freeze({ touch, selectTouchNode, toggleTouchMultiSelect });
}
