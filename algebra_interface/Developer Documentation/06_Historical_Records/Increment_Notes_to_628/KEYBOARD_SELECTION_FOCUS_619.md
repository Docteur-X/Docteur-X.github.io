# Keyboard selection focus continuity (2026-11-10)

## Source-confirmed issue and change

`js/app.js` handles Enter/Space on a semantic occurrence by recording `selectedNodeId` and calling `renderEquation(false)`. The equation mount replaces the old hitbox; browser focus can consequently fall back to the document instead of the newly rendered occurrence. The keyboard-select branch now captures the stable occurrence ID, renders, finds the replacement focusable hitbox by its dataset ID, and restores focus without scrolling. No AST changes, mathematical rule changes, history events, or mount callback reorderings were introduced. The lookup deliberately avoids interpolating arbitrary node IDs into a CSS selector.

## Verification

- Node suite: 619/619 passed locally after change.
- New browser regression: `e2e/keyboard-selection-focus.spec.js` checks selection, focus after rerender, unchanged AST/history and repeated keyboard activation. Browser execution is pending; this is not a claim of a Playwright pass.
- Existing `equationPresentationMount` ordering remains unchanged; toolbar updates precede selection/distribution overlays and animation.

## Follow-up

Run `npx playwright test e2e/keyboard-selection-focus.spec.js` and the full Playwright suite. Review whether other direct rerender entry points should restore focus only when triggered by keyboard action; do not globally steal focus after mouse or programmatic rerenders. Keep focus ownership in the input handler, not in the DOM mount.
