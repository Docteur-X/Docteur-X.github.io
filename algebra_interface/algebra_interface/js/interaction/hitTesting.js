/* ========================================================================== *
 * Stable pointer hit testing for algebraic drag-and-drop.
 * ========================================================================== *
 * This module understands only RECTANGLES, DOM hitboxes and pointer locations.
 * It never imports the parser, algebraic rules or expression-tree utilities.
 *
 * Why capture rectangles at the start of a drag?
 *   A hover outline, animation or insertion marker must not move the target
 *   that the cursor is being compared against. The drag controller snapshots
 *   the geometry once; all pointermove decisions use that same coordinate
 *   system until the gesture finishes. In particular, we do not call
 *   getBoundingClientRect() on targets while the pointer is moving.
 *
 * Window resize, page scroll and zoom invalidate screen coordinates. The
 * controller refreshes the snapshot on scroll/resize while retaining the
 * original mathematical drag session. Hysteresis is deliberately OFF; the
 * small configurable allowance is here only for a future controlled test.
 * ========================================================================== */

export const HIT_TEST_OPTIONS = Object.freeze({
  hysteresisEnabled: false,
  hysteresisPixels: 9,
  plusHitPadding: 3,
  // A narrow strip at the left/right edge of an ineligible sibling acts as a
  // gap. Green numeric targets and amber plus signs still take priority.
  edgeInsertionPixels: 9,
  verticalInsertionPadding: 18
});

function copyRect(domRect) {
  return {
    left: domRect.left,
    right: domRect.right,
    top: domRect.top,
    bottom: domRect.bottom,
    width: domRect.width,
    height: domRect.height
  };
}

/** Return true if the pointer is within a rectangle (optionally padded). */
export function pointInsideRect(x, y, rect, margin = 0) {
  return x >= rect.left - margin && x <= rect.right + margin &&
    y >= rect.top - margin && y <= rect.bottom + margin;
}

/**
 * Create a geometry-only snapshot of one Add/Multiply's direct children.
 *
 * sourceNodeId is excluded from drop candidates but remains visible and
 * occupies its ORIGINAL layout space. No child is removed from the DOM.
 * eligibleSumIds is calculated separately by the mathematical rule module:
 * we collect only plus signs whose sums the source can distribute across.
 *
 * `element` references are for *styling only*. Their rectangles are frozen.
 */
export function captureDragGeometry(equation, parentId, parentType, sourceNodeId, eligibleSumIds = []) {
  const container = [...equation.querySelectorAll('.drag-container')]
    .find((element) => element.dataset.parentId === parentId);
  if (!container) return null;

  const hitboxClass = parentType === 'Add' ? 'add-operand' : 'factor-slot';
  const siblings = [...container.children]
    .filter((element) => element.classList.contains(hitboxClass))
    .map((element) => ({
      nodeId: element.dataset.nodeId,
      element,
      rect: copyRect(element.getBoundingClientRect())
    }));
  if (!siblings.some((item) => item.nodeId === sourceNodeId)) return null;

  const eligible = new Set(eligibleSumIds);
  const plusSigns = [...equation.querySelectorAll('.plus[data-sum-id]')]
    .filter((element) => eligible.has(element.dataset.sumId))
    .map((element) => ({
      sumId: element.dataset.sumId,
      element,
      rect: copyRect(element.getBoundingClientRect())
    }));

  return {
    parentId,
    parentType,
    sourceNodeId,
    // Reference for painting only: this element must remain stationary.
    // A visual rearrangement overlay may clone it without becoming a hit target.
    containerElement: container,
    containerRect: copyRect(container.getBoundingClientRect()),
    equationRect: copyRect(equation.getBoundingClientRect()),
    siblings,
    plusSigns
  };
}

/**
 * Find an insertion position in a sequence that might wrap onto TWO OR MORE
 * visual rows. A simple comparison of x-coordinates across all siblings would
 * reorder items incorrectly when a long expression wraps on a small screen.
 *
 * We group boxes by their VERTICAL centre, choose the nearest row, and then
 * compare horizontal centres only within that row. The array index returned
 * is still the real mathematical sibling index (with the source omitted).
 * Nothing here assumes the operators are commutative: this only describes a
 * geometric proposal, which the operation module must independently permit.
 */
