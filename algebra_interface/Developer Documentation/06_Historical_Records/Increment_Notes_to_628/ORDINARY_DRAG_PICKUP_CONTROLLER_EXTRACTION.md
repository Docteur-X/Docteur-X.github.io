# Ordinary drag pickup controller extraction — 2026-11-10

## Intent

Keep the semantic input contract distinct from renderer hitboxes and mathematical transformation rules. The application composition root supplies modal guards, the active object, current AST, render generation, source revision, and presentation adapters. The pickup controller assembles a drag session without becoming a mathematical rule engine.

## Actual implementation

`js/interaction/ordinaryDragPickupController.js` now owns ordinary operand pickup orchestration. It calls the existing `resolveOrdinaryDragPickup` for current view-local occurrence identity, requires an Add/Multiply parent, creates a semantic drag session, creates an inert visual ghost, captures geometry, and publishes the drag only after successful preparation. `app.js` now composes the controller and retains a small `startDrag` delegation. The original event listener still decides the visible hitbox and Alt nesting semantics; selected-factor pickup remains a distinct pathway. `makeDragGeometry` remains an app adapter that stores the eligible distribution plans on the candidate drag.

The controller does not own hover hit testing, mathematical legality, preview, history, or commits. It intentionally preserves the existing drag object shape to avoid changing downstream interactions in this increment. It cleans up the ghost if geometry or visual setup throws, but exceptions are still propagated to the caller. Full exception recovery and pointer-capture policy should be considered in a later lifecycle hardening increment.

## Verification

Four new tests in `tests/ordinaryDragPickupController.test.js` cover successful semantic pickup, stale/foreign rejection, non-associative parent rejection, and cleanup on geometry failure. Local Node suite: **492/492 passed**. Documentation checker: **406/406 links valid**. Browser tests **not run in this environment**; the immediately preceding geometry extraction was reported Playwright-passing by the user.

## Remaining risks and next work

- Verify mouse/touch dragging, Alt nesting, factor pickup, distribution, rearrangement, scroll/resize and cancellation in Playwright.
- Consider consolidating controller ownership of drag state with the existing move/release controller; currently the composition root retains `state.drag` and cleanup.
- Consolidate the redundant feature-specific preview lifecycles only after a stable semantic interaction contract is verified end-to-end.
- Preserve stable AST IDs and never infer mathematical validity from geometric target addresses.

## Handover

Use the current ZIP as the next browser-test candidate. Do not describe this as a complete drag-controller rewrite. The authoritative baseline before this increment was `Manipulator_Ordinary_Drag_Geometry_Extraction.zip` with 488 Node tests and user-reported passing Playwright tests. The older architecture documents contain design intentions and historical status, not always implemented facts.
