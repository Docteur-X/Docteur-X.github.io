# Complete `renderEquation()` workflow — source review

Date: 2026-11-10. This is a source-backed review, **not a production refactor**.

## Verified call chain

`renderEquation(animate)` in `js/app.js` (around line 1416) calls `prepareEquationPresentationRerender`, captures old FLIP geometry, invokes `renderExpression` with current root, substitutions, selection, display override and distribution preview, retrieves active document/object IDs, and calls `mountEquationPresentation`. The mount owns invalidation, replacement, semantic refresh, hover reset, equality controls, toolbars, overlays and animation in that order.

Callers include display-mode changes, keyboard selection, preview lifecycle callbacks and `renderApplication`; the latter additionally refreshes variables, history, MathJSON and equality truth. `loadActiveObject` has a separate empty-root path that invalidates and clears the equation, refreshes semantic targets, clears ancillary panels and updates history. This path is an important workflow fork, not proof that the mount should be bypassed.

## Source-vs-handover checks

- The nine mount side-effect collaborators are present and ordered as described. Six direct Node tests cover ordering, nullable IDs, dependency validation and failure invalidation.
- Distribution is intentionally **not** cancelled in `prepareEquationPresentationRerender`: its preview lifecycle rerenders the equation. Other DOM-bound preview families are cancelled there.
- `renderApplication` independently cancels equality before `renderEquation` would do so; this may be redundant but changing cancellation order requires browser evidence.
- The empty-root path bypasses `renderEquation` and the mount, yet manually reproduces the critical semantic invalidation/reindex boundary. Consolidation must account for differing equality controls, selection and auxiliary panel semantics.
- The mount catches post-invalidation failures and invalidates the resolver again; it does not roll back partial DOM publication.

## Decision and next increment

Do **not** extract a callback-forwarding controller or change preview cancellation ordering on Node-only evidence. A useful simplification target is a single semantic DOM publication protocol for both populated and empty mathematical objects, with explicit ownership of empty-state controls. First write browser regressions for object switch to empty, back to populated, distribution preview rerender, equality preview dismissal and FLIP transitions. Then implement the smallest behaviour-preserving consolidation, measure actual removed duplication and changed files, and rerun Node and Playwright.

## Verification

Locally reran `node scripts/run-node-tests.mjs`: 619/619 passed. `node scripts/check-documentation-links.mjs`: 413 links passed before this note. No Chromium/Playwright browser run was performed in this review. No production code was modified.
