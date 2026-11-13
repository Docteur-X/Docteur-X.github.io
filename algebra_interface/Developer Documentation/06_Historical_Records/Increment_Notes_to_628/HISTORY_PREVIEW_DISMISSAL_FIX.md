# History navigation / preview dismissal regression fix

## Reported failure
Playwright `preview-dismissal.spec.js` test `restoring history by keyboard closes an open distribution preview` expected zero `.distribution-preview__copy` elements after pressing Enter on a focused history revision, but found two.

## Root cause
The history-tree handler and `restoreHistoryNode()` returned early whenever `mathematicalInteractionGate.isBlocked()` was true. A live distribution preview holds the modal lease, so the history action was ignored rather than cancelling the preview.

## Policy and implementation
Valid history navigation is an explicit context change. At the authoritative restoration boundary, cancel any active feature preview, verify modal ownership has been released, then restore the historical snapshot. Unknown history IDs are ignored without dismissing the preview. Keep other mathematical operations blocked by the shared gate. The history-tree click handler delegates to this boundary rather than imposing a second guard.

## Verification
Node suite: 593/593 passing locally. JavaScript syntax checked. The existing keyboard-history Playwright test exercises the reported failure and must be rerun on the user's computer; browser results are pending.

## Next checks
Test keyboard and pointer history navigation with active previews, including stale source and cancelled proposal cleanup. Check that history remains unchanged when returning to the same revision and that no preview can commit after navigation.
