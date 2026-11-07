# Architectural Consolidation v1.2 — Interaction Lifecycle Repair

## Scope and verified baseline

Based on Architectural Consolidation v1.1 (browser rendering repair), which the project owner verified with 223 Node tests and 26 Playwright tests. This is a bounded lifecycle repair, **not** a new transformation contract or a mathematical rule change.

## Invariants and implementation

1. **Amber confirmation survives pointerdown.** Browser pointer events arrive in the order pointerdown, pointerup, click. The equality controller's document capture listener must exempt `data-equality-preview-confirm` descendants; otherwise it removes the candidate DOM before the click can invoke the host's confirmation callback. This applies to both amber operands and the explicit Confirm button. Clicking elsewhere still cancels. Escape still cancels.
2. **Any full equation rerender invalidates an equality preview.** `renderEquation()` is the common DOM replacement boundary and now cancels an outstanding equality candidate before constructing and mounting a fresh renderer tree. This covers direct calls from multiplication display changes as well as calls through `renderApplication()`. Cancellation restores saved nodes before replacement; no candidate AST is committed and no history entry is created. The existing `renderApplication()` guard is deliberately retained as a redundant safety boundary.
3. **Controller ownership of global listeners.** The equality controller registers named resize, scroll, pointerdown and keydown listeners; the clipboard controller registers named pointermove, pointerup, pointercancel and blur listeners. Each exposes idempotent `dispose()` to remove global listeners and transient DOM. `dispose()` is intended for future unmounting; the current single-view app keeps both controllers for its lifetime.
4. **Interrupted clipboard drag cleanup.** The clipboard controller exposes `cancelDrag()` and calls it on full mathematical rerender, window blur, pointercancel, clipboard clear, or source entry removal. A missing source or disarmed equality also aborts a moving gesture. Cancelling a drag never invokes the mathematical engine or changes history.

## Architecture

The Mathematical Object and history remain the authoritative state. Controllers own temporary presentation state and browser event listeners, never mathematical rules. `app.js` retains proposal, stale-state validation and commit responsibility in this increment. The registered mathematical feature and its engine rule are unchanged.

The `renderEquation()` guard is intentionally placed before the renderer builds a new tree; future render paths must either use that function or explicitly invalidate active transient views. Future multi-window work should instantiate one controller per view and call `dispose()` on unmount. A window's inactive status should not imply disposal unless it is actually unmounted.

## Testing

- Existing 223 Node tests remain required.
- Two browser regressions were added: amber-operand click confirmation and display-mode rerender during an active equality preview.
- Run `npm test` and `npm run test:e2e` (expected 28 browser tests).
- Manual follow-up: interrupt a clipboard drag by clearing/removing its source, switching mathematical objects, or moving focus away from the browser. Verify no ghost remains and no mathematical history commit occurs.

## Deferred

The shared transformation proposal/commit lifecycle, unified gesture arbitration, visual-role standardization, and general multi-window lifecycle are separate future milestones. Do not expand this repair into those systems.
