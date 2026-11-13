# Workspace close durability — 597-test increment

## Status

Implemented in the working copy; 597/597 Node tests pass; 410 documentation links checked; browser verification pending. Previous 595-test deletion version passed Playwright according to the user.

## Problem

The Close button launched `saveDocument(activeDocument())` without awaiting persistence and immediately removed the active view. The coordinator caught storage failures and returned no result, so the caller could not distinguish success from failure. A failed save could leave the only working view closed while its latest snapshot was not durable.

## Change

- `workspaceSaveCoordinator.saveDocument` now returns `true` after repository persistence succeeds and `false` after it rejects. Existing status reporting and dirty-marker semantics are preserved.
- The Close handler awaits a dirty document's save. Failure keeps it open. After the await it checks active document identity, snapshot identity and dirty state before closing. Navigation or edits during the wait prevent a stale close.
- The modal-preview dismissal contract remains unchanged. No mathematical transformation logic changed.

## Verification

- `node scripts/run-node-tests.mjs`: 597/597 passed.
- `node scripts/check-documentation-links.mjs`: 410/410 valid.
- `node --check js/app.js` and `node --check js/workspace/workspaceSaveCoordinator.js`: passed.
- New coordinator tests cover successful and failed persistence outcomes.

## Remaining risks and next steps

- Browser-test dirty-close success and injected persistence failure; the Node tests do not simulate clicking Close.
- A user can edit while an async save is pending. The snapshot identity and dirty checks must continue to protect the newer state.
- Status messages for a failed save on an inactive document may be suppressed by the status gate. This is appropriate for stale status, but should be reviewed in a broader persistence UX audit.
- Review pending-save and close behavior for multiple open documents; do not conflate document closing with deletion.
