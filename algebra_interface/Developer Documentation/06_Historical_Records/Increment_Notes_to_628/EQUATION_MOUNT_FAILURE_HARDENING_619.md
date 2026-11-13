# Equation mount failure hardening — 619-test increment

## Why this change exists

The equation presentation mount invalidates the old semantic index, replaces the DOM, refreshes semantic addresses, then repaints visual consumers in a defined order. Previously, an exception from DOM replacement, indexing, or a later overlay could leave a partially mounted view with an apparently valid semantic index. This is unsafe for pointer and keyboard targeting.

## Implemented

`js/ui/equationPresentationMount.js` now catches failures after initial invalidation, defensively invalidates the resolver again, and rethrows the original error. The mount does not attempt to roll back DOM replacement or retry rendering; the next successful render must rebuild the index. Defensive invalidation errors do not conceal the initiating exception.

Three regression tests in `tests/equationPresentationMount.test.js` exercise failed semantic refresh, failed overlay painting, and failure during defensive invalidation. The existing ordering, empty-object, and dependency-validation tests remain in place.

## Verification

- Node tests: **619/619 passed** in this development environment.
- Documentation links: **412/412 valid** before adding this document.
- Browser tests: **not run here**; user should run `npx playwright test` on Windows.

## Limits and future work

This is fail-closed semantic addressing, not a transactional DOM rollback. If a visual callback throws, the view may be partially rendered until the next successful render. Consider a higher-level error boundary and recovery UI only if actual failures justify it. Do not introduce a second semantic index or preview state store.

The Renderer remains responsible for AST-to-HTML output; the mount handles DOM publication and view-local consumers; the application controls preview lifetime. Preserve this separation and stable AST node IDs.
