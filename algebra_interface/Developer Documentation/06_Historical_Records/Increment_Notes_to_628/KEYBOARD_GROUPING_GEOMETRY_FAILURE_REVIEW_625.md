# Keyboard and grouping geometry failure review (625)

## Evidence and scope

The user supplied a Playwright failure bundle containing keyboard-selection and grouping-presentation failures. The keyboard failure compares viewport `y` positions before and after a focus operation; the grouping test compares viewport positions before and after clicking a fixed overlay button. Both measurements can include scrolling unrelated to equation-local geometry. The failure bundle alone does not establish that scrolling is the sole cause.

## Test corrections

- `e2e/keyboard-selection-focus.spec.js`: take the baseline after the initial focus, avoiding attributing its scroll to the subsequent Space keypress. Continue asserting focus, selected class, all four geometry dimensions, unchanged AST and unchanged history.
- `e2e/grouping-presentation-geometry.spec.js`: compare selected operand geometry relative to a shared equation ancestor, independent of viewport scrolling; separately assert overlay containment against the current viewport rectangles. Continue checking modal preview, cancellation, unchanged AST and history.

No production code, mathematics, preview ownership, or stable node IDs were changed. This is a correction to browser test measurement semantics, **not** a confirmed production bug fix.

## Verification and next action

Local Node suite: 625/625 passed. Documentation link checker passed. Browser tests were not run in this environment. Run the two targeted Playwright specs and the complete browser suite. If either still fails, collect trace and scroll/container geometry to distinguish genuine reflow from scrolling before changing production code.
