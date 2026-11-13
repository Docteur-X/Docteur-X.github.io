/**
 * Finalise an ordinary drag that never crossed the movement threshold.
 *
 * This is an application-facing *exit adapter*, not a mathematical rule.
 * It deliberately receives a small set of explicit effects instead of
 * importing app state, the Renderer, or the AST engine. The owner supplies
 * the current clock and previous click so tests can cover double-click
 * behaviour without sleeping or inspecting source text.
 *
 * A touch tap delegates to the touch selection policy. Mouse/pen taps
 * select the occurrence and optionally toggle its bracket group.
 * Cleanup occurs before any UI action that may re-render the equation.
 */
export function completeOrdinaryDragSelection({
  drag, previousClick, now, clearDrag, selectTouchNode,
  setLastClick, setSelectedNode, clearMultiSelection,
  clearGroupingOverlay, toggleSelectedGroup, render, setStatus,
  describeExpression
}) {
  const required = [clearDrag, selectTouchNode, setLastClick, setSelectedNode,
    clearMultiSelection, clearGroupingOverlay, toggleSelectedGroup,
    render, setStatus, describeExpression];
  if (!drag?.item?.id || !required.every(fn => typeof fn === 'function') || !Number.isFinite(now)) {
    throw new TypeError('Selection exit requires a drag occurrence, clock, and UI effect callbacks');
  }
  const id = drag.item.id;
  if (drag.pointerType === 'touch') {
    clearDrag();
    selectTouchNode(id);
    return 'touch';
  }
  const doubleClick = previousClick?.nodeId === id &&
    now >= previousClick.time && now - previousClick.time < 370;
  setLastClick(doubleClick ? null : { nodeId: id, time: now });
  setSelectedNode(id);
  clearMultiSelection();
  clearGroupingOverlay();
  clearDrag();
  if (doubleClick) {
    toggleSelectedGroup();
    return 'double-click';
  }
  render();
  setStatus(`Selected ${describeExpression(drag.item)}. Use the bracket toolbar or double-click to toggle round brackets.`);
  return 'selected';
}
