# Workspace close failure — browser regression (2026-11-10)

## Scope and philosophy

A dirty mathematical document must remain available if the IndexedDB transaction used by Close fails. A failed write must not poison later saves. This increment adds browser verification only; it deliberately does not alter the mathematical engine, the Preview Host, or the production save coordinator.

## Test added

`e2e/workspace/close-save-failure.spec.js` uses the actual UI and repository. It temporarily replaces `IDBObjectStore.prototype.put` for the `documents` store with a throwing function, edits the expression, clicks Close, and verifies that the save-failure status is visible, the editor remains open, and the AST text remains unchanged. It then restores the original browser method, retries Close, reopens the document, and verifies the saved AST.

The temporary browser override is restored in a `finally` block. This is a deliberately controlled fault injection, not a production application hook.

## Verification

- Node: 597/597 passing locally.
- Documentation links: 410/410 valid locally.
- JavaScript syntax check: passed.
- Browser: **pending user Playwright run**; do not describe the failure/retry scenario as verified until it passes.

Run `npx playwright test e2e/workspace/close-save-failure.spec.js` and then `npx playwright test`.

## Remaining work

If this regression fails, inspect the trace before altering production code. The test's browser fault injection and its expectation about reopening a closed document should also be reviewed for platform differences. Future durability work should test changes made while an asynchronous save is pending, and storage failures during deletion/import. Avoid introducing a parallel workspace state store.
