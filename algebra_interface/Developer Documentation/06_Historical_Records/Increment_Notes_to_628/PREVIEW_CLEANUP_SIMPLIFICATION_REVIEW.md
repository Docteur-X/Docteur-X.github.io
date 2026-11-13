# Preview cleanup simplification review — 2026-11-10

## Verified baseline and scope

Input: `Manipulator_Preview_Context_Callsite_Cleanup_610.zip`, reported by the user to pass Playwright. This increment ran 610/610 Node tests locally; browser tests on this increment remain pending.

## Source-grounded observations

- `app.js` has one `previewDismissals` inventory and `dismissPreviewsForContextChange()` for deliberate context changes.
- `loadActiveObject()` called `cancelFactorisationPreview(false)` both before rebinding the mathematical object and again after rebinding. The second call was redundant and has been removed. The early call is intentionally retained because factorisation may restore DOM associated with the old tree.
- `renderEquation()` still owns several feature-specific preview cancellations; unlike deliberate context changes, it is invoked from many rendering paths and cannot safely be replaced with a rejecting context-dismissal operation without tracing all callers.
- The global Escape handler and document pointerdown handlers still implement feature-specific dismissal priorities and click-away suppression. These may encode educational interaction behaviour and must not be mechanically deduplicated.
- `cancelFactorDrag()` and `ordinaryDragController` handle non-modal gestures, not Preview Host sessions. Do not collapse these into modal cancellation.

## Migration policy

1. Preserve current browser-verified behaviour and stable AST identities.
2. Consolidate only when ownership and ordering are demonstrably equivalent.
3. Before modifying `renderEquation()` or global Escape handling, inventory callers, record precedence, and add Playwright tests for each preview family and click-away/keyboard path.
4. Avoid adding another state registry or new wrapper modules merely to reduce line count.
5. Delete superseded historical documentation only after its still-relevant invariants have been transferred into authoritative references.

## Change in this increment

Removed one duplicate factorisation-cancellation call from `loadActiveObject()`. No mathematical rules, history schema, or Preview Host contracts changed.

## Verification

- `node --check js/app.js`: passed.
- `node scripts/run-node-tests.mjs`: 610 passed, 0 failed.
- Playwright: user verification required for this exact archive.
