# Identity and factorisation context-switch ownership (628 Node baseline)

## Purpose

Characterise the remaining preview-family object-switch paths without creating another lifecycle controller. This is a browser-test increment, not a production refactor.

## Source findings

- `app.js` routes object switching through `cancelWorkspaceInteraction()` and `dismissPreviewsForContextChange()` before replacing the active mathematical source.
- The six-entry `previewDismissals` inventory delegates visual cleanup to feature-specific cancellation functions; the shared Preview Session Host owns candidate validity and the modal lease.
- `loadActiveObject()` has additional non-modal presentation cleanup. It must not become a second authority for deciding whether context navigation is permitted.
- Identity's candidate is panel-anchored; factorisation's explanatory provenance is temporary DOM. Both must disappear on context replacement without changing the original object's AST or history.

## Regression added

`e2e/preview-context-switch-ownership.spec.js` tests object switching with an identity candidate and with factorisation provenance, verifies no stale candidate remains, checks original AST/history, and requires that a new preview can acquire the released lease.

## Verification

Node tests and documentation links are locally checked for this increment. The new Playwright cases require browser execution; do not mark them passed based on the prior release's successful browser run. The user reported the prior 628-test release's full browser suite passing.

## Follow-up

If these tests fail, diagnose the precise feature adapter and its cleanup order. Do not replace feature-specific visual cleanup with a generic coordinator or weaken the modal gate. Consider the Escape-key cancellation route separately; it currently has a feature-specific priority chain rather than using the context-change dismissal inventory.
