# Keyboard presentation geometry — browser regression

Date: 2026-11-11. Baseline: presentation callback audit (625 Node tests).

## Scope

Added a Playwright regression in `e2e/keyboard-selection-focus.spec.js` for repeated Space-key selection of the same occurrence. It checks stable node identity, focus after each DOM replacement, selected appearance, occurrence bounding-box position and dimensions, unchanged AST and unchanged history. The earlier Enter regression remains in place.

No production code or mathematical semantics changed. This is an intentionally narrow browser guardrail, **not** evidence that all toolbar and overlay positioning is covered. Geometry tolerance is one decimal place in Playwright `toBeCloseTo` (approximately 0.05 CSS pixels); browser font/layout differences could make the check too strict and should be assessed against real Chromium results rather than weakening it blindly.

## Verification and follow-up

Node tests: 625/625 locally. Browser: user reports the previous 625 release passed; the new Space/geometry regression has not yet been run. Run `npx playwright test e2e/keyboard-selection-focus.spec.js` followed by the full browser suite. If geometry changes legitimately on selection, inspect the before/after DOM and revise the assertion to measure the correct invariant.

Next: inspect group/factorisation toolbar positioning and distribution overlays during rerenders with browser evidence. Do not move their callbacks solely to reduce wiring.
