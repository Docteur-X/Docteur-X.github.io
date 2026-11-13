# Ordinary drag pickup migration — 2026-11-10

## Verified implementation

The ordinary operand `startDrag` path in `js/app.js` now calls `resolveOrdinaryDragPickup` in `js/input/ordinaryDragPickup.js`. The adapter consults the current view-local `semanticTargetResolver` in both directions and requires a current, exact occurrence representation matching the chosen visible draggable hitbox. It returns a frozen DOM-free mathematical address. AST location and Add/Multiply parent eligibility are still checked by the application. This is a **pickup boundary migration**, not yet a drag-controller extraction.

## Preserved behaviour

The existing pointerdown listener still chooses `.factor-slot` or `.add-operand` and preserves the nested occurrence guard and Alt-selection affordance. Factor drag has priority over ordinary drag. No changes were made to hover geometry, insertion boundaries, rule eligibility, preview, commit, history, or AST mutation.

## Evidence and limitations

`node scripts/run-node-tests.mjs`: 476 passed, 0 failed. Three new tests in `tests/ordinaryDragPickup.test.js` cover valid immutable pickup, stale/foreign/incorrect-role rejection, and nested mismatch/missing-object rejection. These are contract tests with a fake resolver; the user must run Playwright on the updated archive to establish browser behaviour. In particular, ensure rendered `.factor-slot` and `.add-operand` hitboxes have `data-hitbox-role="occurrence"` and that nested/Alt pickup works. The resolver index must be refreshed after rendering, as in the existing render lifecycle.

## Next increment

After Playwright passes, extract the ordinary drag lifecycle (pickup, movement, termination, cancellation) into a controller with explicit dependencies. Avoid moving mathematical rule execution or preview ownership into that controller. Preserve stable node IDs and existing semantic drag session freshness checks. Remove legacy code only when the replacement has browser evidence. Maintain the current source as the authority over older architectural drafts.
