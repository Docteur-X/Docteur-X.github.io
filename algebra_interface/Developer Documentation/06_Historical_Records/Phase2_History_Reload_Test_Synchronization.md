# Phase 2 browser QA: history reload synchronization

## Symptom

`e2e/history-navigation-quality.spec.js` failed after reload: history node 3 had `aria-current="false"` despite having been selected successfully before reload.

## Root-cause hypothesis and code evidence

`restoreHistoryNode()` updates the live cursor, calls `captureActive()`, then `scheduleSave()`. The latter schedules the captured document for an IndexedDB write after a 350 ms debounce. The original browser test reloaded immediately after the last branch selection. A reload can cancel the pending timer before the save begins, so it cannot reliably assert the last cursor was durable. This is a test synchronization problem under the current autosave contract, not evidence of a semantic-target-resolver regression.

## Test-only correction

The test now waits for `#workspaceStatus` to report `Saved Branching fixture (imported) locally.` before reloading. The application publishes this status after its queued IndexedDB save resolves. Waiting on this specific message is more reliable than an arbitrary delay, and prevents an earlier unrelated status from satisfying the assertion.

No production files, mathematical operations, persistence contracts, or Phase 2 resolver code were modified.

## Verification

Node: 301/301 passed after the change. Browser test must be rerun in an environment with Playwright and Chromium. The reported failure is expected to disappear if the debounce race is the only cause; if it persists, inspect the stored `currentNodeId` and document activation on reload rather than weakening the branch assertion.

## Follow-up

The product still allows loss of the *last navigation selection* if a user reloads or closes within the autosave debounce. Decide separately whether immediate durability is required; this targeted QA fix does not change that product behaviour.
