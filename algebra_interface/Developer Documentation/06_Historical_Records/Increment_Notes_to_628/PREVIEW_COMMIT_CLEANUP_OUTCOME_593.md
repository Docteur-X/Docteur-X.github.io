# Preview commit versus presentation cleanup — 593-test increment

## Verified change

The shared `js/interaction/previewSessionHost.js` now preserves the authoritative mathematical outcome when the presentation cleanup callback throws after confirmation. `confirm()` returns the lifecycle result plus a `cleanupError` property rather than throwing the cleanup exception as though the commit had failed. This applies to stale outcomes too. The lease is still released by `cancel()`'s `finally`, and the proposal is consumed exactly once.

A mathematical commit callback exception remains the primary thrown error, even if cleanup also fails; the secondary failure is logged. Presentation failures during `open()` remain thrown. These are distinct outcomes and must not be conflated.

## Test evidence

Node test runner: 593/593 passed. Two additional cases in `tests/previewSessionHost.test.js` cover committed and stale outcomes with failed cleanup. Browser/Playwright verification is pending for this increment; the previous 592-test archive was user-verified.

## Architectural limits and follow-up

This is a shared host contract improvement, not a claim that every interaction entry point uses the modal gate. The UI callers currently primarily branch on `status`; they do not yet surface `cleanupError` to users. Audit remaining modal entry points and consider a central nonblocking presentation-warning policy. Do not retry an already committed operation. Do not turn immediate rearrangement or combination into modal previews merely for uniformity.

## Handover

Start with `ARCHITECTURE_CURRENT.md`, `HANDOVER_CURRENT.md`, this file, and `js/interaction/previewSessionHost.js`. Verify browser interactions and inspect the full interaction entry-point inventory before removing older guards. Preserve stable AST IDs, mathematical rule validation, atomic history publication, and view-local modal exclusivity.
