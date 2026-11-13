# T3-9B — Autosave and persistence reliability test review

**Date:** 8 November 2026. **Status:** implemented and Node-verified; awaiting independent owner acceptance. **Baseline:** owner-accepted T3-8. **Scope:** test-only, no production changes.

## Objective and evidence-based decisions

The T3-9A document-serialization review found genuine overlap between two empty-object round-trip tests, but retained both because removing one offered negligible maintenance savings. The corrupted-import and complete-document round-trip assertions were retained unchanged. No T3-9A code changes were made.

T3-9B reviewed all seven `tests/phase5c-workspace-save-coordinator.test.js` tests and retained them, including both import-invalidation outcomes (successful write and failed write). The existing tests did not detect two high-consequence mutations: concurrent writes that could allow an older snapshot to overtake a newer one, and clearing the dirty marker after a failed write.

Added exactly two focused tests in the same file:

1. **`5C queued writes wait for earlier writes to settle`** uses a controlled promise gate to hold the first write open, then yields an event-loop turn (via `setImmediate`, not a timed sleep) to detect an incorrectly concurrent second write. It releases the first write and verifies both complete in order. The test's initial microtask-only probe was insufficient to detect the concurrency mutation; the final test was corrected and verified to fail against that mutation.
2. **`5C failed save never clears the dirty marker`** injects a rejecting storage callback and verifies no `markSaved` call occurs while the current failure status is reported.

No production files, existing test assertions, test names, or fixtures were changed. No tests were merged or removed. The new tests verify injected save-coordinator contracts, not real-browser IndexedDB durability.

## Verification evidence

- Targeted: `node --test tests/phase5c-workspace-save-coordinator.test.js` — **9/9 passed** (previously 7).
- Full Node: `node scripts/run-node-tests.mjs` — **419/419 passed** (previously 417).
- Controlled mutation A: replace the sequential `queue` chain with independent promises. The final targeted suite **fails the queue-order test**.
- Controlled mutation B: call `markSaved` from the rejected-write catch branch. The targeted suite **fails the dirty-state test**.
- Both mutations were applied temporarily, independently, and reverted; the packaged production module matches the T3-8 baseline.
- Documentation link checker and archive integrity: see the release verification summary.
- Playwright: **not rerun**. Independent owner acceptance: **pending**.

## Rollback and next gate

Restore `tests/phase5c-workspace-save-coordinator.test.js` from the owner-accepted T3-8 ZIP and revert this checkpoint's documentation additions. No production rollback is necessary. Stop for owner testing before selecting the next T3 batch. Preserve the distinction between durability, dirty-state correctness, and status-message correctness.