function insertionFromRows(others, x, y, bounds) {
  if (others.length === 0) {
    return { index: 0, marker: { x: (bounds.left + bounds.right) / 2,
      top: bounds.top, height: bounds.height } };
  }
  const rows = [];
  others.forEach((item, index) => {
    const centerY = (item.rect.top + item.rect.bottom) / 2;
    let row = rows.find((candidate) => Math.abs(candidate.centerY - centerY) <=
      Math.max(10, Math.min(candidate.height, item.rect.height) * .45));
    if (!row) {
      row = { centerY, height: item.rect.height, children: [] };
      rows.push(row);
    }
    row.children.push({ item, index });
  });
  const row = rows.reduce((best, candidate) =>
    Math.abs(candidate.centerY - y) < Math.abs(best.centerY - y) ? candidate : best
  );
  const sorted = row.children;
  const after = sorted.find((entry) =>
    x < (entry.item.rect.left + entry.item.rect.right) / 2);
  const index = after ? after.index : sorted[sorted.length - 1].index + 1;
  const beforeEntry = [...sorted].reverse().find((entry) => entry.index < index);
  const afterEntry = sorted.find((entry) => entry.index >= index);
  const markerX = beforeEntry && afterEntry
    ? (beforeEntry.item.rect.right + afterEntry.item.rect.left) / 2
    : afterEntry ? afterEntry.item.rect.left - 6
      : beforeEntry.item.rect.right + 6;
  const top = Math.min(...sorted.map((entry) => entry.item.rect.top));
  const bottom = Math.max(...sorted.map((entry) => entry.item.rect.bottom));
  return { index, marker: { x: markerX, top, height: bottom - top } };
}

/**
 * Convert pointer coordinates into one geometric intention.
 *
 * Priority is important: a plus sign can sit INSIDE the group hitbox.
 * An eligible plus means distribution, not green combination or reordering.
 * A sibling hitbox gets priority over insertion. Thus a drop ON (b+c) cannot
 * accidentally be interpreted as an insertion beside (b+c).
 *
 * `canCombine(nodeId)` is a callback provided by app.js. The operation
 * modules decide if the combination is mathematically allowed; this module
 * knows only whether the geometric target was eligible.
 */
export function hitTestDrag(geometry, x, y, canCombine, previous = null, options = HIT_TEST_OPTIONS) {
  if (!geometry) return { kind: 'none' };
  const extra = options.hysteresisEnabled ? options.hysteresisPixels : 0;
  const marginFor = (kind, id) => previous?.kind === kind && previous?.id === id ? extra : 0;

  for (const plus of geometry.plusSigns) {
    const margin = options.plusHitPadding + marginFor('distribution', plus.sumId);
    if (pointInsideRect(x, y, plus.rect, margin)) {
      return { kind: 'distribution', id: plus.sumId, plus };
    }
  }

  const others = geometry.siblings.filter((item) => item.nodeId !== geometry.sourceNodeId);
  // The deepest hitbox is NOT necessarily the relevant one: only the direct
  // siblings in the moving node's parent may be combined or reordered.
  for (const sibling of others) {
    if (sibling.nodeId === geometry.sourceNodeId) continue;
    if (!pointInsideRect(x, y, sibling.rect, marginFor('combine', sibling.nodeId))) continue;
    if (canCombine(sibling.nodeId)) {
      return { kind: 'combine', id: sibling.nodeId, sibling };
    }
    // A user can aim at the narrow EDGE of an ineligible hitbox as an
    // insertion gap. This avoids demanding pixel-perfect targeting between
    // nested factors. A drop in the middle of the box remains invalid.
    const leftDistance = x - sibling.rect.left;
    const rightDistance = sibling.rect.right - x;
    const edge = Math.min(leftDistance, rightDistance);
    if (edge <= options.edgeInsertionPixels) {
      const before = leftDistance <= rightDistance;
      const index = others.indexOf(sibling) + (before ? 0 : 1);
      return {
        kind: 'insert', id: String(index), index,
        marker: {
          x: before ? sibling.rect.left - 3 : sibling.rect.right + 3,
          top: sibling.rect.top,
          height: sibling.rect.height
        }
      };
    }
    return { kind: 'invalid', id: sibling.nodeId, sibling };
  }

  // An insertion proposal is meaningful only near the original operand row.
  // Do not turn a pointer far outside the equation into a reordered expression.
  const bounds = geometry.containerRect;
  if (y < bounds.top - options.verticalInsertionPadding ||
      y > bounds.bottom + options.verticalInsertionPadding ||
      x < geometry.equationRect.left - 10 || x > geometry.equationRect.right + 10) {
    return { kind: 'none' };
  }

  const proposal = insertionFromRows(others, x, y, geometry.containerRect);
  return {
    kind: 'insert', id: String(proposal.index),
    index: proposal.index, marker: proposal.marker
  };
}

