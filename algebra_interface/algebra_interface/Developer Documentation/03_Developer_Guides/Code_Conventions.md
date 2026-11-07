# Code conventions and architectural boundaries

- Explain non-obvious mathematical and lifecycle reasoning in high-quality comments, not merely what the next statement does.
- Keep mathematical rules independent of DOM, pointer, CSS, IndexedDB and teaching visuals.
- Preserve existing AST node IDs for unchanged occurrences; allocate fresh IDs for copied/inserted occurrences; never conflate a clipboard snapshot with a live object.
- Treat previews as transient proposals, not authoritative state; source-stamp and single-use confirmations.
- Avoid arbitrary delays in browser tests; synchronize on visible eligibility and proposal states.
- Use stable rule IDs and keep backward-compatible serialization changes explicit and validated.
- Prefer a focused, reversible increment to a sweeping refactor; include tests, current docs and handover notes.
- Consider future vectors/matrices, logical relations, multi-window views and low-resource offline use, without prematurely implementing them.
