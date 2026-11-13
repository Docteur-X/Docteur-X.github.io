/* ========================================================================== *
 * GENERIC, MODAL TRANSFORMATION PREVIEW
 * ========================================================================== *
 * Purpose
 * -------
 * Display a proposed transformation without modifying the committed tree,
 * without committing that expression to the mathematical model or history.
 *
 * The caller supplies DOM, node IDs and callbacks. This module knows NOTHING
 * about distributivity, factorisation, associativity or expression trees.
 * Future fractions, exponents, matrices and integrals can reuse the same
 * mechanism: their renderer determines layout, not pixel offsets in a rule.
 *
 * While previewing:
 *   - The old equation DOM is saved, NOT destroyed.
 *   - For factor extraction, an explanatory one-line DOM visual retains faded
 *     source factors and inserts the proposed factor in normal layout.
 *   - Persistent curved arrows connect those old occurrences to the new one.
 *   - Other transformations may use the complete candidate DOM directly.
 *   - The actual result hitbox becomes an accessible confirmation control.
 *
 * The arrow overlay is decorative (pointer-events:none) and persists until
 * confirmation/cancellation, giving learners time to inspect the relationship.
 * The explanatory DOM is never committed as mathematical state.
 *
 * Cancel restores the exact saved DOM elements; confirm discards the saved
 * elements. Neither method changes mathematical state or history. The caller
 * owns that transaction and MUST lock unrelated interactions while previewing.
 * ========================================================================== */

import { buildInlineExtractionVisual } from "./inlineExtractionVisual.js";

/** Find a node by its stable mathematical ID, not by its current pixel position. */
function findHitbox(container, nodeId) {
  return [...container.querySelectorAll('[data-node-id]')]
    .find(element => element.dataset.nodeId === nodeId) || null;
}

/** Decorative SVG connections, in viewport coordinates. No layout effect. */
function createProvenanceArrows(document, sources, targetRect) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.classList.add('transformation-preview__arrows');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('aria-hidden', 'true');

  const defs = document.createElementNS(ns, 'defs');
  const marker = document.createElementNS(ns, 'marker');
  marker.setAttribute('id', 'transformation-provenance-tip');
  marker.setAttribute('viewBox', '0 0 10 10');
  marker.setAttribute('refX', '9');
  marker.setAttribute('refY', '5');
  marker.setAttribute('markerWidth', '6');
  marker.setAttribute('markerHeight', '6');
  marker.setAttribute('orient', 'auto-start-reverse');
  const tip = document.createElementNS(ns, 'path');
  tip.setAttribute('d', 'M 0 1 L 9 5 L 0 9');
  tip.setAttribute('fill', 'none');
  tip.setAttribute('stroke', 'currentColor');
  tip.setAttribute('stroke-width', '1.5');
  marker.append(tip);
  defs.append(marker);
  svg.append(defs);

  const endX = targetRect.left + targetRect.width / 2;
  const endY = targetRect.top;
  for (const rect of sources) {
    const startX = rect.left + rect.width / 2;
    const startY = rect.top;
    const controlY = Math.max(8, Math.min(startY, endY) - 58);
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', `M ${startX} ${startY} C ${startX} ${controlY}, ${endX} ${controlY}, ${endX} ${endY}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2.3');
    path.setAttribute('marker-end', 'url(#transformation-provenance-tip)');
    svg.append(path);
  }
  return svg;
}

/**
 * @param {Document} document - browser document (injected for DOM tests)
 * @param {Element} equation - normal expression container
 * @param {{onConfirm:Function}} callbacks - application-owned action
 */
