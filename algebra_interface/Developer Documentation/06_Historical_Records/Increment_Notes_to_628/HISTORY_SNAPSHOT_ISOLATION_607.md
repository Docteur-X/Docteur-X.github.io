# History snapshot isolation — 607-test increment

## Purpose and verified implementation

History records are authoritative snapshots, not mutable editor state. Prior to this increment, `createStateSnapshot()` and `restoreHistoryNode()` in `js/app.js` used shallow spreads for substitutions. The AST was already cloned, but nested substitution values could remain aliased to mutable working data.

`js/core/historySnapshotBoundary.js` now provides `detachHistorySnapshot(expression, substitutions)`. It copies the AST using `cloneExpression` (retaining stable node IDs) and deep-copies substitution data using `structuredClone`. The app uses the same boundary both when capturing and restoring a history snapshot. No history schema, mathematical rule, preview lifecycle, or document revision counter was changed.

## Tests and limitations

Three tests in `tests/historySnapshotBoundary.test.js` verify nested isolation in both directions, independent repeated restoration, and rejection of malformed substitutions. The complete Node suite passed **607/607** in the development container. Documentation links passed **411/411**. Browser/Playwright verification for this increment is **pending**; the previous 604-test version was user-verified.

The helper is intentionally small and does not enforce immutability for arbitrary callers of `findHistoryState`. A further audit should check other consumers that might mutate history node snapshots directly, and avoid adding redundant defensive layers where the existing history module already owns a clone.

## Next steps

Run Playwright, focusing on branching history, repeated restoration, object switching, and save/reload. Then inspect history consumers and consolidate the authoritative architecture documentation. Avoid adding an independent state store or revision counter without a demonstrated need.
