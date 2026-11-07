# Touch-friendly multiple selection v1

## Interaction contract

On touchscreens, the first tap selects a mathematical operand. Tapping that same
operand again enters multiple-selection mode with the operand selected. Further
taps toggle operands. Removing the final operand exits the mode; tapping empty
space clears all selection. The **Select multiple** toolbar button provides an
explicit alternative, including for mouse and keyboard users. Ctrl/Cmd+click
continues to use the existing selection model.

Selection does not change the expression AST or create a mathematical history
entry. The same selection-model ancestry exclusions and mathematical rule
eligibility apply regardless of input device. The toolbar's `aria-pressed`
communicates the active mode. Highlighting does not alter equation geometry.

## Implementation

`js/app.js` translates touch pointer events into selection-controller operations.
A touch drag remains owned by the existing drag lifecycle; only an unmoved tap
selects. Multi-selection suppresses mathematical pickup on touch pointerdown.
The toolbar, pointer gestures and keyboard modifiers share
`js/interaction/selection.js` rather than maintaining separate ID sets.

## Verification and limitations

Run `node --test tests/*.test.js` and `npm run test:e2e`. The touch Playwright
cases require Chromium with `hasTouch: true`. Manual checks on actual Android
and iOS browsers remain valuable for pointer cancellation, browser scrolling,
small hitboxes and interaction with factorisation previews. The desktop
mouse double-click bracket shortcut remains unchanged. Touch double-tap is
reserved for selection rather than bracket toggling.
