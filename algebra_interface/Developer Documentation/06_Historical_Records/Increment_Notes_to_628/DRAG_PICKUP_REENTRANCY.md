# Ordinary drag pickup: synchronous reentrancy hardening

Status: implemented; 533/533 Node tests passed on 2026-11-10. Browser verification pending for this increment.

## Why this change exists

Pickup previously checked its `canStart` guard before calling renderer/geometry collaborators. Those callbacks may synchronously change the active view, rerender, update the mathematical source, or publish a different drag. Publishing the prepared session after such a change would overwrite authoritative state with stale geometry and mathematical identity.

## Implemented contract

`js/interaction/ordinaryDragController.js` now captures the render generation and source stamp at pickup. After creating the ghost, capturing geometry and positioning it, but before publishing the drag, it checks that:

- The application's `canStart` guard still permits pickup (including the controller's authoritative no-active-drag check).
- The mathematical object identity has not changed.
- The render generation has not changed.
- Every field of the captured source stamp still equals its live value.

If any check fails, the ghost is removed and pickup returns `false` without preventing the native event or publishing drag state. Existing error cleanup remains intact. No mathematical rule or commit path changed.

## Verification

Five new tests in `tests/ordinaryDragPickupReentrancy.test.js` exercise concurrent drag publication, render invalidation, object replacement, source revision change, and normal successful pickup. All 533 Node tests pass. Run Playwright on Windows before marking this increment browser-verified.

## Architecture caveats and follow-up

This is a narrow lifecycle safeguard, not the promised broad dependency-interface consolidation. The pickup and movement collaborators remain numerous and `app.js` remains the composition root. A subsequent increment should map those dependencies into semantic source, presentation/geometry, feedback and policy ports without introducing a second state store. Avoid creating compatibility wrappers that perpetuate both interfaces. Keep the universal preview host and renderer separation as future work, not implemented features.
