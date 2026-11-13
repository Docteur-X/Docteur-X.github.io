# Negation Escape single-action boundary — 628 tests (2026-11-11)

## Evidence and diagnosis

The reported Playwright failure was at the assertion requiring two `.is-multi-selected` elements **during** a negation preview. The selection had been established before preview entry. `createNegationInlinePreview.show()` temporarily replaces the committed equation children with an inert candidate and action buttons, so selection CSS classes in the committed DOM are not available during preview. `clear()` restores the original nodes. The toolbar continuing to report two selected operands is consistent with retained selection state, not proof of live candidate highlights.

The source also exposed a real keyboard-dispatch hazard: the negation `document` keydown listener cancelled the preview but allowed the same Escape to bubble to `window`, where the application fallback clears non-modal range selection. This violates the one-Escape/one-interaction contract.

## Narrow correction

- `js/app.js`: when the negation preview handles Escape, call `event.stopPropagation()` before cancelling; the window fallback remains responsible for a subsequent Escape. No new dispatcher or mathematical-state owner.
- `e2e/escape-single-action-boundary.spec.js`: assert that preview DOM has no committed selection classes while the candidate is displayed, then assert that the two selected occurrences return after the first Escape; a second Escape clears selection. Preserve AST/history checks.

## Verification and next action

- Fresh Node suite: **628/628 passed** in this environment.
- Browser suite: **not run here** (Playwright dependencies unavailable); run `npx playwright test e2e/escape-single-action-boundary.spec.js` then `npx playwright test`.
- Do not describe the earlier reported Escape test pass as verification of this corrected contract; the subsequent failure supersedes it.
