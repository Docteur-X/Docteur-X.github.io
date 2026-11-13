/**
 * Selection (stage 6): the shared multi-selection of the equation view, its
 * painting, and the selection toolbar's general part (the label, Copy and
 * "Select several"). Rules decorate the selection and add their own toolbar
 * buttons, label text and hints through the rule extensions.
 *
 * WHY: until stage 6 this was section 12b of app.js. The code is the same;
 * what it needs is passed in by name (the parameters below).
 *
 * Selection is view state, never mathematics: it is not saved in history.
 */
import { expressionToDisplayString } from '../engine/parser.js';
import { findNodeById } from '../engine/treeUtils.js';

export function createSelectionView({
  documentState,
  dom,
  extensions,
  setStatus,
  viewMode,
  viewState
}) {
  /* ---------------------------------------------------------------------- *
   * 12b. Persistent multi-selection and deliberate range grouping
   * ---------------------------------------------------------------------- *
   * Selection is NOT a rewrite: no history entry, no tree mutation, no DOM
   * reconstruction. The mathematical module alone decides whether adjacent
   * selected siblings may be regrouped using associativity.
   *
   * Preview mode locks competing drags. The explicit brackets and envelope
   * are temporary graphics until a deliberate confirmation; clicking outside
   * cancels the proposal but retains the selection for easy reconsideration.
   * ---------------------------------------------------------------------- */



  function paintRangeSelection() {
    const selected = new Set(viewState.multiSelection.ids());
    dom.equation.querySelectorAll(".add-operand[data-node-id], .factor-slot[data-node-id]")
      .forEach((element) => {
        element.classList.toggle("is-multi-selected", selected.has(element.dataset.nodeId));
      });
    // Rule bundles decorate the selection (e.g. grouping's blue envelope).
    for (const decoration of extensions.selectionDecorations) decoration.paint();
  }

  function clearSelectionDecorations() {
    for (const decoration of extensions.selectionDecorations) decoration.clear();
  }

  /**
   * Clear the multi-selection and everything that decorates it. Also called on
   * object switches, history restoration and rebuilds, so rule bundles first
   * close any preview that depends on the selection. Each step is best-effort:
   * one failing cleanup must not leave the toolbar or a preview behind.
   */
  function resetRangeSelection() {
    for (const decoration of extensions.selectionDecorations) {
      try { decoration.reset?.(); }
      catch (error) { console.error('Selection reset failed', error); }
    }
    viewState.multiSelection.clear();
    viewState.touchMultiSelectMode = false;
    for (const step of [
      () => clearSelectionDecorations(),
      () => updateSelectionToolbars(),
      () => dom.equation.querySelectorAll('.is-multi-selected').forEach(
        element => element.classList.remove('is-multi-selected')),
      () => updateSelectionToolbars()
    ]) {
      try { step(); }
      catch (error) { console.error('Selection cleanup failed', error); }
    }
  }

  function toggleRangeSelection(nodeId) {
    // All selection entry points (pointer, touch and keyboard) converge here.
    // A modal preview owns the mathematical view until confirmation/cancellation.
    if (viewMode.isPreview()) return;
    viewState.multiSelection.toggle(documentState.expressionRoot, nodeId);
    if (!viewState.multiSelection.size()) viewState.touchMultiSelectMode = false;
    viewState.selectedNodeId = null;
    viewState.lastClick = null;
    // Clear the old single-node outline without rendering.
    dom.equation.querySelectorAll(".is-selected").forEach((element) => {
      element.classList.remove("is-selected");
    });
    updateSelectionToolbars();
    paintRangeSelection();
    // A rule's hint wins (e.g. factorisation's extraction hint, grouping's).
    setStatus(extensions.selectionHint() ??
      "Selection updated. Nonadjacent nodes remain selectable; rules that need adjacent or matching terms say so when they apply.");
  }

  function paintRangeSelectionSafely() {
    try { paintRangeSelection(); }
    catch (error) { console.error('Selection repaint failed', error); }
  }

  /**
   * The selection toolbar. The label says what is selected; a rule's label
   * wins (e.g. a preview's, or grouping's for a multi-selection). Each rule
   * updates its own buttons (registerSelectionToolbar).
   */
  function updateSelectionToolbars() {
    const count = viewState.multiSelection.size();
    const selected = viewState.selectedNodeId
      ? findNodeById(documentState.expressionRoot, viewState.selectedNodeId) : null;
    dom.selectionLabel.textContent = extensions.selectionLabel() ?? (count > 0
      ? `${count} selected`
      : selected
        ? `Selected: ${expressionToDisplayString(selected)}`
        : "Select a term; Ctrl/Cmd+click for multiple selection.");
    // A single AST node or the whole root can be copied. A multi-selection
    // with several disjoint nodes is not a single mathematical subtree.
    dom.copyMathButton.disabled = !documentState.expressionRoot || count > 1 || viewMode.isPreview();
    dom.multiSelectButton.setAttribute("aria-pressed", String(viewState.touchMultiSelectMode));
    dom.multiSelectButton.classList.toggle("is-active", viewState.touchMultiSelectMode);
    for (const update of extensions.selectionToolbars) update();
  }

  return Object.freeze({ paintRangeSelection, clearSelectionDecorations, resetRangeSelection, toggleRangeSelection, paintRangeSelectionSafely, updateSelectionToolbars });
}
