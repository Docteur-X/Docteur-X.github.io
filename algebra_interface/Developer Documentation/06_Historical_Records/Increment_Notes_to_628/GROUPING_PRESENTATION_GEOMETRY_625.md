# Grouping presentation geometry — browser regression (625 Node tests)

## Scope

Added `e2e/grouping-presentation-geometry.spec.js` to characterise the presentation boundary during multi-selection, grouping preview, and Escape cancellation. No production modules or mathematical rules changed.

## Source-verified ownership

- `js/app.js` `renderEquation()` mounts the detached expression and then calls `mountEquationPresentation()`.
- `js/ui/equationPresentationMount.js` refreshes semantic targets and toolbars before painting selection and distribution overlays.
- `js/interaction/groupingPreview.js` creates its own document-level `.grouping-overlay`, measures selected hitboxes, and positions `.grouping-envelope` rectangles without inserting new AST nodes.

## New browser assertions

For `a+b+c`, Ctrl/Cmd-select the first two operands, measure their viewport rectangles, and assert the visible envelope encloses both. Open the grouping preview and repeat the geometry checks. Escape must cancel without changing the MathJSON representation or history count. This guards against future reordering of layout-affecting updates and overlay measurement.

## Evidence and limitations

`node scripts/run-node-tests.mjs`: 625/625 passed locally. Browser regression **not executed locally**; the user reports that the preceding browser suite passed. Run `npx playwright test e2e/grouping-presentation-geometry.spec.js` and then the full browser suite. Do not infer successful browser geometry from Node tests.

## Next decision

Only simplify the callback pipeline if browser evidence reveals a duplicated responsibility or observable ordering issue. Avoid moving overlay geometry into AST rendering or changing preview-host ownership.
