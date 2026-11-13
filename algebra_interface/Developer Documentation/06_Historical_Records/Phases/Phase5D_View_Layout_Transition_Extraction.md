# Phase 5D-1 — View-local equation layout transition extraction

**Status (8 November 2026): implemented; 409/409 Node tests passed; browser tests pending (74 expected).** The preceding Phase 5C autosave/import fix passed 74/74 browser tests according to the project owner.

## Source-grounded extraction decision

The first conditional 5D seam is the existing FLIP layout transition inside `renderEquation()` in `js/app.js`. It captures old DOM rectangles by stable occurrence ID, renders and mounts a new expression tree, then animates surviving hitboxes to their new screen positions. This is view-local presentation geometry, not mathematical state or a gesture lifecycle. Extracting this small coherent responsibility is safer than extracting the central rerender cancellation sequence before characterizing all its callers.

## Changes and ownership

- New `js/ui/equationLayoutTransition.js` exports `createEquationLayoutTransition({ root, prefersReducedMotion, requestFrame })` with `capture(animate)` and `animate(firstRects)` methods.
- `js/app.js` still decides when to rerender, cancels feature-owned modal previews, mounts the mathematical tree, refreshes semantic targets and navigation, paints overlays and invokes the transition. Only FLIP geometry code moved.
- The transition is scoped to the supplied equation DOM root, not a global registry. `data-node-id` links surviving occurrences. It does not create, edit, or assign AST node IDs.
- No changes to rendering output, mathematical eligibility, modal ownership, commits, persistence, keyboard/touch gestures or accessibility. Reduced-motion and explicit no-animation paths remain disabled.
- `tests/phase5d-equation-layout-transition.test.js` tests surviving IDs, new IDs, subpixel thresholds, reduced-motion and scheduled frame cleanup.

## Acceptance and limitations

Node tests: **409/409 passed**; `node --check` passed for `app.js` and the new module. Full browser suite **74 expected, not run in this environment**. Browser verification should particularly check equation rerender, keyboard rearrangement, history navigation, grouping, negation, distribution and reduced-motion settings. The existing frame callback behavior is preserved, including the absence of a generation-token cancellation mechanism; do not claim delayed callbacks are newly hardened.

## Next 5D increment

Audit this extraction after browser verification. Before any larger view-lifecycle extraction, map cancellation and rerender call sites, order-sensitive refreshes, view/object identity and failure paths. Do not introduce a generic view controller or extract modal cleanup simply to reduce `app.js` line count.
