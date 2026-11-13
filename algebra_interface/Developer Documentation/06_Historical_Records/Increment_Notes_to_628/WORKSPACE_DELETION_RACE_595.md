# Workspace deletion race guard — 595 tests

## Verified change

`deleteActiveDocument()` now rechecks active document identity after awaiting queued saves. A deletion that has lost its original active context is abandoned before calling the repository. After repository removal, bookkeeping is removed by the original document ID; if the user has switched meanwhile, the new active view is preserved.

`js/workspace/workspaceDeletionGuard.js` contains the pure identity check. It deliberately compares IDs, not snapshot references, because commits can replace immutable document snapshots.

## Verification

- 595/595 Node tests passed with `node scripts/run-node-tests.mjs`.
- 410 relative documentation links passed with `node scripts/check-documentation-links.mjs`.
- `node --check js/app.js` passed.
- Browser/Playwright verification is **pending** and must be performed by the user.

## Remaining risks and next actions

- Exercise deletion with slow persistence, navigation while awaiting saves, and navigation while awaiting repository removal in browser/integration tests.
- Closing a dirty document currently schedules a save without awaiting it. Inspect user feedback and durability expectations; do not claim the document was saved until persistence succeeds.
- Avoid unbounded extraction of tiny modules. Consolidate related workspace orchestration when behaviour is protected.
