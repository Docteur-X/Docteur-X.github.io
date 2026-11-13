# Equation presentation mount — dependency and simplification audit

Date: 2026-11-10. Baseline: 619 Node tests and user-reported Playwright pass.

## Actual call path

`renderEquation(animate)` in `js/app.js` calls `prepareEquationPresentationRerender()`, captures FLIP rectangles, invokes `renderExpression(...)` to construct a detached DOM tree, obtains current document/object IDs, and calls `mountEquationPresentation(...)` in `js/ui/equationPresentationMount.js`.

The mount synchronously invalidates old semantic addresses, replaces the DOM, refreshes semantic addresses, clears hover, mounts equality controls, updates grouping/factorisation toolbars, paints range selection and distribution arrows, and animates layout. On an exception after initial invalidation it invalidates semantic addresses again and preserves the original error.

## Dependency inventory

| Dependency | Reason | Assessment |
| --- | --- | --- |
| `equation`, `tree` | DOM publication | Necessary data, not a callback |
| `resolver.invalidate`, `semanticRefresh.refresh` | Target freshness | Essential safety boundary; preserve ordering |
| `documentId`, `objectId` | Scope of semantic index | Essential; nullable for empty objects |
| `clearHover` | Prevent stale hover feedback | Presentation effect; appropriate |
| `mountEquality` | Rebind relation controls to new DOM | Feature-specific integration; potential future boundary but not redundant |
| `updateGroupToolbar`, `updateFactorisationToolbar` | Recompute layout-affecting controls before overlay measurements | Distinct UI effects; cannot combine without studying their independent lifetimes |
| `paintSelection`, `paintDistribution` | Repaint overlays after DOM replacement | Distinct overlays; distribution depends on live preview state |
| `animateLayout`, `firstRects` | Finish FLIP animation | Necessary after overlays are mounted |

## Findings

1. The mount's nine side-effect collaborators are **not** evidence of nine unnecessary abstractions. They represent ordered integration with existing view-local systems.
2. Replacing them with a generic `effects` object, callback registry, or another adapter would mainly rename dependencies without reducing them.
3. Moving preview cancellation into the mount would violate the established difference between context dismissal and distribution's deliberate rerender.
4. Calling `semanticRefresh.refresh` before DOM publication would expose obsolete hitboxes. Painting overlays before toolbar updates could measure the wrong geometry.
5. The meaningful remaining coupling is the fact that `app.js` still coordinates AST rendering, preview policy, DOM publication and feature state. The mount itself is only 49 lines and has one production caller. Its size is not a problem.
6. Failure invalidation protects semantic input, but cannot roll back partially published DOM. Do not add a transactional DOM layer without a reproducible need.

## Decision

**Do not add a new port grouping or extract another tiny module in this increment.** Retain the existing mount contract. Prioritise a coherent redesign of the entire `renderEquation()` workflow only when its caller-side responsibilities can be moved or removed together and protected by browser tests. Preserve the current distribution, grouping, equality and FLIP behaviour.

## Evidence and verification

Inspected `js/app.js` around `prepareEquationPresentationRerender` and `renderEquation`, `js/ui/equationPresentationMount.js`, and `tests/equationPresentationMount.test.js`. The existing six mount tests cover ordering, empty objects, missing dependencies, and failure invalidation. No production code changed in this audit. Local Node tests were rerun; Playwright on this unchanged source was reported passing by the user. The archive's handover previously contained contradictory historical status lines; the new handover supersedes them.

## Next engineering slice

Characterise `renderEquation()` callers and identify the smallest **whole workflow** that can leave `app.js` without forwarding the same callbacks through another layer. Quantify lines removed, total production lines changed, and number of source files touched to implement one preview or renderer feature. Prefer deletion or merging when it improves change locality.
