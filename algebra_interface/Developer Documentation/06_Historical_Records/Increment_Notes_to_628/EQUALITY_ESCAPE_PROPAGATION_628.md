# Equality Escape propagation boundary (628-test baseline)

## Source-verified defect and correction

`js/interaction/equalityInteractionController.js` listens for Escape during document capture. Previously it called `onCancel()` while permitting the same event to reach the window-level application Escape handler. A single keypress could therefore dismiss the equality proposal and trigger a second fallback action. The equality handler now calls `preventDefault()` and `stopPropagation()` **only while its preview is active**, then delegates cleanup to its existing `onCancel()` callback. The preview host remains the owner of proposal and modal-lease lifecycle; no new dispatcher or AST changes were introduced.

## Browser contract

`e2e/equality-escape-reacquire.spec.js` checks that the first Escape dismisses the equality proposal without reaching a window observer, that a fresh proposal can be opened and cancelled, and that an Escape after dismissal reaches the window observer. This avoids assuming selection CSS survives preview DOM replacement or that the equality menu is initially closed.

## Verification status

The user reported the preceding equality menu-state release passed the full browser suite. This change requires fresh browser verification. Node and documentation checks are reported separately in the release response. Do not infer browser success from Node tests.
