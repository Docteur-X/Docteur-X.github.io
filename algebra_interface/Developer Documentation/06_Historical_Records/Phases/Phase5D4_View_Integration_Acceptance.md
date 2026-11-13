# Phase 5D-4 — View integration hardening and acceptance

**Status:** 416/416 Node tests passed independently; browser verification pending. **Baseline:** Phase 5D-3, 413 Node tests and 77 browser tests (owner-confirmed).

## Scope and decision

Phase 5D-4 is an integration and architecture acceptance gate, not a fourth production extraction. The two useful view-local seams already exist: `equationLayoutTransition.js` owns FLIP geometry, and `equationSemanticRefresh.js` owns post-mount semantic-consumer refresh. `app.js` continues to decide when the mathematical source changes, cancel incompatible previews, mount the equation DOM, and repaint feature-specific overlays. Do not extract the central `renderEquation()` sequence wholesale.

## Source-grounded transition contract

1. **Source change:** the application invalidates incompatible gesture sessions and feature-owned mathematical proposals. Distribution's display-only rerender is an intentional exception: it may preserve a preview for the same AST, but rebuilding must cancel it.
2. **DOM transition:** layout capture precedes `replaceChildren`; the renderer mounts the detached expression tree. Empty Mathematical Objects clear the equation DOM directly.
3. **Semantic transition:** after mounting or clearing, stamp document/object identity, refresh the semantic target resolver, then refresh inspector and structure navigator. Fail-fast is intentional: consumers must not refresh against an outdated resolver index.
4. **Presentation transition:** equality controls are rebound, toolbars updated before measuring selection overlays, distribution curves reconstructed, then surviving occurrence geometry animated. Feature controllers retain educational presentation ownership.
5. **History and switching:** restoring history or switching documents/objects invalidates stale proposals before rendering. Single-use commit and history publication remain outside the renderer.

## Verification evidence

- Phase 5D-1: four Node tests for stable occurrence identity, reduced motion, and layout geometry.
- Phase 5D-2: three browser characterization tests for populated/empty object switching, distribution preview preservation/invalidation and history navigation. A second-drag eligibility assertion was retained following repeated failures in the earlier test; the owner reports 77/77 passing in the diagnostic baseline. One passing run does not prove the earlier pointer timing issue cannot recur.
- Phase 5D-3: four Node tests for semantic refresh order, empty identity, embedded views and malformed composition. The owner reports 77/77 browser tests passed.
- Phase 5D-4: three new Node tests cover independent semantic view instances, fail-fast resolver errors, and independent layout roots even with identical occurrence IDs. They are contract tests, not evidence that multiple live views exist.

## Residual risks and Phase 5E handoff

- FLIP callbacks are not generation-invalidated. They generally operate on detached elements after rerender; element reuse would warrant a dedicated cancellation contract and browser stress test. Do not add speculative machinery now.
- Semantic refresh is sequential and fail-fast. A render/refresh exception can leave presentation partly updated; no general view-recovery policy is implemented. Do not claim full rollback.
- Source invalidation and feature-specific overlay cleanup remain in `app.js` by design. Their ordering is intentional and must be preserved during composition simplification.
- Phase 6 must supply independent view roots, identity providers, resolver/inspector/navigator instances, and modal ownership for multiple live views.
- Browser suite must be rerun on the delivered 5D-4 package before marking this increment accepted.

## Acceptance criteria

No mathematical rule, AST identity, history publication, modal lease or gesture arbitration changes; dependency checks pass; Node suite passes; owner verifies the complete browser suite; living handover records exact status.
