/* ========================================================================== *
 * Rearrangement preview: an independent, NON-MATHEMATICAL view.
 * ========================================================================== *
 * The real expression and its measured hitboxes never move during dragging.
 * We clone one Add/Multiply operand sequence and arrange that decorative copy
 * in the proposed order (including all visible + / multiplication operators).
 *
 * TWO coordinate systems are deliberately kept apart:
 *   (1) hitTesting.js retains the original, stable mathematical hitboxes;
 *   (2) once a preview animation SETTLES, this module can take a snapshot of
 *       the displayed clone's positions, for intuitive pointer targeting.
 * The second set of coordinates NEVER participates in mathematical state.
 *
 * Rapid cursor movement is handled with a LATEST-WINS REQUEST QUEUE, not by
 * interrupting and restarting animations. A request arriving during a 160 ms
 * transition is stored; when that transition finishes we process only the
 * most recent request. Cancelling the drag, however, always cleans up NOW.
 *
 * Do not add fractions/powers by making this module know algebra. Future
 * layout renderers may implement the same preview interface for named regions
 * such as numerator, denominator, base and exponent.
 * ========================================================================== */

export const REARRANGEMENT_MOTION = Object.freeze({
  changeMs: 165,
  returnMs: 195,
  easing: 'cubic-bezier(.2,.7,.2,1)'
});

/** Pure helper: destinationIndex is based on siblings with source OMITTED. */
export function proposedRearrangementOrder(nodeIds, sourceId, destinationIndex) {
  if (!Array.isArray(nodeIds) || !nodeIds.includes(sourceId)) return null;
  if (!Number.isInteger(destinationIndex)) return null;
  const remaining = nodeIds.filter((id) => id !== sourceId);
  if (destinationIndex < 0 || destinationIndex > remaining.length) return null;
  remaining.splice(destinationIndex, 0, sourceId);
  return remaining;
}

function createSequenceClone(original, doc) {
  const overlay = original.cloneNode(true);
  overlay.classList.add('drag-rearrangement-preview');
  overlay.classList.remove('is-preview-covered');
  overlay.removeAttribute('id');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('inert', '');
  overlay.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  overlay.querySelectorAll('[tabindex], button, input, a').forEach((el) =>
    el.setAttribute('tabindex', '-1'));
  overlay.querySelectorAll('.is-drag-source, .is-combine-target, .is-distribution-target')
    .forEach((el) => el.classList.remove(
      'is-drag-source', 'is-combine-target', 'is-distribution-target'));
  if (typeof doc.defaultView?.getComputedStyle === 'function') {
    overlay.style.font = doc.defaultView.getComputedStyle(original).font;
  }
  return overlay;
}

/** A lightweight rect copy: never keep a mutable DOMRect as our snapshot. */
function rectCopy(rect) {
  return { left: rect.left, right: rect.right, top: rect.top,
    bottom: rect.bottom, width: rect.width, height: rect.height };
}

