# Drag completion decision extraction — 2026-11-10

## Verified state

The 511-test source-validity archive was reported Playwright-green by the user. This increment adds `js/interaction/ordinaryDragCompletion.js` and four Node tests. Node runner: 515/515 passing; documentation checker: 406/406 links valid. Browser verification of this increment is pending.

## Change and boundaries

`classifyOrdinaryDragCompletion` is a pure decision function distinguishing cancellation, click selection, distribution (requiring an available plan), negation compression, numeric combination and insertion. It does not inspect the DOM, modify ASTs, calculate mathematical eligibility, open previews or commit history. `app.js` continues to perform source/session freshness checks, rule arbitration, rule-specific revalidation, and all side effects. Insertion's existing `if (commit && target.kind === "insert")` branch is intentionally retained for compatibility with two existing source-text architecture tests; it should be migrated to behaviour-driven tests before replacing the branch condition.

## Important limitations

This is a modest seam, not a full extraction of `finishDrag()`. It does not yet simplify the many injected callbacks of the drag controller, unify preview lifecycles, or change history. The controller remains composed in `app.js`; the application still owns the drag state. The classifier must never be treated as mathematical validation: eligibility is checked by the arbiter and rechecked by the commit/preview pathways.

## Next steps

1. Run Playwright on this archive, including rearrangement and cancellation.
2. Replace source-text tests for the insertion exit with behavioural assertions.
3. Extract a testable drop-decision plan that separates eligibility from the effectful executor, retaining all live-source checks.
4. Consolidate authoritative documentation; avoid treating historical migration notes as specifications.
