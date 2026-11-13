# Ordinary drag live rule adapter extraction — 2026-11-10

## Verified implementation

The ordinary-drop eligibility callback assembly previously embedded in `js/app.js` `finishDrag()` now lives in `js/interaction/ordinaryDragRuleAdapters.js`. It is wired into the existing `validateOrdinaryDragTarget` and `arbitrateOrdinaryDrop` flow. It does not own a second drag state, a cached eligibility decision, a DOM dependency, or a commit pathway.

The adapters are lazy: when invoked, they consult the current root, current parent and current insertion boundary. The existing `validateOrdinaryDragTarget` dispatcher requires strict `true` and catches thrown exceptions, so missing dependencies or invalidated source state cannot accidentally become permission. The semantic drag session and source-validity gates run before arbitration, and rule-specific preview/commit pathways still revalidate.

## Behavioural scope and limitations

This is a dependency cleanup, not a mathematical rule rewrite. Combination, distribution, negation compression and rearrangement keep their existing engines and observable behaviour. `finishDrag` still coordinates selection, modal previews, commit side effects, rendering and status messages. The next architectural improvement should reduce that effectful branching using coherent lifecycle ports, without relocating mathematical rules into input modules.

## Verification

- Node test runner: 524/524 passing (four new tests in `tests/ordinaryDragRuleAdapters.test.js`).
- JavaScript syntax check passed.
- Documentation link checker: 406/406 valid.
- Browser Playwright verification is pending for this increment. The user reported all browser tests passing for the preceding 520-test archive.

## Handover

Keep AST node identities stable; never treat geometric hitboxes or a hover highlight as mathematical authority. Avoid creating parallel state stores. Preserve the existing preview exclusivity, cancellation semantics, source freshness and atomic history commits. Update the authoritative architecture and handover on each substantial increment; historical notes are not binding specifications.
