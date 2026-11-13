# History snapshot consumer audit — 610-test increment

## Scope and findings

Audited `js/core/documentHistory.js`, `js/core/historySnapshotBoundary.js`, and the history display/restore paths in `js/app.js` against the requirement that authoritative recorded snapshots never alias mutable working values.

- `appendHistoryState()` deep-copies its input snapshot before storing it. Its history graph is intentionally mutable within the owner.
- `replayHistoryState()` reconstructs a detached value from event patches; callers may modify it without altering the recorded node.
- `exportEventHistory()` excludes snapshots and copies remaining event/metadata fields. `hydrateHistorySnapshots()` reconstructs an independent history graph.
- `restoreHistoryNode()` detaches both the AST and nested substitutions through `detachHistorySnapshot()` before making them editable.
- `renderHistoryTreeInto()` reads recorded snapshots to format labels; it does not modify them.

These are source-grounded observations and targeted tests, **not** a proof that all future history consumers are safe. In particular, `findHistoryState()` returns the live node object, so its callers must respect the editor's ownership contract.

## Changes and evidence

Added `tests/historySnapshotConsumers.test.js` with three tests: (1) recording/replay isolation from the original caller and from returned replay data; (2) event-only export and hydration isolation; (3) independent repeated editable restoration with stable recorded data. Nested substitutions are deliberately used to catch shallow copies.

No production code was modified. Node test suite: **610/610 passed** locally on 2026-11-10. Browser verification of this increment remains pending; the user verified the preceding 607-test version.

## Follow-up

Audit direct callers of `findHistoryState()` and graph mutation ownership, then prioritise consolidating documentation and genuine application orchestration complexity. Avoid new revision counters or state layers without a demonstrated need.
