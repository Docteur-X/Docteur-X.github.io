# renderEquation preview-lifecycle audit (2026-11-10)

## Verification baseline

- User reports full Playwright suite passing for `Manipulator_Escape_Handler_Consolidation_610.zip`.
- This increment adds one **unexecuted browser** regression to `e2e/preview-dismissal.spec.js`.
- Node suite: 610/610 passed in this environment; documentation links: 410/410.
- No production JavaScript changed in this increment.

## Actual source behaviour

`app.js` `renderEquation()` explicitly cancels negation, equality, identity, grouping and factorisation previews before replacing the equation DOM. It cancels the non-modal clipboard drag as well. It does **not** automatically cancel distribution; the distribution preview presentation port calls `renderEquation(false)` to paint or clear the candidate, so blanket dismissal inside the renderer would break distribution itself.

This is not simply six redundant cleanup calls. There are two distinct lifecycles:

1. A *context change* must safely release all relevant preview ownership before replacing the authoritative mathematical source. `dismissPreviewsForContextChange()` is the common entry point.
2. A *presentation rerender* must prevent stale confirmation hitboxes from remaining live, but distribution's own presentation refresh must be allowed to render its pending candidate.

Do **not** replace the current `renderEquation()` guards with an unconditional call to `dismissPreviewsForContextChange()` without first separating distribution's internal preview paint from unrelated rerenders. That would change student-visible behaviour and risks reentrancy.

## Added characterization

The new Playwright test checks that changing multiplication display while a negation preview is open dismisses its DOM and releases the lease without changing the AST/history, and that the operator can reopen afterward. This test still requires execution on Windows. The display setting is presentation-only; a cancelled preview must not commit.

## Next design decision

Decide whether a presentation-only display change should preserve or dismiss each modal preview. Current negation behaviour is dismissal; distribution has special rendering semantics. Before changing this policy, capture browser tests for distribution and grouping, then define one explicit rerender policy (reason + active preview family) rather than sprinkling feature-specific conditions through the renderer. Preserve stable AST node IDs, modal exclusivity and atomic history semantics.
