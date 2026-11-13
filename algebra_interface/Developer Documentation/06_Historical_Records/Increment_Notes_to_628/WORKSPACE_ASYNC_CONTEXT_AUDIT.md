# Asynchronous workspace context changes — 2026-11-10

## Purpose

A modal preview owns the active mathematical view until it is confirmed, cancelled, or safely dismissed by deliberate context navigation. A rejected navigation must not create a phantom active document, persist an orphan document, or report a successful switch.

## Implementation in `js/app.js`

- `activateDocument(id)` now returns a boolean. It checks the preview-dismissal gate before cancelling save timers or mutating the active document.
- `createWorkspaceDocument(title)` checks preview dismissal before allocating the new document and rolls back its workspace registration if activation is refused.
- `importWorkspaceDocument(file)` validates the file before dismissing a preview. It persists the validated document before making it visible, rechecks the gate after asynchronous persistence, and removes an unactivated persisted import if the gate rejects it. It also declines to steal focus if the user navigated while persistence was in progress.
- Document duplication now checks preview dismissal and activation before scheduling persistence.

These changes do **not** rewrite the document repository, mathematical AST, history, or Preview Host. They preserve existing persistence ordering where possible.

## Verification

- Node tests: 593/593 passed locally.
- Documentation links: 410/410 passed locally.
- Added Playwright cases: creating a document while distribution preview is open; malformed import leaves preview intact. **Browser verification pending**.

## Remaining issues and decisions

- Async import rollback depends on repository removal succeeding; errors are surfaced as import failures. Future work could use a transactional repository interface.
- Creation and duplication currently save after activation; persistence failure remains an existing separate recovery concern.
- Audit deletion, close and pending save coordination for rejected navigation and concurrency.
- Verify both new Playwright cases and the entire suite on Windows before treating this increment as browser-verified.
