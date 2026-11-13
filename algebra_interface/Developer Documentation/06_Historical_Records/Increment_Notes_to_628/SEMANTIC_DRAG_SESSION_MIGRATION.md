# Semantic drag session migration (2026-11-10)

## Verified scope

Ordinary operand dragging now creates an immutable `semanticDragSession` on pointerdown. `updateDragTarget` checks the session before geometry, and `finishDrag` refuses commit when the source stamp or render generation has changed. The check compares the active view, pointer identity, DOM-index generation, document/object IDs, history revision, root ID, and serialized AST fingerprint. Stale movement cancels and clears drag UI; stale release takes the cancellation path.

This is a *safety and identity* increment, not a rewrite of drag feedback, rule eligibility, or preview handling. The existing geometry snapshot, `ordinaryDropArbitration`, insertion boundary, mathematical rule checks, and history commit remain authoritative in their respective roles. In particular, render-generation invalidation deliberately cancels rather than rebasing a gesture; supporting continuation after a harmless rerender would require a fresh source hitbox and geometry snapshot.

## Automated evidence

`node scripts/run-node-tests.mjs`: 473 passed, 0 failed on 2026-11-10. Four new tests in `tests/semanticDragSession.test.js` cover immutable identity, wrong pointer/view, stale render/source, and invalid input. Browser/Playwright testing has NOT been run in this environment; user verification required.

## Architecture and limitations

`js/input/semanticDragSession.js` is a pure, DOM-independent contract. It does not perform hit testing or infer mathematical rules. The application currently passes a serialized AST fingerprint on every pointer move, which is conservative but potentially expensive for large trees; future document revision counters should replace repeated serialization once all AST mutations are centrally managed. The drag controller still lives in `app.js`; migrating it is pending. Source hitbox selection at pickup still uses legacy DOM selectors; routing pickup through `semanticTargetResolver.addressFromElement` is pending and should be tested for nested hitboxes, Alt-selection and touch interactions.

## Browser acceptance checklist

- Drag an Add operand to a gap, confirm/cancel rearrangement, and verify history and node IDs.
- Drag a Multiply factor, verify commutativity rules still control eligibility.
- Drag onto a combinable sibling, a distributable sum, and a negation compression target.
- Click without moving; cancel with Escape, pointercancel, blur and tab visibility change.
- Switch object or rerender during a drag: no stale commit, ghost removed.
- Verify touch and nested group interactions and that no duplicate preview remains.

## Next implementation step

Replace ordinary-drag pickup's direct `dataset.nodeId` with a current semantic address from the resolver, without changing the existing nested-hitbox and Alt-selection behaviour. Then extract the drag state machine from `app.js` behind a controller contract. Do not delete old code until browser acceptance is complete.
