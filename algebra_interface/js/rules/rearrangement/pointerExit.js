/**
 * Side-effect boundary for a completed pointer rearrangement.
 *
 * The drag preview has already shown the destination order. Once the live
 * candidate has been revalidated and committed, a second FLIP transition
 * would replay that movement. This adapter makes the no-replay policy
 * explicit and testable without inspecting app.js source text.
 *
 * The caller owns candidate construction, status messages, and the actual
 * mathematical commit. This module owns only the sequencing of the commit,
 * drag cleanup, and final (non-animated) render. It intentionally does not
 * inspect or mutate the AST or history.
 */
export function completePointerRearrangement({ candidate, commitCandidate, clearDrag, render }) {
  if (typeof commitCandidate !== 'function' || typeof clearDrag !== 'function' || typeof render !== 'function') {
    throw new TypeError('Pointer rearrangement requires commitCandidate, clearDrag and render callbacks');
  }
  // Do not clean up if the commit callback throws: the caller's outer error
  // boundary must decide how to recover from an unexpected commit failure.
  const committed = Boolean(commitCandidate(candidate));
  clearDrag();
  render(false); // false = disable FLIP animation for this pointer drop.
  return committed;
}
