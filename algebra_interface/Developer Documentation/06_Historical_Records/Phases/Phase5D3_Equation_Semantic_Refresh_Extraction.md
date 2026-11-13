# Phase 5D-3 — Equation semantic refresh extraction

**Status (8 November 2026):** implemented, 413/413 Node tests passed; browser verification pending (77 Playwright tests expected). The Phase 5D-2 second-drag diagnostic build was the owner-reported 77/77 browser baseline.

## Extraction decision

The source review found a small, genuine duplication: both the normal `renderEquation()` DOM replacement and the empty-Mathematical-Object path stamped view identity and refreshed the semantic target resolver, renderer inspector, and structure navigator. This is one coherent post-mount responsibility, distinct from the feature-specific cancellation and overlay reconstruction that must remain in `app.js`.

## New module and contract

`js/ui/equationSemanticRefresh.js` exports `createEquationSemanticRefresh({view, resolver, inspector, navigator})`. Its `refresh({documentId, objectId})` method stamps the containing mathematical window, then refreshes **resolver → inspector → navigator** in that order. It accepts an empty object identity, clearing the old object stamp, and can operate without a surrounding window wrapper.

**Required precondition:** the equation DOM has already been replaced or cleared. The helper does not mount DOM, inspect ASTs, cancel previews, validate mathematical transformations, paint overlays, own modal leases, or publish history. The caller retains the timing and source-invalidation decisions.

## Wiring and sequencing

- Populated equation: feature-specific cancellation → capture layout → render detached tree → `replaceChildren` → semantic refresh → equality binding → toolbar and overlay refresh → layout animation.
- Empty Mathematical Object: cancel prior interactions → `replaceChildren()` → semantic refresh with empty object identity → clear dependent panels and history presentation.

No changes to mathematical eligibility, stable node IDs, preview ownership, history, or persistence.

## Tests and acceptance

Four Node tests cover refresh ordering and identity stamping, empty-object invalidation, an embedded view without a window wrapper, and malformed composition. Full Node suite: **413/413 passed**. JavaScript syntax checks passed. **Browser tests pending:** run all 77, especially the Phase 5D-2 empty-object, distribution rerender, and history-navigation tests.

## Limits and future work

This is deliberately a *small adapter*, not a generic view controller. The semantic consumers are still separate feature modules; `app.js` still owns the rerender decision and cancellation order. Do not extract the central rerender pipeline without a separate evidence-based audit. The prior second-distribution-drag test showed timing sensitivity; retain its target-eligibility diagnostic assertion.
