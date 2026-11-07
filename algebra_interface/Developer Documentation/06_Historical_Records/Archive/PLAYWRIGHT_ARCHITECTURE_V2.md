# Playwright Architecture v2 — stable browser testing

**Status (2026-11-05): implemented test architecture; initial identity suite browser-verified (3/3); expanded v3 suite pending execution.**
The unchanged mathematical unit suite passed 172/172 in the packaging environment. The initial three tests passed in Chromium on the user's Windows machine. The v3 interaction suite has not yet been run in Chromium in this environment.

## Why v2 exists

The first identity E2E tests failed when raw mouse actions used off-viewport
coordinates. Browser tests must exercise real gestures without coupling to
where toolbars or Mathematical Windows happen to sit on the page.

## Ownership and contracts

- `e2e/pages/WorkspacePage.js`: create a document and locate its active window.
- `e2e/pages/MathematicalWindow.js`: scope AST hitboxes and observable history
  to one window. Future multiple-window tests should use object IDs to select
  windows; do not hardcode generated AST node IDs.
- `e2e/pages/IdentityToolbar.js`: the student-facing identity-tool lifecycle.
- `e2e/support/pointerGestures.js`: scroll both endpoints into a common viewport,
  measure fresh viewport bounding boxes, fail with useful diagnostics when they
  cannot both fit, and issue native pointer events. Never scroll during a drag.
- `e2e/*.spec.js`: describe mathematical and visual behaviour, not DOM wiring.
- `playwright.config.js`: larger deterministic Chromium viewport, isolated
  browser contexts, trace/video/screenshot on failure, HTTP server.

The Mathematical Window and toolbar now have semantic `data-testid` attributes.
The window also exposes the active `data-document-id` and `data-object-id`.
These identify *existing* objects, not new mathematical nodes. AST hitboxes
already expose `data-node-id`; test selectors should prefer role/name for
ordinary buttons and scoped semantic attributes for mathematical content.

## Required checks

1. `node --test tests/*.test.js`
2. `npm install` and `npx playwright install chromium` (once per machine)
3. `npm run test:e2e` (repeat in headed mode if any gesture fails)
4. Inspect failure traces, browser exceptions, status hints, and screenshots.
5. Before a release, manually check the five major gestures until E2E coverage
   includes their full pointer -> preview -> commit/cancel paths.

The identity test explicitly checks that the floating ghost appears immediately
on pointer-down, *before* moving to the target. This distinguishes a failed
pointer start from a failed drop. The AST must remain unchanged during hover
and preview, and history must advance exactly once on confirmation.

## Future tests

Add rearrangement (including settled transient order/no second animation),
distribution inside equality, grouping across equation roots, factorisation,
object switching, and IndexedDB persistence. Prefer semantic DOM assertions;
use small, stable visual snapshots only for pedagogically meaningful previews.

**Do not** make test-only shortcuts that bypass gestures. A mathematically
correct Engine can coexist with a broken Manipulator, as a previous refactor
showed. Keep browser tests as part of pull-request verification.
