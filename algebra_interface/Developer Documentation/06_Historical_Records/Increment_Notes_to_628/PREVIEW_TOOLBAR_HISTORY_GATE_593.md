# Preview interaction gate: clipboard, history, and equality symmetry

## Scope and rationale

This increment extends the existing view-local mathematical interaction gate to three entry points that can otherwise conflict with a deliberate preview:

- **Copy mathematics**: a toolbar capture is a new mathematical selection-dependent action. It is ignored while a preview owns the view.
- **History node selection**: history restoration is ignored while a preview owns the view, preventing the committed mathematical source from changing underneath a pending candidate.
- **Swap equality sides**: an immediate symmetry transformation is ignored while a preview owns the view.

All three checks consult `mathematicalInteractionGate.isBlocked()` and therefore use the same modal ownership registry as the six shared Preview Host families. No additional state, controller, or mathematical rule has been introduced. The existing handlers and their normal behaviour remain intact when no modal preview is active.

## Deliberate exclusions

Workspace/object switching and document replacement require separate review: they may intentionally **invalidate** the active preview as part of navigation. Blocking them unconditionally would change user workflow. Preview confirmation and cancellation must remain available while the gate is blocked. History panel opening/closing remains available; only choosing a history revision is blocked.

## Verification

Local Node suite: 593/593 passed. `node --check js/app.js` passed. Documentation links: 409/409 valid. Browser tests must be run by the user; this increment has not been browser-verified in the development environment.

## Browser acceptance checks

1. Open a grouping or equality preview, then try the symmetry toolbar button on an equality: no mathematical commit should occur.
2. While a preview is open, click a history node: the mathematical source and candidate should remain unchanged.
3. While a preview is open, click Copy Math: the clipboard should not gain an entry.
4. Confirm or cancel the preview, then verify all three actions work normally again.
5. Verify workspace/object navigation and all preview confirmation/cancellation paths still behave as before.

## Next audit

Inspect expression replacement, variable substitution, workspace/object switching and history keyboard shortcuts. Distinguish **forbidden concurrent mathematical manipulation** from **intentional preview invalidation**; do not indiscriminately block navigation. Prefer behavioural browser tests for these entry points.
