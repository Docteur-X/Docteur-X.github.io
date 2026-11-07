# Browser testing v1 — Playwright

**Status:** Test infrastructure and three browser scenarios added; browser execution **not yet verified** in the authoring environment. Existing Node suite: 172/172 passing at this release. Browser failures must be resolved before marking E2E as green.

## Purpose and boundaries

The Node suite checks mathematical rules and contracts. Playwright runs the actual page and simulates pointer interactions, catching runtime failures in the DOM wiring, hover feedback, preview and history pipeline. This directly targets the missing-import regression in Application Controller Consolidation v1. Tests do not alter the Mathematical Engine or student-facing runtime.

## Run locally

Install Node.js (including npm). From the project root:

```sh
npm install
npx playwright install chromium
npm test
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
```

Playwright starts `scripts/e2e-server.js` on `http://127.0.0.1:8000` automatically; no Python server is required. Stop an existing server on port 8000 if it serves another directory. Browser tests use isolated contexts; they should not rely on prior IndexedDB content. Playwright and Chromium are development-only dependencies and are not shipped to students through GitHub Pages.

## Current tests

- `e2e/smoke.spec.js`: load ES modules, create a document, build `a+b+c`, check DOM and runtime errors.
- `e2e/identity.spec.js`: drag +0 to an operand, verify ghost, amber hover, stationary layout, unchanged AST before confirmation, then commit exactly one history state.
- `e2e/identity.spec.js`: drag ×1, cancel preview and verify unchanged mathematical state and history.

These use actual application DOM IDs, not invented generated node IDs. `e2e/helpers.js` centralises pointer trajectories and workspace setup. The `playwright.config.js` configuration captures screenshots, videos and traces on failure. GitHub Actions runs both test suites and uploads failure evidence.

## Next coverage priorities

1. Distribution and factorisation: full gesture, hover, preview, confirmation and cancellation.
2. Range grouping: Ctrl/Cmd multi-selection, blue envelope, bracket preview and confirmation.
3. Rearrangement: transient destination, no second animation, correct AST and history.
4. Equation-root edge cases; object switching during previews; IndexedDB reload and import/export.
5. Cross-browser testing after Chromium tests are stable.

## Contributor rules

- Verify both the semantic result and the transient visual behaviour. Do not rely on screenshots alone.
- Prefer stable control selectors and mathematical structure assertions; never hardcode generated AST IDs.
- Keep pointer geometry and animation tests focused and deterministic; avoid arbitrary sleeps.
- Update this guide and the test coverage whenever a new Transformation Feature is introduced.
- Treat a browser test failure as a release blocker, and distinguish tests that have been written from tests that have been executed successfully.

> **Update:** [Playwright Architecture v2](PLAYWRIGHT_ARCHITECTURE_V2.md) supersedes
> the v1 gesture helper and test organisation. The browser suite still requires
> a real local or CI Chromium run before being marked passing.

### Interaction coverage v3 test corrections (2026-11-05)

- Grouping's confirmation button and the confirmable blue envelope both have button semantics. Use an **exact** accessible name for the explicit confirmation button; a partial match is ambiguous under Playwright strict mode.
- A rearrangement overlay can be visible while its FLIP transition is still running. The Manipulator deliberately refuses a drop until the proposed order is settled. Browser tests must wait for the overlay's descendant animations to finish and release over the visible moving operand, rather than releasing immediately when the overlay first appears. This is a testing contract, not a request to change the Manipulator's animation or mathematical logic.
- These corrections only affect `e2e/grouping.spec.js` and `e2e/rearrangement.spec.js`. The browser scenarios still require confirmation on a machine with Playwright Chromium installed.
