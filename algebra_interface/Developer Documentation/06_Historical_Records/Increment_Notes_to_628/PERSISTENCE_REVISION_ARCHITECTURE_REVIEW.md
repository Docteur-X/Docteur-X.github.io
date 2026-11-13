# Persistence revision architecture review — 2026-11-10

## Verified baseline
The user reports that the full Playwright suite passed for the 599-Node-test pending-save-race release. This report examines that source; it does not claim a new browser run.

## Current authoritative mechanism
`js/workspace/workspaceSaveCoordinator.js` serializes all writes on one promise queue. `scheduleSave` captures the current document object when scheduling, not when the timer fires. `saveDocument` calls the injected `isLatestSnapshot` before marking a document clean. In `js/app.js`, that callback compares the current Map value with the saved document by object identity. `js/core/documentController.js` uses replacement document objects for its exposed mutations.

`workspaceStatusGate.js` is separate: it suppresses messages from obsolete workspace contexts but does not cancel writes. Closing a dirty document waits for persistence and rechecks document identity and dirty state. This is intentional separation of concerns.

## Decision: do not add a document revision counter yet
The current immutable-snapshot identity is adequate for the observed document-controller mutation pathways. Adding a second revision number without removing identity comparisons would create another source of truth, not simplify the architecture. A revision counter becomes worthwhile if we need mutation-independent serialization, collaborative editing, more efficient cross-process freshness checks, or explicit persisted-version diagnostics.

## Invariants and risks
1. **Document replacement is a contract.** All changes affecting persisted data must replace the document object. In-place changes to an existing document object can bypass `isLatestSnapshot` and must be prohibited or guarded.
2. **Write success differs from latest-snapshot durability.** `saveDocument` returns true when its particular write succeeds, even if newer changes are dirty. Closing correctly checks dirty state and identity again; future callers must not mistake this boolean for latest-state durability.
3. **Global serialization is conservative.** It prevents out-of-order writes, but a slow write to document A delays B. Per-document queues are a possible future optimization, not justified without observed latency problems.
4. **Autosave debounce is not a transaction.** `cancelPending` cancels a scheduled timer, not a write already queued or running. Context switches preserve in-flight writes.
5. **UI status is not a persistence receipt.** `workspaceStatusGate` prevents stale status publication but does not prove disk durability beyond the repository save promise.

## Recommended next implementation
Make the immutable document replacement contract explicit in `workspaceDocuments.js` and tests. Add a focused integration test that each supported document-controller mutation produces a fresh document reference and leaves the previous snapshot unchanged. Then inspect whether any caller mutates nested persisted data in place. Only introduce a revision counter if that audit reveals an actual weakness that it solves more simply than immutable snapshots.

## Handover
Preserve the latest verified 599-test source as a baseline. No production behaviour is changed by this audit. Run `npm test`, `npm run check:docs`, and the Playwright suite before treating any subsequent code change as verified.
