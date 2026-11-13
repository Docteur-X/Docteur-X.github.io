# Phase 5C — Workspace persistence coordination (increment 1)

**Status:** Implemented; 403/403 Node tests passed on 8 November 2026. Browser verification pending (74-test baseline passed previously, per project owner).

## Extraction decision

The Phase 5A inventory identified workspace autosave and asynchronous status handling as a cohesive seam with a concrete correctness concern: an older save completion must not overwrite newer import or document-switch feedback. Rather than extracting all document/object switching at once, Phase 5C extracts only save queueing, timer scheduling and status-generation ownership into `js/workspace/workspaceSaveCoordinator.js`.

`app.js` still owns active document identity, committed document snapshots, dirty markers, mathematical object switching, rendering, document import/export and user actions. The coordinator receives explicit callbacks; it does not import `app.js`, access DOM, inspect AST, or decide what is mathematically committed. The existing `workspaceStatusGate.js` remains the sole status-generation implementation.

## Behavioral contracts

1. Writes are serialized. A failed write does not prevent a later write.
2. A scheduled save captures the active committed document at scheduling time; it does not save whichever document is active when its timer fires.
3. Save completion clears the dirty marker only when its saved snapshot is still the current snapshot for that document.
4. Status messages are published only when their generation and document identity are current; import and activation invalidate older statuses.
5. Cancelling a timer does not cancel writes already queued. Deletion waits for queued writes.
6. The coordinator never publishes mathematical transformations or changes the active Mathematical Object.

## Changed files

- Added `js/workspace/workspaceSaveCoordinator.js`.
- Modified `js/app.js` to construct the coordinator, pass explicit dependencies, and use its queue/save/schedule/cancel/invalidate/wait operations.
- Added `tests/phase5c-workspace-save-coordinator.test.js` (five tests).
- Updated current status, handover and start-here documentation.

## Verification and limitations

`node --test tests/*.test.js`: **403 passed, 0 failed**. `node --check js/app.js` passed. Browser suite **not run** in this environment; owner should execute the full 74 Playwright tests, particularly compact import/export, pending autosave status, document switching, deletion, and history reload. No claim of browser parity until that gate passes.

This increment does not extract the document controller or object-switch lifecycle. The remaining Phase 5C extraction is conditional: audit the browser results and avoid expanding the coordinator into an all-purpose workspace manager. Roll back to the browser-verified Phase 5B Hardened ZIP if behavior differs.


## Phase 5C targeted follow-up: import/autosave status race (8 November 2026)

**Source-confirmed timing defect and fix.** A pending debounce timer previously created its status token only inside `saveDocument()` when the timer fired. An invalid import invalidates earlier status generations, but a previously scheduled timer could subsequently fire, capture the *new* generation and overwrite `Import failed` with `Saved ... locally.`. The fix captures the status token in `scheduleSave()` alongside the committed document snapshot and passes it to `saveDocument()` when the timer fires. Explicit immediate saves still capture a fresh token at invocation. This affects only status eligibility, not persistence order, dirty-marker ownership or mathematical state.

Two deterministic Node regression tests exercise the pending-timer-after-invalidation path, with both successful and failing storage writes. The old save still runs; its obsolete completion message is suppressed. A later genuinely new save can report normally. Node suite: **405/405 passed**; browser suite: **74/74 passed on preceding Phase 5C build (user confirmation), follow-up browser run pending**.

The coordinator's optional second `saveDocument(document, statusToken)` parameter is internal coordination between the timer and save handler. Do not expose it as an application-level status override.
