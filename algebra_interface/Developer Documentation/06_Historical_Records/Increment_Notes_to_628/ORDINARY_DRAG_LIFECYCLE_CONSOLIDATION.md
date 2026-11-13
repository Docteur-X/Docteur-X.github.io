# Ordinary drag lifecycle consolidation — 2026-11-10

## Status
Implemented in production composition; Node tests pass. Browser tests are pending user verification. This document supersedes the separate pickup-controller and movement-controller extraction notes **for current architecture**, while those notes remain historical records.

## Why
Previously `app.js` constructed `createOrdinaryDragPickupController` and `createOrdinaryDragController` independently. The application now constructs one `createOrdinaryDragController({pickup, movement})` with five methods: `pickup`, `move`, `release`, `cancel`, `abandon`. Pickup and progression are private functions in `js/interaction/ordinaryDragController.js`; the separate `ordinaryDragPickupController.js` has been removed. Tests have been redirected to the unified module.

## Contracts and ownership
- `app.js` remains the owner of `state.drag`, modal guards, transformation rules, previews, and history. There is **no second drag state store**.
- Pickup resolves a live semantic AST occurrence and prepares a ghost and geometry before publishing state.
- Movement/release match pointer identity. Release refreshes target before settling; if the session disappears during refresh, it cannot be committed.
- Cancellation and abandonment never commit a mathematical operation.
- `ordinaryDragGeometry.js`, `ordinaryDragVisual.js`, and semantic drag-session validation remain separate focused modules.
- This consolidation does not unify factorisation or identity drag; their distinct lifecycles remain unchanged.

## Verification
- Node test suite: 495/495 passing after three new lifecycle-contract tests.
- JavaScript syntax checks and documentation-link checker: run during packaging.
- Playwright: **not run in this environment**; previous 492-test archive was user-verified. User should run browser tests on this archive, especially nested/Alt pickup, ordinary rearrangement, combination, distribution, cancel, pointer loss and modal exclusivity.

## Remaining work
The new public controller is one lifecycle facade, but its internal helpers still accept many injected callbacks and the application still owns drag state and target update. A future increment should inventory these callbacks, simplify dependencies and migrate state ownership only after agreeing on mathematical-object revisions, preview gating and teardown semantics. Do not replace the authoritative mathematical engine or history as part of this extraction. Keep node IDs stable.

## Handover
Current working archive is the unified-controller version. Treat older handover documents and audit descriptions as historical, not current truth. Preserve pedagogical correctness, stable AST identities, test evidence, and clear commentary with every change.
