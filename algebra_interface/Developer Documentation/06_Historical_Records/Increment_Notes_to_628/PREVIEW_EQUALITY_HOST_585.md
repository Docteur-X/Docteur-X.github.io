# Equality preview migration — 585-test increment

## Scope and verified status

Equality application is the sixth major preview family routed through `createPreviewSessionHost`, following negation, identity insertion, distribution, grouping and factorisation. This increment changes lifecycle ownership only; equality arming, the mathematical coordinator, the candidate renderer, clipboard-source capture, atomic history publication and visual roles remain unchanged.

The shared host now owns equality's modal lease, proposal consumption, source-stamp validation, confirmation and terminal cleanup. `equalityInteractionController` remains responsible for menu/arming and preview DOM only. The production-specific equality lease, sequence counter and commit lifecycle were deleted. `app.js` continues to orchestrate the feature-specific atomic commit callback.

## Interaction contract

1. The student arms a supported equality operation and chooses an expression clipboard entry.
2. The mathematical coordinator proposes a detached candidate and the application captures clipboard provenance.
3. The host acquires the view-local modal lease and displays the existing amber inline candidate.
4. Confirm consumes the proposal once, validates the current source stamp and publishes a staged atomic mathematical/history result. Cancel clears the candidate without changing the AST.
5. Revoked ownership, stale source, and failed presentation do not authorise a commit. The host releases ownership on terminal paths.

## Test evidence

Three new Node regression tests verify single-use confirmation, idempotent cancellation, stale source and externally revoked ownership. The full Node suite and documentation-link checker should be run for every increment. Browser tests remain user-run and **must not** be represented as independently executed here.

## Browser acceptance checklist

Check equality arming and each supported context (add-right, multiply-left, multiply-right); expression versus relation clipboard entries; amber preview and both confirm affordances; cancel and Escape/click-away if supported by existing UI; duplicate confirmation; history/undo; document/object switch; and interaction locking. Also rerun negation, identity, distribution, grouping and factorisation previews to detect modal-ownership regressions.

## Remaining architecture work

Review other smaller preview lifecycles (notably rearrangement and numeric combination) before claiming that *all* preview pathways use the host. Improve cross-feature tests distinguishing commit failures from cleanup failures. Avoid redundant wrappers or additional state stores. Update the authoritative architecture and handover instead of appending contradictory historical summaries.
