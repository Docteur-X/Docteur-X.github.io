/**
 * Presentation-only resources for an ordinary operand drag.
 *
 * This module deliberately has no access to the AST, rule eligibility, history,
 * or application state. The caller supplies the renderer-selected occurrence.
 * Its clone is inert: it is not a second mathematical occurrence and must not
 * be discoverable as an interactive drop target or keyboard control.
 */
import { makeInert } from '../rendering/inert.js';
export function createOrdinaryDragGhost(hitbox, documentRef = document) {
  if (!hitbox || typeof hitbox.getBoundingClientRect !== 'function' ||
      typeof hitbox.cloneNode !== 'function' || !documentRef?.body) {
    throw new TypeError('An attached renderer hitbox and document are required');
  }
  const rect = hitbox.getBoundingClientRect();
  const ghost = documentRef.createElement('div');
  // .math-scope: same nested-box layout as inside #equation (D9).
  ghost.className = 'drag-ghost math-scope';
  ghost.style.pointerEvents = 'none';
  const clone = hitbox.cloneNode(true);
  makeInert(clone, { hidden: true });
  // Explicit geometry avoids a compound term reflowing outside the flex
  // context in which the renderer originally measured it.
  clone.style.boxSizing = 'border-box';
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.minWidth = '0';
  clone.style.maxWidth = 'none';
  clone.style.flex = 'none';
  ghost.append(clone);
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.visibility = 'hidden';
  documentRef.body.append(ghost);
  return { ghost, rect };
}

/** Move a fixed-size ghost without affecting mathematical layout. */
export function positionOrdinaryDragGhost(drag, clientX, clientY) {
  if (!drag?.ghost) return false;
  const x = clientX - drag.offsetX;
  const y = clientY - drag.offsetY;
  drag.ghost.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  return true;
}
