# Equation presentation callback audit — 625 tests

Date: 2026-11-11. Baseline: Keyboard Selection Focus Update (619 Node tests).

## Source-verified boundary

`js/app.js` owns preview-lifetime decisions and prepares the detached equation tree. `js/ui/equationPresentationMount.js` is the synchronous publication boundary: invalidate semantic targets; replace children; rebuild semantic targets; clear hover; mount equality controls; update group and factorisation toolbars; paint selection and distribution; complete layout animation. The toolbar-before-overlay ordering matters because overlays may depend on measured geometry. `null` trees publish zero DOM children.

The mount validates collaborators before publication. If replacement, refresh or any downstream callback throws, it attempts another semantic invalidation and rethrows the original error; subsequent callbacks do not run. A failed defensive invalidation cannot mask the original exception.

## This increment

Six parameterised Node tests in `tests/equationPresentationMount.test.js` exercise exceptions from hover cleanup, equality controls, group toolbar, factorisation toolbar, selection painting and layout animation. Each asserts exact callback prefix, a final invalidation and original error identity. No production changes, callback reordering, new abstraction or mathematical changes.

## Verification

`node scripts/run-node-tests.mjs`: **625 passed, 0 failed** in the local container on 2026-11-11. Documentation links: run checker before packaging. Playwright was **not** run in this environment; user previously reported the 619-test browser baseline passed. Do not interpret Node coverage as browser geometry or focus verification.

## Next step

Run `npx playwright test` on a machine with Playwright/Chromium, focusing on toolbar geometry, overlays and keyboard focus during rerenders. Only simplify further when browser evidence demonstrates redundant work or a concrete coupling problem. Preserve stable AST identities, student-controlled transformations, preview isolation and offline operation.
