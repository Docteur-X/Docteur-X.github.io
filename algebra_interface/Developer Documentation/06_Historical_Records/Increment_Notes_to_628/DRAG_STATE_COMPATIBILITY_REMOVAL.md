# Drag state compatibility removal (2026-11-10)

## Verified implementation

`createOrdinaryDragController` now requires `state.getDrag` and `state.publishDrag`. It no longer accepts `pickup.publishDrag` or `movement.getDrag` as alternate sources. The production composition root was already using the shared port. Existing isolated tests were migrated to that contract. No mathematical rules, AST operations, renderer geometry, preview, or history code changed.

## Invariants

- One application-owned drag session; the controller does not maintain a second store.
- Pickup publishes only after successful validation and geometry preparation.
- Release re-evaluates the target and will not settle an invalidated session.
- Cancellation never commits.
- All ordinary drag operations must use the same state port.

## Verification

Node suite and documentation-link checker must pass. Browser tests remain user-run on Windows and are not claimed to have been run here.

## Next work

Reduce remaining controller callback surface carefully, preferably by grouping related ports with documented ownership, without adding a second source of truth. Review stale preview and render generation interactions before any larger restructuring. Historical documents remain archival, not authoritative.
