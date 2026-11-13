# Equality Escape and preview lease — focused characterization (2026-11-11)

## Purpose

The previous negation Escape characterization now passes in the user's browser. Equality has a separate document-capture Escape listener (`js/interaction/equalityInteractionController.js`), while the application has a window-level fallback (`js/app.js`). A source review does not establish a double-dismissal defect; the existing separation is not itself a reason to add another dispatcher.

## New browser regression

`e2e/equality-escape-reacquire.spec.js` exercises the real equality preview with a clipboard operand. It opens a proposal, presses Escape, checks that committed MathJSON and history are unchanged, reopens the same operation, verifies the preview can reacquire the shared lease, and cancels it without a commit.

The test deliberately **does not assume** equality preview entry preserves unrelated non-modal selection; that is a separate feature contract. It follows the existing equality-menu behavior: after cancellation the menu can close while the operation remains armed.

## Boundaries

- Equality controller: input-specific Escape handling and visual cancellation.
- Preview Session Host: modal lease, candidate lifetime and single-use confirmation.
- Application: context changes, selection and fallback Escape behavior.

Do not centralize these responsibilities merely to eliminate event listeners. If browser evidence later shows one keypress performs two independent actions, fix that specific dispatch boundary.

## Verification

- Node: 628/628 passed locally.
- Documentation links: check passed locally.
- New Playwright regression: **not yet run** in this environment; user verification required.
- Production code: unchanged.