export function createTransformationPreview(document, equation, { onConfirm }) {
  let savedChildren = null;
  let overlay = null;
  let transitionTimer = null; // Reserved for future non-persistent preview styles.
  let confirmTarget = null;
  let previewGeneration = 0; // Invalidates queued animation frames after cancel/reopen.

  /**
   * Animate only surviving LEAF hitboxes, not their enclosing ancestors too.
   * Applying a translation to both parent and child would double the motion.
   * This is a small FLIP transition: measure First/Last positions, visually
   * invert the difference, then Play back to the normal layout. The browser
   * has already laid out the candidate; CSS transforms do not reserve space.
   */
  function animateSurvivingLeaves(firstRects) {
    const view = document.defaultView;
    if (!view?.requestAnimationFrame || view.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    for (const element of equation.querySelectorAll('[data-node-id]')) {
      if (element.querySelector('[data-node-id]')) continue;
      const first = firstRects.get(element.dataset.nodeId);
      if (!first) continue;
      const last = element.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) continue;
      element.style.transition = 'none';
      element.style.transform = `translate(${dx}px, ${dy}px)`;
      view.requestAnimationFrame(() => {
        // A cancelled preview may have removed this element before the frame.
        if (!savedChildren) return;
        element.style.transition = 'transform 220ms ease-out';
        element.style.transform = '';
      });
    }
  }

  function removeTransition() {
    if (transitionTimer !== null) {
      clearTimeout(transitionTimer);
      transitionTimer = null;
    }
    overlay?.remove();
    overlay = null;
  }

  /**
   * Display the candidate. Returns false WITHOUT altering the DOM when the
   * requested confirmation node is not present in the proposed expression.
   */
  function show({ candidateElement, sourceNodeIds, resultNodeId, inlineExtraction = null }) {
    if (savedChildren || !candidateElement || !resultNodeId) return false;
    const result = findHitbox(candidateElement, resultNodeId);
    if (!result) return false;

    // Keep the original DOM nodes untouched for cancellation. The candidate
    // remains an independent, mathematically correct tree owned by app.js.
    const generation = ++previewGeneration;
    const originalChildren = [...equation.childNodes];
    const originalRoot = equation.firstElementChild;
    const inline = inlineExtraction && buildInlineExtractionVisual(
      document, originalRoot, candidateElement, {
        ...inlineExtraction, resultNodeId, sourceNodeIds
      }
    );

    // The explanatory one-line preview is NOT the candidate expression: it
    // intentionally retains faded source occurrences for teaching purposes.
    // If this renderer cannot compose an inline explanation, fall back to the
    // normal candidate layout instead of displaying a broken transformation.
    const displayedRoot = inline?.visualRoot || candidateElement;
    equation.replaceChildren(displayedRoot);
    savedChildren = originalChildren;
    confirmTarget = inline?.confirmationElement || findHitbox(equation, resultNodeId);

    // The normal mathematical hitbox is itself the amber confirmation target.
    // No floating button is squeezed into neighbouring expressions.
    confirmTarget.classList.add('transformation-preview__confirm');
    // Not marked data-preview-confirm: this target draws its own amber hover
    // style (css/previews.css), so the general hover outline must stay off it.
    confirmTarget.setAttribute('role', 'button');
    confirmTarget.setAttribute('tabindex', '0');
    confirmTarget.setAttribute('aria-label', 'Confirm proposed mathematical transformation');
    confirmTarget.setAttribute('title', 'Click or press Enter to confirm');
    confirmTarget.addEventListener('pointerdown', event => event.stopPropagation());
    confirmTarget.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      onConfirm();
    });
    confirmTarget.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        onConfirm();
      }
    });

    if (inline && sourceNodeIds?.length) {
      // Draw persistent overhead provenance arrows AFTER the browser has
      // laid out the inline factor. They never reserve space or intercept
      // pointer events, and remain visible until confirm/cancel.
      const drawArrows = () => {
        if (!savedChildren || !confirmTarget || generation !== previewGeneration) return;
        const sourceRects = sourceNodeIds
          .map(id => findHitbox(equation, id)?.getBoundingClientRect())
          .filter(Boolean);
        if (!sourceRects.length) return;
        overlay?.remove();
        overlay = document.createElement('div');
        overlay.className = 'transformation-preview__transition transformation-preview__persistent';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.append(createProvenanceArrows(document, sourceRects, confirmTarget.getBoundingClientRect()));
        document.body.append(overlay);
      };
      // Browsers have laid out newly inserted nodes by the next frame.
      // For DOM-only unit tests (no requestAnimationFrame), draw immediately.
      const frame = document.defaultView?.requestAnimationFrame;
      if (frame) frame(drawArrows);
      else drawArrows();
    }
    return true;
  }

  /** Restore the exact original equation and discard the proposed DOM. */
  function cancel() {
    if (!savedChildren) return false;
    previewGeneration++;
    removeTransition();
    equation.replaceChildren(...savedChildren);
    savedChildren = null;
    confirmTarget = null;
    return true;
  }

  /** Keep candidate DOM until the app renders its committed expression. */
  function finish() {
    if (!savedChildren) return false;
    previewGeneration++;
    removeTransition();
    savedChildren = null;
    confirmTarget = null;
    return true;
  }

  return {
    show, cancel, finish,
    // Resize/scroll during the short transition invalidates arrow geometry;
    // remove decorative arrows instead of sampling unstable moving frames.
    clearTransition: removeTransition,
    get active() { return savedChildren !== null; },
    get confirmationElement() { return confirmTarget; },
    destroy() { cancel(); removeTransition(); }
  };
}
