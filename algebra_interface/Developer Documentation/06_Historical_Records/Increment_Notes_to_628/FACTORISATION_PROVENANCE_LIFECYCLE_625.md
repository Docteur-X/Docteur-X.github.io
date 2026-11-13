# Factorisation provenance lifecycle regression (625-test baseline)

## Scope

The identity overlay containing-block correction passed the full browser suite according to the user. This increment adds `e2e/factorisation-provenance-lifecycle.spec.js` to that exact baseline, without changing production code.

## Source contract

`js/interaction/transformationPreview.js` owns temporary candidate presentation and provenance SVG paths; its cleanup removes temporary visual elements. The shared preview host owns modal lifecycle and confirmation authority. `app.js` supplies the candidate and coordinates the transition, not arrow geometry. The regression checks two explanatory arrow paths, unchanged committed AST/history during preview, and disappearance of arrows and confirmation target on cancellation.

## Verification and limitations

Node suite and documentation links were checked locally. The new browser regression requires a Playwright run on the user's machine; it has not yet been verified. If it fails, inspect the trace before changing the presentation contract. Do not introduce a generic preview controller or move geometric responsibility into `app.js` merely to make the test pass.
