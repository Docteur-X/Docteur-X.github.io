# Preview interaction gate — 592-test increment

## Verified implementation

The view-local `createMathematicalInteractionGate` in `js/interaction/mathematicalInteractionGate.js` reads the existing `modalPreviewOwnership.active()` lease without caching or duplicating preview state. `app.js` checks the gate immediately before ordinary drag-drop arbitration, and before processing equation hitbox keyboard commands (except native distribution-preview confirmation controls). This prevents immediate transformations from slipping through when a different preview family owns the view.

The gate is intentionally not a mathematical rule validator, preview host, or commit lifecycle. It does not replace independent source freshness checks or commit-time validation. Preview-specific confirmation and cancellation must be routed before the generic keyboard gate.

## Evidence and limitations

592/592 Node tests passed locally; documentation links 406/406 valid; `node --check js/app.js` passed. Three new gate tests verify live ownership, invalidation/replacement, and construction failure. Browser tests are **not yet run for this increment**. The prior 585-test equality version is user-reported Playwright verified; the 589-test audit version has not been independently browser verified in this environment.

The gate currently covers ordinary drop completion and equation keyboard commands. Other entry points (toolbar, factor drag, clipboard/equality arming, outside equation keyboard shortcuts, and pointer selection) still need a complete inventory and targeted browser checks before claiming global lock enforcement. Modal preview confirmation controls must remain accessible.

## Next work

1. Verify Playwright on the 592-test archive, including Escape, confirmation, outside click, immediate drag, and keyboard commands while each preview family is active.
2. Audit remaining interaction entry points and consolidate their guards only when doing so preserves preview-specific controls.
3. Add explicit cross-feature tests for successful mathematical commit followed by presentation cleanup failure; report commit outcome without implying rollback.
4. Keep `ARCHITECTURE_CURRENT.md` and `HANDOVER_CURRENT.md` authoritative; retire obsolete migration notes after consolidating verified facts.
