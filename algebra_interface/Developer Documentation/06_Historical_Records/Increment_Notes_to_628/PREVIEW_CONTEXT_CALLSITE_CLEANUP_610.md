# Preview context-change call-site cleanup

## Scope

This increment removes duplicate feature-specific modal cancellation in `restoreHistoryNode()` and `buildExpression()` after their shared `dismissPreviewsForContextChange()` guard. The shared routine retains responsibility for attempting every active preview dismissal and failing closed when cleanup fails or a modal lease remains held.

## Architectural invariants

- Invalid expression parsing does not dismiss an existing preview.
- History restoration validates the destination before dismissal.
- A failed modal dismissal prevents source replacement.
- Ordinary and factor drag sessions remain non-modal and are cancelled separately.
- Feature-specific preview visuals remain owned by their adapters, not by the context-change caller.

## Verification

- Node suite: 610/610 passed.
- JavaScript syntax check passed.
- Documentation links: 410 checked before this document was added.
- Playwright: pending for this increment; previous version passed user-run Playwright.

## Next

Audit remaining context-changing call sites for duplicated modal cleanup, but only remove calls when the shared dismissal guard precedes the source mutation. Test navigation and preview cancellation in a real browser before further changes.
