# Ordinary drag selection exit — 528-test increment

Status: implemented in production source; Node verified; awaiting user Playwright verification.

## What changed

`js/interaction/ordinaryDragSelectionExit.js` owns the final *effect sequence* for a drag that has not moved: touch selection, ordinary selection, or double-click group toggling. `js/app.js` remains the state owner and injects the existing effects. No AST, mathematical rules, preview, history or drag geometry was changed.

The function receives a current drag occurrence, previous click metadata and a caller-supplied timestamp. It validates all effect callbacks before performing any effects. For touch, it clears the drag and delegates to the existing touch-selection policy. For mouse/pen, it records click metadata, clears multi-selection and grouping overlay, clears the drag, and either toggles brackets on double-click or renders and reports selection.

## Architectural reasoning

This extraction makes ordering explicit and testable while retaining the existing application's authoritative state. The function is intentionally a thin application-facing effect adapter, not a new state store or gesture recogniser. A subsequent pass should group the many injected callbacks into cohesive application ports rather than proliferating individual callback arguments.

## Verification

- 4 new Node tests: ordinary selection, double-click, touch selection, and invalid dependencies.
- Updated `touch-selection-wiring.test.js` to verify touch completion behaviour instead of requiring an implementation-specific `app.js` source substring.
- 528/528 Node tests passed. Playwright still required for this increment.

## Browser checks

Click an operand once and verify selection/status; double-click the same operand and verify bracket toggling; tap an operand in touch emulation; drag and release to ensure no selection is accidentally triggered; cancel a drag and verify history and AST remain unchanged.
