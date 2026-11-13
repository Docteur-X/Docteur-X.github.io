# Empty-object equation publication consolidation — 2026-11-10

## Change and rationale

`loadActiveObject()` previously bypassed `renderEquation()` for an empty root, manually invalidating the semantic resolver, clearing equation children, refreshing navigation and clearing panels. This duplicated the populated-object DOM publication boundary and risked divergence. It now always calls `renderApplication(false)` after loading working state. `renderEquation()` renders an AST only when the root exists, passing `null` otherwise. `mountEquationPresentation()` translates a null tree to **zero** DOM children (never `replaceChildren(null)`, which would create a literal `null` text node). The mount's invalidation, semantic refresh and consumer ordering is unchanged.

`renderApplication()` preserves the preexisting empty-object variable-list and MathJSON blankness while still updating history and equality controls. This change does not modify mathematics, history snapshots, preview policies or AST IDs.

## Verification and limits

`node scripts/run-node-tests.mjs`: **619/619 pass**. `node scripts/check-documentation-links.mjs`: **414/414 links pass** before adding this note. The existing mount test now asserts an empty replacement argument list. Existing `e2e/phase5d2-rerender-transitions.spec.js` exercises populated → empty → populated object navigation and semantic navigator invalidation, but **Playwright was not executed here** (project dependencies are not installed in this workspace). Browser verification is required before declaring behaviour fully verified.

## Next work

Run Playwright, especially `phase5d2-rerender-transitions.spec.js`, preview dismissal and equality controls. Inspect empty-root toolbar/overlay callbacks in the browser. Only then consider eliminating the separate equality cancellation in `renderApplication()`; its ordering may matter. Do not introduce a callback-forwarding controller.