export function createRearrangementPreview(doc = document, onSettled = () => {}) {
  let original = null;
  let clone = null;
  let sequence = null;
  let sourceId = null;
  let geometry = null;
  let termsById = null;
  let operators = null;
  let shownOrder = null;
  let shownIndex = null;
  let visualSnapshot = null;
  let phase = 'idle'; // idle, transitioning, active, returning
  let queued = null;  // null or {kind:'show', index, geometry} / {kind:'exit'}
  let generation = 0; // Invalidates async completion callbacks after hard stop.
  const runningAnimations = new Set();

  const reducedMotion = () => Boolean(doc.defaultView?.matchMedia?.(
    '(prefers-reduced-motion: reduce)')?.matches);

  function clearNow() {
    // This is the emergency cleanup path (pointerup, Escape, blur, dispose).
    // It is INTENTIONALLY allowed to interrupt a transition: otherwise a
    // cancelled drag could leave an orphaned overlay above a new expression.
    generation++;
    runningAnimations.forEach((animation) => animation.cancel?.());
    runningAnimations.clear();
    original?.classList.remove('is-preview-covered');
    clone?.remove();
    original = clone = sequence = sourceId = geometry = termsById = operators = null;
    shownOrder = shownIndex = visualSnapshot = queued = null;
    phase = 'idle';
  }

  function initialise(nextGeometry) {
    const parent = nextGeometry?.containerElement;
    if (!parent || !nextGeometry.siblings?.length) return false;
    original = parent;
    geometry = nextGeometry;
    sourceId = nextGeometry.sourceNodeId;
    sequence = nextGeometry.siblings.map(({nodeId}) => nodeId);
    clone = createSequenceClone(original, doc);
    const operandClass = nextGeometry.parentType === 'Add' ? 'add-operand' : 'factor-slot';
    const operatorClass = nextGeometry.parentType === 'Add' ? 'plus' : 'multiply-operator';
    const all = [...clone.children];
    const operands = all.filter((node) => node.classList.contains(operandClass));
    operators = all.filter((node) => node.classList.contains(operatorClass));
    if (operands.length !== sequence.length || operators.length !== sequence.length - 1) {
      clearNow();
      return false;
    }
    termsById = new Map(operands.map((node) => [node.dataset.nodeId, node]));
    if (termsById.size !== sequence.length || !termsById.has(sourceId)) {
      clearNow();
      return false;
    }
    termsById.get(sourceId).classList.add('is-preview-moving');
    relocate(nextGeometry);
    doc.body.append(clone);
    original.classList.add('is-preview-covered');
    shownOrder = sequence.join('\u0000');
    shownIndex = sequence.indexOf(sourceId);
    phase = 'active';
    return true;
  }

  function relocate(nextGeometry) {
    if (!clone || !nextGeometry || original !== nextGeometry.containerElement) return;
    geometry = nextGeometry;
    const rect = nextGeometry.containerRect;
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.minHeight = `${rect.height}px`;
    // Scroll/resize invalidates BOTH the source and the preview's coordinates.
    visualSnapshot = null;
    if (phase === 'active') snapshotVisualGeometry();
  }

  /** Measure only settled DECORATIVE children, never moving animation frames. */
  function snapshotVisualGeometry() {
    if (phase !== 'active' || !clone) return;
    const moving = termsById.get(sourceId);
    const otherOperands = sequence.filter((id) => id !== sourceId).map((id) => ({
      nodeId: id, rect: rectCopy(termsById.get(id).getBoundingClientRect())
    }));
    const movingRect = rectCopy(moving.getBoundingClientRect());
    const boxes = [movingRect, ...otherOperands.map(({rect}) => rect)];
    const left = Math.min(...boxes.map((box) => box.left));
    const top = Math.min(...boxes.map((box) => box.top));
    const right = Math.max(...boxes.map((box) => box.right));
    const bottom = Math.max(...boxes.map((box) => box.bottom));
    // A reorganised sequence can be wider or taller than the old container,
    // especially when it wraps. Cover the VISIBLE terms, not the old width.
    // A plus inside the displayed clone still means distribution, just as
    // it did before the blue rearrangement preview appeared. Only collect
    // plus signs already authorised by distribution.js at drag start.
    const allowedSums = new Set((geometry.plusSigns || []).map((plus) => plus.sumId));
    const plusSigns = [...clone.querySelectorAll('.plus[data-sum-id]')]
      .filter((plus) => allowedSums.has(plus.dataset.sumId))
      .map((plus) => ({ sumId: plus.dataset.sumId,
        rect: rectCopy(plus.getBoundingClientRect()) }));
    visualSnapshot = {
      index: shownIndex,
      movingRect,
      siblings: otherOperands,
      plusSigns,
      containerRect: { left, top, right, bottom,
        width: right - left, height: bottom - top }
    };
  }

  function animateElement(element, keyframes, duration) {
    if (reducedMotion() || duration <= 0 || typeof element.animate !== 'function') return null;
    const animation = element.animate(keyframes, {
      duration, easing: REARRANGEMENT_MOTION.easing, fill: 'none'
    });
    runningAnimations.add(animation);
    // The animation.finished promise may reject on cancel; make it safe.
    return Promise.resolve(animation.finished).catch(() => {}).then(() => {
      runningAnimations.delete(animation);
    });
  }

  /** Complete an animation batch, ignoring callbacks from a cancelled drag. */
  function afterAnimations(promises, finished) {
    const token = generation;
    if (promises.length === 0) {
      finished();
    } else {
      Promise.all(promises).then(() => {
        if (token === generation) finished();
      });
    }
  }

  function transitionTo(index) {
    const proposed = proposedRearrangementOrder(sequence, sourceId, index);
    if (!proposed) return false;
    const key = proposed.join('\u0000');
    if (key === shownOrder) {
      shownIndex = index;
      phase = 'active';
      snapshotVisualGeometry();
      return true;
    }

    const before = new Map();
    for (const [id, element] of termsById) before.set(id, element.getBoundingClientRect());
    const rearranged = [];
    proposed.forEach((id, position) => {
      if (position > 0) rearranged.push(operators[position - 1]);
      rearranged.push(termsById.get(id));
    });
    clone.replaceChildren(...rearranged);
    shownOrder = key;
    shownIndex = index;
    visualSnapshot = null;
    phase = 'transitioning';

    const animations = [];
    for (const [id, element] of termsById) {
      const previous = before.get(id);
      const current = element.getBoundingClientRect();
      const dx = previous.left - current.left;
      const dy = previous.top - current.top;
      if (Math.abs(dx) < .5 && Math.abs(dy) < .5) continue;
      const promise = animateElement(element, [
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: 'translate(0, 0)' }
      ], REARRANGEMENT_MOTION.changeMs);
      if (promise) animations.push(promise);
    }
    afterAnimations(animations, () => {
      phase = 'active';
      snapshotVisualGeometry();
      consumeQueue();
    });
    return true;
  }

  function beginReturn() {
    if (!clone) return;
    phase = 'returning';
    visualSnapshot = null;
    const originals = new Map(geometry.siblings.map((item) => [item.nodeId, item.rect]));
    const animations = [];
    // Animate the visible preview terms toward their actual original hitboxes.
    // The original DOM remains present but hidden until the return completes.
    for (const [id, element] of termsById) {
      const now = element.getBoundingClientRect();
      const destination = originals.get(id);
      if (!destination) continue;
      const dx = destination.left - now.left;
      const dy = destination.top - now.top;
      const promise = animateElement(element, [
        { transform: 'translate(0, 0)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px)`, opacity: .25 }
      ], REARRANGEMENT_MOTION.returnMs);
      if (promise) animations.push(promise);
    }
    afterAnimations(animations, () => {
      // A new insertion proposal may have arrived while we were returning.
      // Finish the current return first; then initialise the NEW proposal.
      const next = queued;
      clearNow();
      if (next?.kind === 'show') show(next.index, next.geometry);
      notifySettled();
    });
  }

  /** Notify the controller outside its current pointer handler.
   * When reduced motion skips all animations, a synchronous callback would
   * re-enter updateDragTarget() while dragFeedback.show() is still running. */
  function notifySettled() {
    const token = generation;
    queueMicrotask(() => { if (token === generation) onSettled(); });
  }

  function consumeQueue() {
    const next = queued;
    queued = null;
    if (next?.kind === 'exit') {
      beginReturn();
    } else if (next?.kind === 'show') {
      if (next.geometry.containerElement !== original) {
        queued = next;
        beginReturn();
      } else {
        geometry = next.geometry;
        transitionTo(next.index);
      }
    }
    // Report completion only when a stable image is available. The callback
    // lets app.js reconsider its LAST pointer position, even if the pointer
    // remained motionless while an animation was running.
    if (phase === 'active') notifySettled();
  }

  function show(index, nextGeometry) {
    if (!nextGeometry) return false;
    if (clone && original !== nextGeometry.containerElement) {
      // Switching between parent sequences is rare. Do not merge two distinct
      // coordinate systems; finish the first animation/return before entering.
      if (phase !== 'active') { queued = { kind: 'show', index, geometry: nextGeometry }; return true; }
      queued = { kind: 'show', index, geometry: nextGeometry };
      beginReturn();
      return true;
    }
    if (phase === 'transitioning' || phase === 'returning') {
      queued = { kind: 'show', index, geometry: nextGeometry };
      return true;
    }
    if (!clone && !initialise(nextGeometry)) return false;
    queued = null;
    return transitionTo(index);
  }

  /** Soft exit during pointer movement. Not the same as hard stop(). */
  function dismiss() {
    if (!clone) return;
    if (phase === 'transitioning' || phase === 'returning') {
      queued = { kind: 'exit' };
    } else {
      beginReturn();
    }
  }

  /** A drop is valid only if the requested outcome is FINISHED and visible. */
  function isSettledAt(index) {
    return Boolean(clone) && phase === 'active' && shownIndex === index && !queued;
  }

  function getVisualGeometry() {
    return phase === 'active' && !queued ? visualSnapshot : null;
  }

  function isPointInPreview(x, y) {
    const preview = getVisualGeometry();
    const rect = preview?.containerRect;
    return Boolean(rect && x >= rect.left - 12 && x <= rect.right + 12 &&
      y >= rect.top - 12 && y <= rect.bottom + 12);
  }

  return {
    show, dismiss, stop: clearNow, relocate, isSettledAt,
    getVisualGeometry, isPointInPreview,
    getPhase: () => phase
  };
}
