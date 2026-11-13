/* ========================================================================== *
 * FACTORISATION: pre-drop extraction-zone interaction
 * ========================================================================== *
 * This module ONLY draws the small extraction destination during selection.
 * It has no mathematical knowledge beyond the validated plan passed by app.js.
 *
 * Once the student drops a factor, the generic transformationPreview.js
 * renders the COMPLETE proposed expression using normal DOM layout. The old
 * implementation kept a floating amber factor next to the Group, which could
 * overlap neighbouring factors (e.g. (ba+ca)f). Never place the result here.
 *
 * The zone itself remains non-layout-changing and is easy to click/drag into.
 * In future 2-D notation, a small boundary affordance can be replaced by a
 * contextual toolbar without changing the mathematical factorisation rule.
 * ========================================================================== */
const ZONE_WIDTH = 58;
const ZONE_HEIGHT = 36;
const ZONE_GAP = 9;

function rectContains(rect, x, y) {
  return Boolean(rect) && x >= rect.left && x <= rect.right &&
    y >= rect.top && y <= rect.bottom;
}

export function measureExtractionZone(groupRect, direction, width = ZONE_WIDTH) {
  if (!groupRect || !['left', 'right'].includes(direction)) return null;
  const left = direction === 'left'
    ? groupRect.left - width - ZONE_GAP : groupRect.right + ZONE_GAP;
  const top = groupRect.top + (groupRect.height - ZONE_HEIGHT) / 2;
  return { left, top, right: left + width, bottom: top + ZONE_HEIGHT,
    width, height: ZONE_HEIGHT };
}


/**
 * Choose a non-overlapping extraction affordance, never a result preview.
 *
 * The first candidate is immediately beside the group. If another operand
 * occupies that space (e.g. (ba+ca)f), try above or below the group instead.
 * If all candidates are crowded, omit the floating zone altogether: the
 * toolbar still provides a discoverable "Preview extraction" action.
 *
 * `obstacles` excludes the selected group, its descendants and ancestors;
 * those are mathematically part of the region being acted on. Future 2-D
 * layout regions can provide the same rectangle interface without teaching
 * factorisation.js anything about pixels.
 */
export function chooseExtractionZone(groupRect, direction, obstacles = [], viewport = null) {
  const horizontal = measureExtractionZone(groupRect, direction);
  if (!horizontal) return null;
  const width = horizontal.width;
  const height = horizontal.height;
  const edgeX = direction === 'left' ? groupRect.left : groupRect.right;
  const above = {
    left: direction === 'left' ? edgeX : edgeX - width,
    top: groupRect.top - height - ZONE_GAP
  };
  const below = {
    left: direction === 'left' ? edgeX : edgeX - width,
    top: groupRect.bottom + ZONE_GAP
  };
  const candidates = [horizontal, above, below];
  for (const candidate of candidates) {
    const rect = { ...candidate,
      right: candidate.left + width,
      bottom: candidate.top + height,
      width, height };
    if (viewport && (rect.left < 0 || rect.top < 0 ||
      rect.right > viewport.width || rect.bottom > viewport.height)) continue;
    const intersects = obstacles.some(other =>
      rect.left < other.right && rect.right > other.left &&
      rect.top < other.bottom && rect.bottom > other.top);
    if (!intersects) return rect;
  }
  return null;
}

function findHitbox(equation, id) {
  return [...equation.querySelectorAll('.add-operand[data-node-id], .factor-slot[data-node-id]')]
    .find(element => element.dataset.nodeId === id) || null;
}

export function createFactorisationPreview(document, equation, { onEnterPreview }) {
  const layer = document.createElement('div');
  layer.className = 'factorisation-overlay';
  layer.setAttribute('aria-label', 'Factorisation extraction controls');
  document.body.append(layer);
  let plan = null;
  let zoneRect = null;
  let zoneButton = null;

  function refresh() {
    layer.replaceChildren();
    zoneRect = null;
    zoneButton = null;
    if (!plan) return;
    // Explicit Group and precedence-bracketed Add share this visual affordance.
    const group = findHitbox(equation, plan.scopeNodeId || plan.groupId || plan.sumId);
    if (!group) return;
    // Exclude group descendants and ancestors from collision checks. Their
    // rectangles naturally overlap the group and are not external obstacles.
    const obstacles = [...equation.querySelectorAll('.add-operand, .factor-slot')]
      .filter(element => element !== group &&
        !group.contains?.(element) && !element.contains?.(group))
      .map(element => element.getBoundingClientRect());
    const viewport = document.defaultView
      ? { width: document.defaultView.innerWidth, height: document.defaultView.innerHeight }
      : null;
    zoneRect = chooseExtractionZone(group.getBoundingClientRect(), plan.direction, obstacles, viewport);
    if (!zoneRect) return; // Toolbar fallback when the geometry is crowded.
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'factorisation-zone';
    button.dataset.selectionControl = ''; // a touch tap here is not a selection
    button.style.left = `${zoneRect.left}px`;
    button.style.top = `${zoneRect.top}px`;
    button.style.width = `${zoneRect.width}px`;
    button.style.height = `${zoneRect.height}px`;
    button.title = `Preview common ${plan.direction} factor extraction`;
    button.setAttribute('aria-label', button.title);
    button.textContent = plan.direction === 'left' ? '← factor' : 'factor →';
    button.addEventListener('pointerdown', event => event.stopPropagation());
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      onEnterPreview();
    });
    zoneButton = button;
    layer.append(button);
  }

  return {
    setPlan(nextPlan) {
      plan = nextPlan ? { ...nextPlan, sourceFactorIds: [...nextPlan.sourceFactorIds] } : null;
      refresh();
    },
    isInsideZone(x, y) { return rectContains(zoneRect, x, y); },
    highlightZone(yes) { zoneButton?.classList.toggle('is-drop-target', Boolean(yes)); },
    clear() { plan = null; refresh(); },
    refresh,
    get plan() { return plan; },
    get layer() { return layer; },
    destroy() { layer.remove(); }
  };
}
