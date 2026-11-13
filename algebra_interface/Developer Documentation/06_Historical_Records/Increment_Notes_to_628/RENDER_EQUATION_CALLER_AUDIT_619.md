# `renderEquation()` caller audit — 2026-11-10

## Scope and source evidence

Audited all executable direct calls to `renderEquation()` in `js/app.js` against the current source, rather than inferring behaviour from the prior handover. No production refactor is justified by this audit. In particular, the two preview policies must remain distinct: presentation-only rerenders invalidate DOM-bound proposals; mathematical context changes dismiss all six preview families before changing the source.

| Caller | Purpose | Required preview policy | Evidence / risk |
| --- | --- | --- | --- |
| Distribution host `presentation.show()` | Show an amber candidate on the committed AST | Preserve distribution lease and proposal; invalidate other DOM-bound UI | `js/app.js`, distribution preview host; `e2e/phase5d2-rerender-transitions.spec.js` |
| Distribution host `presentation.clear()` | Remove amber candidate without committing | Preserve host cleanup ordering; rerender committed AST | `js/app.js`, distribution preview host; `e2e/preview-dismissal.spec.js` |
| Distribution commit exception recovery | Best-effort restore of equation DOM | Never replace original commit exception; host already consumed proposal | `js/app.js`, distribution confirmation catch block |
| Multiplication display mode | Change display only, never AST or history | Cancel equality and other DOM-bound proposals, preserve distribution | `e2e/equality-function-application.spec.js`; `e2e/phase5d2-rerender-transitions.spec.js` |
| `renderApplication()` | Publish after commits, navigation, and object changes | Shared presentation policy; context transitions dismiss previews separately before mutation | `js/app.js`, `renderApplication()` and context dismissal call sites |
| Keyboard occurrence selection | Repaint selected occurrence without a mathematical transformation | Rebuild semantic targets; do not commit history | `js/app.js`, equation `keydown` handler |

The previous duplication in `renderApplication()` was removed correctly: `prepareEquationPresentationRerender()` is invoked once by `renderEquation()` before geometry capture and detached DOM construction. The distribution exception is deliberate, not a missing cancellation. The distribution host itself calls `renderEquation(false)` from `show()` and `clear()`; a blanket cancellation would be reentrant and would destroy its own candidate.

## Conclusion

Do **not** merge `dismissPreviewsForContextChange()` with `prepareEquationPresentationRerender()`, move preview cancellation into `equationPresentationMount()`, or wrap every direct call in `renderApplication()`. Each would conflate interaction lifetimes or introduce unrelated panel updates. No further redundant cancellation was found in the six direct call paths.

## Coverage and next investigation

Existing browser regressions explicitly exercise display-preference cancellation of equality previews, preservation of distribution previews across display rerenders, and empty/populated object transitions. Browser-only semantics cannot be proven by the Node suite. The next useful engineering target is to inspect whether the `renderEquation()` presentation callbacks are doing redundant DOM work or are correctly ordered consumers; profile and characterize before extracting any new module. The keyboard selection direct rerender is also worth browser characterization for focus and semantic navigation continuity.

No production code or existing tests were changed in this audit. This is an intentional stop point, not a claim that the architecture is complete.
