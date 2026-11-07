# Architectural Consolidation v1.1 — Browser rendering repair

## Symptom and diagnosis

The v1 consolidation passed 223 Node tests but 23 of 26 Playwright tests failed after submitting an expression. The browser displayed an updated status, symbol table, and history, but the mathematical view contained no `[data-node-id]` elements. The Playwright trace did not show an application JavaScript exception.

## Root cause

`renderEquation()` in `js/app.js` created a detached DOM subtree with `renderExpression(...)` but did not mount the returned `newTreeElement` into `dom.equation`. Subsequent hitbox geometry, relation control binding, and overlays therefore operated on an empty view.

## Correction

Immediately after `renderExpression(...)`, call `dom.equation.replaceChildren(newTreeElement)` before clearing hover and mounting controls. This restores the essential rendering pipeline: authoritative AST -> detached mathematical DOM -> mounted view -> interactive bindings -> visual overlays. It does not change mathematical rules, histories, serialization, or controller responsibilities.

## Verification and limitations

`node --check js/app.js` succeeded. The sandbox has `node` but no `npm` command, so the complete Node and Playwright suites have NOT been rerun in this environment. On a developer machine run `npm test` and `npm run test:e2e`; the expected baseline is 223 Node and 26 browser tests. The existing `e2e/smoke.spec.js` already asserts that building an expression yields visible `[data-node-id]` nodes, and is the primary regression guard.

## Handover principle

When extracting presentation controllers, the application render function must still mount the renderer's output. Controller `mountOnRenderedEquation()` calls only bind controls to existing DOM; they cannot replace the missing mount operation. Future multi-window views should mount each view's detached render into its own explicit host before applying gestures or overlays.
