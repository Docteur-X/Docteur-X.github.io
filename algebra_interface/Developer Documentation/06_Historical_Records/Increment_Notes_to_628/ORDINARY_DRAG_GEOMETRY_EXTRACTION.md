# Ordinary drag geometry and distribution eligibility extraction — 2026-11-10

## Purpose and philosophy

Maintain a clean boundary between user geometry (where the pointer is), semantic identities (which AST occurrence is involved), mathematical eligibility (which transformations are legal), and preview/commit. Do not sacrifice factor order or stable AST IDs to simplify dragging; noncommutative multiplication remains a future requirement.

## Implementation

`js/interaction/ordinaryDragGeometry.js` exports `planOrdinaryDragDistributionTargets(root, drag)` and `captureOrdinaryDragSnapshot(equation, root, drag)`. The first finds the current Multiply parent, checks only adjacent grouped/bare sums through the existing pure distribution rule, and returns a new `Map<sumId, plan>`. The second passes eligible sum IDs to the existing geometry-only `captureDragGeometry` and returns `{ geometry, plansBySumId }`. Neither function changes the AST, history, or preview. The existing `makeDragGeometry` function in `app.js` is now a short state-binding adapter; it assigns the returned plan map to the current drag and returns the geometry snapshot. Both pickup and scroll/resize refresh continue using this adapter. The existing semantic session freshness check remains the authority on whether a drag may proceed.

## Verification and limitations

Four tests in `tests/ordinaryDragGeometry.test.js` cover left/right factor ordering, nonadjacent exclusion, missing/non-Multiply parents, eligible plus signs, source hitbox preservation and fresh plan maps. Node suite and docs checks should be run for this increment. Playwright must be verified by the user on Windows. This extraction does NOT yet migrate pickup orchestration, eliminate the `app.js` drag state, or create a unified preview host. The current `captureDragGeometry` still reads renderer-declared DOM data attributes for measurement; the separate semantic pickup and freshness checks guard identity at drag initiation.

## Next steps

1. User verifies browser drag interactions (nested and Alt pickup, reorder, combine, distribution, scroll/resize refresh, cancellation).
2. Extract pickup orchestration with explicit dependency injection and avoid parallel legacy paths.
3. Continue toward an `app.js` composition root, with one semantic interaction contract and one exclusive preview lifecycle.
4. Replace old documentation only once decisions and verified status have been transferred to authoritative new documents.

## Handover

Baseline is `Manipulator_Ordinary_Drag_Visual_Extraction.zip`, whose Playwright suite was user-reported passing. This increment is limited to ordinary drag geometry and distribution eligibility. The Node suite should increase from 484 to 488 tests. Do not claim Playwright was run in this container.
