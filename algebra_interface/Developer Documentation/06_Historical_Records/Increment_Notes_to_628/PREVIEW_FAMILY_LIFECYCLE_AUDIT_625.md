# Six preview families — lifecycle boundary audit (625 baseline)

Status: source review on 2026-11-11. No production change. User reports complete Playwright suite passing for the preceding presentation-lifecycle release; this audit itself does not establish a new browser run.

## Shared contract (verified in source)

`js/interaction/previewSessionHost.js` owns the view-local lease, source-stamped single-use confirmation, terminal cancellation, and lease release even if presentation cleanup throws. A failed `presentation.show()` triggers cancellation and preserves the original opening error. A successful commit with failing cleanup reports a `cleanupError` rather than pretending the commit failed. Mathematical validity belongs to the transformation coordinator/rules, not to the host or overlay.

## Feature presentation adapters (verified in `js/app.js`)

| Family | Presentation entry | Layout/geometry or cleanup constraint |
| --- | --- | --- |
| Negation | `negationPreviewUI` | Inline candidate DOM is owned by the negation presentation controller, not the host. |
| Equality | `equalityUI.showPreview()` | Equality controller owns its visual cleanup; host owns lease and transaction. |
| Identity | `identityVisual.show()` then `setModal()` | Identity confirmation actions are shown and hidden by its presentation adapter; cancellation also stops transient drag feedback. |
| Grouping | `updateGroupToolbar()` then `groupingOverlay.enterPreview()` | **Layout before measurement:** revealing normal-flow confirmation controls moves the equation. Reversing this order caused the verified 34px alignment failure. Overlay itself owns viewport alignment. |
| Factorisation | `updateFactorisationToolbar()` then overlay clear and `transformationPreview.show()` | Candidate DOM and extraction presentation are owned by the transformation preview; cleanup distinguishes committed finish from cancelled restore. |
| Distribution | `state.distributionPreview` then `renderEquation(false)` | Preview decorates committed mathematics; normal presentation rerender deliberately preserves distribution and rebuilds its visual. |

## Boundary decisions

1. Keep feature-specific show/clear adapters: they implement genuinely different presentation contracts and are not redundant host implementations.
2. Keep application-level ordering where a state transition affects layout before geometry is measured. Do not relocate geometry calculations into `app.js`.
3. Keep the shared host as the only owner of modal lease/commit lifetime. Avoid a second generic preview controller or callback-forwarding layer.
4. Treat context navigation, presentation-only rerender, and commit cleanup as distinct lifecycle triggers. Do not unify their cancellation policies by default.

## Next evidence-driven review

Inspect whether identity confirmation actions or factorisation extraction controls can cause an equivalent layout-after-measure hazard. Write focused browser regressions only where a concrete layout-changing transition is demonstrated. Check existing `tests/previewCrossFamilyOwnership.test.js`, `tests/previewSessionHost.test.js`, and the feature integration tests before adding duplicate tests. Preserve the user-confirmed browser baseline and run the complete suite after any production change.
