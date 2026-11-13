# Presentation Consolidation Phase 1 — Feedback Ownership

**Implemented:** 2026-11-07. **Verification:** Node 297/297; browser suite on this modified build pending. The user confirmed that the *Phase 0* browser suite passed.

## Ownership and lifecycle

`createVisualFeedbackController(root)` returns an independent, disposable handle. A WeakMap keyed by the mathematical **view root element** coordinates all handles created for that root. Each handle owns its own owner-name namespace, so independently named or identically named channels cannot clear one another. The registry recomputes the union of requested CSS classes on every update; removing a handle or owner removes a class only when no remaining channel requests it. Requests are validated before mutation. `clearAll` clears only that handle's owners; `dispose` releases the handle and its decorations. No global document-level registry exists.

Hints are reconciled with the same channel order: the last registered active eligible hint is displayed, and removing that owner restores the remaining hint or the original `data-math-feedback-hint`. On a rerender, detached elements are cleaned during the next reconciliation; application rerender still owns resetting its own transient interaction state. The controller never changes the AST, mathematical markup or layout geometry.

## Precedence and compatibility

Roles coexist rather than suppressing one another. The stylesheet continues to own their visual precedence. `structure-navigation` maps to the pre-existing `is-structure-navigated` class and retains its prominent dashed outline even when eligibility or selection is also present. This preserves existing accessibility and theme behavior pending computed-style browser verification. CSS tokens and `!important` have not been changed without that verification; an unsafe cosmetic rewrite is not a Phase 1 requirement.

`structureNavigator.js` still performs its existing AST navigation and DOM target lookup. Only highlight ownership migrated. Target resolution is explicitly deferred to Phase 2. Hover and negation preview adapters continue to create independent handles, which now coordinate automatically because they use the same view root.

## Regression gate and handover

`tests/presentation-phase1-feedback.test.js` covers cross-handle same-role overlap, same-named owner isolation, role replacement with navigator focus, hint restoration, atomic invalid updates, detached-node cleanup and view isolation. All 297 Node tests passed. Browser tests **must be rerun on this build**, including light/dark themes, visible/hover hitbox modes, navigation keyboard and focus behavior, negation green/amber and cancellation, and checks for layout shifts. Do not claim the Phase 1 exit gate complete until these pass.

Future maintenance: preserve stable AST node identities for incremental expression edits; avoid rebuilding the mathematical tree merely to update feedback. Continue to document all ownership and view-lifetime changes.
