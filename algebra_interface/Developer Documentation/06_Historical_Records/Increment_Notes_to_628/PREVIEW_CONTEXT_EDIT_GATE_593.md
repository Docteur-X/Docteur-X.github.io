# Preview context-edit gate — 2026-11-10

## Architectural decision

Numerical substitutions are part of the mathematical source. Applying or clearing them during a deliberate preview is a competing mathematical context edit, not a harmless change to a sidebar. Both operations now consult the existing view-local mathematical interaction gate before changing substitutions, drafts, history, or rendering. A blocked action explains that the student must confirm or cancel first.

`restoreHistoryNode()` also checks the gate at the point of mutation. This protects future shortcut or adapter callers, rather than relying exclusively on history-tree click handlers.

## Scope and non-goals

The implementation deliberately does not add a second modal state store or new policy module. It preserves the existing Preview Host and all mathematical rules. Typing a draft value remains allowed; *applying* it is blocked. Expression replacement and workspace/object navigation are distinct context-changing operations: they may invalidate a preview, but must be audited separately for comprehensive cancellation and lease release. This increment does not claim that those pathways are safe.

## Evidence

- Node tests: 593/593 passed locally.
- Documentation links: 410/410 valid locally.
- JavaScript syntax: passed locally.
- New Playwright scenarios in `e2e/preview-mathematical-context-gate.spec.js` cover applying and clearing substitutions during negation previews, history preservation and recovery after Escape. **Not run in this environment**; user browser verification required.

## Follow-up

1. Verify the new Playwright scenarios and the existing browser suite.
2. Audit expression replacement, workspace and object switching, including grouping/equality/identity preview invalidation, before changing their policy.
3. Audit undo/redo and other direct history restoration callers.
4. Consolidate legacy guards only where the shared gate and browser tests prove equivalence.