/**
 * Hit-test a SETTLED VISUAL PREVIEW, never a moving animation frame.
 *
 * Once the source visually appears between new neighbours, a student should
 * be able to release over the VISIBLE source rather than aim at its old empty
 * gap. The preview module provides frozen rectangles after transitions; this
 * helper receives only data and has no access to the clone or animations.
 *
 * In particular, the first test keeps the current destination active when
 * the cursor is over the proposed moving operand. Other areas use the
 * displayed positions of the stationary-by-preview siblings to calculate a
 * new proposed index, still measured with the source OMITTED.
 *
 * Return null when outside the preview, letting ordinary original-geometry
 * hit-testing handle numeric combinations and distribution independently.
 */
export function hitTestVisibleInsertion(preview, x, y, canCombine = () => false, original = null) {
  if (!preview || !preview.containerRect || !preview.movingRect) return null;
  const region = preview.containerRect;
  if (!pointInsideRect(x, y, region, 12)) return null;
  // It is not hysteresis: the VISIBLE moving factor itself is a legitimate
  // drop region, just as it would be after a completed rearrangement.
  if (pointInsideRect(x, y, preview.movingRect, 5)) {
    return { kind: 'insert', id: String(preview.index), index: preview.index,
      marker: { x: (preview.movingRect.left + preview.movingRect.right) / 2,
        top: preview.movingRect.top, height: preview.movingRect.height } };
  }
  // Keep green evaluation and amber distribution accessible on the visible
  // preview as well. Match cloned rectangles to ORIGINAL element references:
  // the feedback layer must never give a cloned element pointer handlers.
  for (const plus of preview.plusSigns || []) {
    if (pointInsideRect(x, y, plus.rect, 3)) {
      const originalPlus = original?.plusSigns.find((item) => item.sumId === plus.sumId);
      if (originalPlus) return { kind: 'distribution', id: plus.sumId, plus: originalPlus };
    }
  }
  for (const sibling of preview.siblings) {
    if (pointInsideRect(x, y, sibling.rect) && canCombine(sibling.nodeId)) {
      const originalSibling = original?.siblings.find((item) => item.nodeId === sibling.nodeId);
      if (originalSibling) return { kind: 'combine', id: sibling.nodeId,
        sibling: originalSibling };
    }
  }
  // The displayed sibling hitboxes are not insertion *gaps*. When the cursor
  // is in the middle of b in the preview b + [a] + c, changing the proposal
  // back to a + b + c would contradict what the student can see. Retain the
  // currently displayed destination until the cursor reaches a genuine gap
  // or crosses an operand's edge. This is destination ownership, NOT global
  // hysteresis: no pixel-distance or time threshold is introduced.
  for (const sibling of preview.siblings) {
    if (!pointInsideRect(x, y, sibling.rect)) continue;
    const leftDistance = x - sibling.rect.left;
    const rightDistance = sibling.rect.right - x;
    if (Math.min(leftDistance, rightDistance) > HIT_TEST_OPTIONS.edgeInsertionPixels) {
      return { kind: 'insert', id: String(preview.index), index: preview.index,
        marker: { x: (preview.movingRect.left + preview.movingRect.right) / 2,
          top: preview.movingRect.top, height: preview.movingRect.height } };
    }
    break;
  }
  const proposal = insertionFromRows(preview.siblings, x, y, region);
  return { kind: 'insert', id: String(proposal.index), index: proposal.index,
    marker: proposal.marker };
}

/**
 * Keep an already requested insertion while its decorative preview is moving.
 *
 * The preview's settled rectangles do not exist during the transition. If the
 * fallback (original) geometry momentarily suggests the source's old index,
 * or reports an invalid sibling, that is NOT evidence that the student moved
 * back: the unchanged pointer can produce that result merely because the
 * displayed sequence is changing. Holding the request until settlement makes
 * the visible preview the next authority. No mathematical state is touched.
 *
 * Explicit other operations and leaving the original container are never
 * swallowed. This is state ownership, not configurable global hysteresis.
 */
export function retainInsertionDuringTransition({ phase, previous, candidate,
  startIndex, containerRect, x, y }) {
  if (!['transitioning', 'returning'].includes(phase) ||
      previous?.kind !== 'insert' || !containerRect ||
      !pointInsideRect(x, y, containerRect)) return candidate;
  const oldPosition = candidate?.kind === 'insert' && candidate.index === startIndex;
  return oldPosition || candidate?.kind === 'invalid' ? previous : candidate;
}
