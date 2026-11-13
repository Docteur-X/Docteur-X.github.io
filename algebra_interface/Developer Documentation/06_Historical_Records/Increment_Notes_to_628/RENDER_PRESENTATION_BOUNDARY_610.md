# Equation presentation rerender boundary — 2026-11-10

## Verified implementation

`js/app.js` now separates `prepareEquationPresentationRerender()` from `renderEquation()`. The former coordinates cancellation of transient DOM-bound previews (negation, equality, identity, grouping, factorisation) and clipboard dragging. The latter performs AST-to-DOM rendering, semantic index invalidation/refresh, layout transition and visual overlays.

Distribution is **deliberately preserved** by this rerender boundary: its Preview Host calls `renderEquation(false)` while showing and clearing its amber candidate. Calling the context-change dismissal routine during a rerender would destroy that candidate. Mathematical context changes continue to use `dismissPreviewsForContextChange()` and may refuse navigation if modal ownership cannot be released.

This is a narrow refactor of orchestration, not a claim that `renderEquation()` is pure or that all rendering concerns have been separated. The feature-specific presentation adapters and rendering overlays still require further audit.

## Verification

- Node test runner: 610/610 passing in the current container.
- `node --check js/app.js`: passing.
- Browser regression: **pending** on the user's Windows Playwright installation. Run `npx playwright test` and pay attention to distribution, grouping and negation display-only rerenders.

## Next step

After browser verification, trace the renderer's remaining visual-overlay responsibilities, and remove only demonstrably redundant lifecycle coordination. Avoid introducing a second modal-state owner or changing AST identities.
