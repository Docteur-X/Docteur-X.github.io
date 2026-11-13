# Equation presentation mount — 616-test increment

## Purpose
The existing `renderEquation()` had an implicit ten-step protocol for replacing equation DOM, refreshing semantic addresses, binding relation controls, updating layout-affecting toolbars, painting overlays, and animating. The protocol now lives in `js/ui/equationPresentationMount.js` as `mountEquationPresentation()`.

## Architectural ownership
- `app.js` still decides preview lifetime via `prepareEquationPresentationRerender()`, renders the detached AST presentation via `renderExpression()`, and captures layout transition geometry.
- `mountEquationPresentation()` owns only the ordered, synchronous *presentation mount* sequence: invalidate resolver; replace children; refresh semantic index and its consumers; clear hover; mount equality controls; update grouping and factorisation toolbars; paint selection and distribution arrows; animate.
- `equationSemanticRefresh.js` remains the sole authority for refreshing resolver, inspector, and navigator in that order. This increment does **not** introduce another semantic index or preview state store.
- Distribution remains a special rerender-preserving preview, as characterised by Playwright. Do not replace presentation-only cleanup with unconditional context dismissal.

## Verification
- 616/616 Node tests passed via `node scripts/run-node-tests.mjs` on 2026-11-10.
- Three new tests verify ordering, empty-object support, and dependency validation before DOM replacement.
- Browser/Playwright verification is **pending** for this increment; the 613-test arrow-extraction version was user-verified.

## Next work
Run the full Playwright suite on Windows. Inspect whether repeated dependency callbacks in `app.js` should become a cohesive presentation port only if that reduces complexity; avoid creating abstractions solely to reduce line count. Audit semantic hitbox refresh on empty objects, preview rerender and distribution arrow repaint after layout changes. Keep the architectural handover and status aligned with actual verified results.
