# Phase 4C — First live modal-preview lease migration

**Status:** Phase 4C browser-verified by owner (64/64). Phase 4C hardening implemented; hardened browser verification pending.
**Baseline:** Phase 4B 377/377 Node tests; owner-reported 62/62 browser tests passed.

## Scope and rationale

Negation expansion and compression share the existing negation preview lifecycle. Phase 4C integrates that preview family with the view-local `createModalPreviewOwnership('main-equation-view')` registry. It does **not** migrate equality, grouping, identity, factorisation or distribution, and does not remove their existing compatibility guards. It does not change the mathematical rules, AST, candidate, presentation, commit lifecycle or history publication.

The registry is constructed once for the currently mounted equation view; it is not a global singleton. The feature stores the acquired frozen lease, not a reconstructed token. Acquisition happens **after** mathematical proposal and intent arbitration, but **before** opening the existing commit lifecycle or rendering the candidate. Rejected acquisition leaves the current proposal untouched. A failed lifecycle open immediately releases the acquired lease.

`cancelNegationPreview()` cancels the mathematical proposal, clears feature-owned preview DOM, and releases the lease in `finally`. The same cleanup path is used for Escape, Cancel, confirmation success, confirmation error, stale confirmation, preview rendering error, full rerender and workspace object/document switching. Repeated cancellation is harmless; old tokens cannot release a newer lease. Existing reciprocal equality/negation checks remain in place during migration, since equality has not acquired shared ownership yet.

## Important boundaries

- The lease never authorizes mathematical correctness or history publication; `transformationCommitLifecycle` and atomic publication remain authoritative.
- The lease does not own DOM, keyboard focus, mathematical selection or presentation colour.
- The application currently has one mounted view; future Window Manager views require independent registry instances and view IDs.
- Phase 4C does **not** prove cross-family exclusivity is fully centralized. A family not yet migrated cannot be assumed to consult this registry. Existing modal guards remain necessary.
- An application-wide universal modal manager or new preview renderer would be premature.

## Verification

Node: existing 377 tests passed against the modified source (no new Node tests because the lease contract is already unit-tested in Phase 4B). Two new Playwright tests exercise actual negation activation/rejection, cancellation and reacquisition, exactly-once publication, and rerender cleanup. Run all 64 browser tests, and especially the existing negation/equality conflict suite. Browser verification pending.

## Next

After browser verification, audit the live lease lifecycle, especially cleanup after exceptions, object switching, and equality/negation conflicts. Migrate further modal families individually in Phase 4D only after their source-confirmed compatibility contracts are characterized.

## Phase 4C hardening checkpoint (2026-11-07)

- A single `equationViewId` now supplies the modal ownership registry and all ordinary-drag/negation arbitration calls. This is still one mounted view, not Window Manager support.
- All post-acquisition preview presentation, including candidate description and status updates, now shares one exception boundary. If opening fails, the proposal and lease are cancelled; cleanup errors are logged without masking the original failure.
- `negationInlinePreview.clear()` uses nested `finally` blocks so that a failure in confirmation-listener unbinding or visual-feedback cleanup does not skip restoration of the original mathematical DOM. The application still releases the lease in its own `finally`. A hypothetical failure of `equation.replaceChildren()` itself cannot be guaranteed recoverable by this mechanism; do not claim full recovery from arbitrary DOM failures.
- A browser regression test now switches Mathematical Objects during a negation preview, verifies no history publication, and reopens the preview on returning to the original object.
- This patch does not change mathematical eligibility, commits, other preview families, or the Phase 4D migration scope.
- Node: 377/377 passed after the patch. Browser: 65 tests expected, pending owner verification.
