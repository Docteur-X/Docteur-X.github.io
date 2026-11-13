# Ordinary drag state-port consolidation — 2026-11-10

## Verified implementation

The unified ordinary drag controller now accepts an optional shared `state` port with `getDrag()` and `publishDrag(drag)` methods. Production `app.js` supplies this port once; pickup and movement use the same application-owned `state.drag`. The controller does not create a second authoritative drag store.

The former pickup-level `publishDrag` and movement-level `getDrag` injection remain temporarily supported to avoid breaking isolated test fixtures. They are **compatibility wiring**, not the recommended production interface. Remove them only after all callers and tests are migrated. This increment deliberately does not change rule eligibility, geometry, preview exclusivity, AST revisions, or history.

## Evidence

- 498/498 Node tests passed locally after the change.
- 406/406 relative documentation links passed locally.
- Playwright is **not** executed in this environment for this increment. The user reported that the previous 495-test archive passed all Playwright tests.

## Browser verification requested

Run the complete Playwright suite on the new archive. Manually check nested and Alt-selection pickup, ordinary rearrangement, distribution, pointer cancellation, blur/visibility abandonment, and preview confirmation/cancellation if the suite does not explicitly cover them.

## Next architecture work

1. Migrate remaining isolated tests to the shared port and remove the legacy dual-injection compatibility path.
2. Define a single drag-session ownership and cleanup contract (including final-pointer-update invalidation).
3. Reduce the number of application callbacks passed into the controller by grouping them into explicit, domain-named ports; do not move mathematical rules into the controller.
4. Consolidate authoritative documentation only after reconciling it with source; preserve historical decisions until superseded references are verified.

## Important invariants

The AST and document history remain authoritative; DOM hitboxes never supply mathematical identity by themselves. Semantic pickup must reject stale/foreign targets. A preview must remain exclusive and cancellable. No drag cancellation may commit a transformation. Existing stable node IDs and mathematical correctness must be preserved.
