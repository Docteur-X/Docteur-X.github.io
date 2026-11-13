# Grouping preview: layout-before-measure correction (2026-11-11)

## Evidence and cause

The user's repeated Playwright traces show a stable 34 px vertical discrepancy between the selected hitboxes and the fixed grouping envelope. Atomic browser-side measurements with polling did not resolve it. Source inspection identified the actual ordering defect in `js/app.js`, `groupingPreviewHost.presentation.show`: `groupingOverlay.enterPreview()` measured the hitboxes **before** `updateGroupToolbar()` revealed the Confirm/Cancel actions. Those actions occupy normal document flow above the equation and move the equation after the overlay has been measured. The fixed overlay consequently remains at the previous coordinates. Scroll/resize listeners cannot fix a layout change that emits neither event.

## Correction and ownership

Publish the preview toolbar state first, then ask the grouping presentation component to measure and render its overlay. This is a legitimate ordering contract between the application preview coordinator and the presentation layer, not an AST or rule change. Keep the atomic, retryable browser geometry assertion and the scroll/resize coverage. Do not move grouping geometry logic into `app.js`.

## Verification

625/625 Node tests passed; documentation links checked locally. Browser test **not executed here** (Playwright dependencies unavailable). Run `npx playwright test e2e/grouping-presentation-geometry.spec.js` followed by the full suite. The user's latest trace predates this correction.
