# Playwright Interaction Coverage v3

**Status:** test code added; expanded browser suite awaiting its first Chromium run. The previous 3/3 smoke/identity suite was verified by the user. The Node unit baseline is 172/172.

## Coverage

- `rearrangement.spec.js`: pointer drag of an addend, transient non-authoritative reordering, one commit.
- `distribution.spec.js`: factor onto an addition operator, amber preview, explicit commit.
- `grouping.spec.js`: Ctrl/Cmd-select adjacent addends, blue envelope, bracket preview, commit.
- `factorisation.spec.js`: select matching factors, preview/cancel without history change, then confirm.
- Existing `identity.spec.js` and `smoke.spec.js` remain unchanged.

These scenarios intentionally exercise the real application UI rather than calling Engine functions directly. Each verifies the committed AST and history separately from transient presentation.

## Dependencies and repeatability

`@playwright/test` is pinned to **1.64.1** (no caret). `package-lock.json` records the same Playwright package versions. The lockfile was constructed in a restricted environment without npm registry access; a contributor must run `npm install --package-lock-only` on a networked machine and commit the resulting verified lockfile before relying on `npm ci` in CI. The GitHub Actions workflow uses `npm ci` to detect lockfile drift.

Commands:

```sh
npm install --package-lock-only
npm ci
npx playwright install chromium
npm test
npm run test:e2e
```

## Maintenance guidance

- Scope mathematical queries to the active Mathematical Window; do not hardcode generated node IDs.
- For pointer interactions, scroll both endpoints into view **before** mouse-down and capture viewport geometry once. Never scroll during the drag.
- Prefer accessible roles and semantic IDs; avoid screenshots of the entire page.
- Avoid arbitrary sleeps. Rearrangement is animated: await a settled preview, not a particular frame.
- Record console errors and Playwright traces when debugging failures. A failing new test is not automatically an application regression: first inspect whether the gesture targeted the intended region.
- Preserve mathematical rules and the stable drag geometry while improving test selectors.
- Browser testing should eventually include equation-root cases, object switching, persistence, keyboard accessibility, and a check that rearrangement does not replay its animation after drop.

## Source-control limitation

This ZIP contains the changed files but **is not a GitHub commit**. The repository is not connected to this execution environment. Review the changes, regenerate/verify the lockfile, and commit/push them in the actual GitHub repository.
