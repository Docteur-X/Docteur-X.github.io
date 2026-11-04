/* ========================================================================== *
 * Non-layout-changing visual feedback during a drag.
 * ========================================================================== *
 * No algebra is performed here. This class never calls renderExpression() and
 * never replaces DOM children. Existing hitboxes gain or lose CSS classes;
 * the insertion marker is a position:fixed overlay with pointer-events:none.
 *
 * This is deliberately small: the application controller still owns pointer
 * events and the operation modules still own permission/commit decisions.
 * ========================================================================== */

import { createRearrangementPreview } from "./rearrangementPreview.js";

export function createDragFeedback(doc = document, onPreviewSettled = () => {}) {
  // The reorder layer is independent of hit-testing and mathematical rules.
  // It clones DOM solely for expressive preview; the real hitboxes stay fixed.
  const rearrangement = createRearrangementPreview(doc, onPreviewSettled);
  const marker = doc.createElement('div');
  marker.className = 'drag-insertion-marker';
  marker.setAttribute('aria-hidden', 'true');
  marker.hidden = true;
  doc.body.append(marker);

  let highlightedTarget = null;
  let highlightedPlus = null;
  let sourceElement = null;
  let currentGhost = null;

  /** Remove only interaction styles; never change widths or positioning. */
  function clearHighlights() {
    highlightedTarget?.classList.remove('is-combine-target', 'is-distribution-target');
    highlightedTarget?.removeAttribute('data-combine-label');
    highlightedPlus?.classList.remove('plus--distribution-drop');
    currentGhost?.classList.remove('is-combine-moving', 'is-distribution-moving');
    highlightedTarget = null;
    highlightedPlus = null;
    marker.hidden = true;
  }

  function start(source, ghost) {
    sourceElement = source;
    currentGhost = ghost;
    // Opacity does not affect layout. The original factor keeps its footprint
    // in the row, even though the ghost visually follows the pointer.
    sourceElement?.classList.add('is-drag-source');
  }

  /**
   * Paint the requested target and report which target can be COMMITTED now.
   * A request for a rearrangement that is still animating/queued yields none:
   * releasing the pointer must never commit an outcome students have not seen.
   *
   * Green/yellow feedback only appears after the exiting blue preview has
   * returned; this avoids showing two contradictory proposed operations.
   */
  function show(target, geometry) {
    clearHighlights();
    if (target.kind === 'insert') {
      const displayed = rearrangement.show(target.index, geometry);
      if (!displayed) {
        marker.hidden = false;
        marker.style.left = `${target.marker.x}px`;
        marker.style.top = `${target.marker.top}px`;
        marker.style.height = `${Math.max(22, target.marker.height)}px`;
        return target; // Plain marker fallback for unsupported layouts.
      }
      return rearrangement.isSettledAt(target.index)
        ? target : { kind: 'none' };
    }

    rearrangement.dismiss();
    if (rearrangement.getPhase() !== 'idle') {
      return { kind: 'none' };
    }
    if (target.kind === 'combine') {
      highlightedTarget = target.sibling.element;
      highlightedTarget.classList.add('is-combine-target');
      highlightedTarget.dataset.combineLabel = geometry.parentType === 'Add'
        ? 'Release to add' : 'Release to multiply';
      currentGhost?.classList.add('is-combine-moving');
    } else if (target.kind === 'distribution') {
      highlightedPlus = target.plus.element;
      highlightedPlus.classList.add('plus--distribution-drop');
      highlightedTarget = geometry.siblings.find((sibling) =>
        sibling.element.contains(highlightedPlus))?.element || null;
      highlightedTarget?.classList.add('is-distribution-target');
      currentGhost?.classList.add('is-distribution-moving');
    }
    return target;
  }

  /** Visual targeting is independent of the actual Add/Multiply hitboxes. */
  function visualGeometry() { return rearrangement.getVisualGeometry(); }
  // A transitioning preview has no measurable settled geometry. The controller
  // still needs to know that a preview owns the current destination, rather
  // than treating the missing snapshot as a request to return to the start.
  function rearrangementPhase() { return rearrangement.getPhase(); }
  function isPointInPreview(x, y) { return rearrangement.isPointInPreview(x, y); }

  function stop() {
    clearHighlights();
    rearrangement.stop();
    sourceElement?.classList.remove('is-drag-source');
    sourceElement = null;
    currentGhost = null;
  }

  /** Remove the reusable overlay if the workspace is ever unmounted. */
  function dispose() {
    stop();
    marker.remove();
  }

  return { start, show, stop, dispose, visualGeometry, isPointInPreview,
    rearrangementPhase };
}
