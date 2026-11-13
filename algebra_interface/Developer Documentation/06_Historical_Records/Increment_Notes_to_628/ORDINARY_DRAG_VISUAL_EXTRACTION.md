# Ordinary drag visual extraction — 2026-11-10

## Verified implementation

The ordinary operand drag ghost construction and fixed-position update have moved from `js/app.js` to `js/interaction/ordinaryDragVisual.js`. This module is intentionally presentation-only. It receives a renderer-selected hitbox, clones it into an inert, pointer-transparent, keyboard-unfocusable visual element, freezes its dimensions, and positions it without changing the expression layout. `app.js` continues to own semantic pickup, session creation, mathematical eligibility, geometry capture, target arbitration, preview, and cleanup. Factorisation ghost creation is separate and **not migrated**.

Four regression tests in `tests/ordinaryDragVisual.test.js` cover inertness, dimensions, source preservation, and pointer-relative positioning. The full Node suite passed **484/484** and documentation links passed **406/406**. Browser/Playwright tests are **pending user verification** for this increment.

## Architecture boundaries and remaining work

The new module must never read AST nodes, mutate mathematical history, decide rule eligibility, or act as a drop target. Its DOM clone is decorative only. The production call sites preserve the existing visibility and lifecycle behaviour; the controller still owns release/cancellation coordination.

Next, consider extracting the geometry snapshot and pickup orchestration into a dedicated controller with injected semantic and mathematical dependencies. Keep geometry capture separate from mathematical rule planning: the current `makeDragGeometry` still calculates distribution plans, which is a dependency boundary to untangle. Preserve stable node IDs and atomic preview/commit semantics. Do not remove legacy documentation until the new authoritative documentation captures all still-relevant decisions.

## Handover

Source baseline: `Manipulator_Ordinary_Drag_Controller_Extraction.zip`, user-reported Playwright suite passed. This increment changes only ordinary drag visual construction/positioning. Verify nested/Alt drag, no layout jump, ghost visibility, pointerup/cancel/blur, rearrangement, combination, and distribution in the browser. Do not claim browser verification before the user runs it.
