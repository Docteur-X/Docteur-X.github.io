# Increment 3.1 — Integration Regression Hardening

## Scope

This increment adds regression coverage without modifying the mathematical engine, document serializer, import/export implementation, or IndexedDB repository. It is a test-only hardening pass on Increment 3.

## Fixtures

- `e2e/fixtures/legacy-v1.json`: deterministic historical **schema-v1-shaped** full-snapshot document, generated using the current history API. It tests the documented migration contract but is **not** an independently recovered historical user export.
- `e2e/fixtures/multi-object-branching.json`: compact document with two objects, a fork in the first object's history, a non-tip sibling, substitutions, stable IDs, and an active cursor. It is generated using the current implementation, not an independently obtained real-world artifact.

## New coverage

- Two Node tests check legacy migration without mathematical mutation and compact multi-object round-trip equality.
- Three Playwright tests exercise the real file controls: legacy import/export/reload; multi-object branching import/export/reload; and an IndexedDB transaction abort during import. The abort is injected after the `put()` request is created, verifying the repository waits for transaction completion and that a failed import does not enter the workspace.
- The tests use the real HTTP origin and isolated browser contexts; no test-only production hooks are added.

## Boundaries and remaining work

- A test of synthetic schema-v1 data is **not** evidence that every historical user export remains compatible. Collect real archived exports and add them as fixtures, after removing private information.
- Browser tests must be run with Playwright Chromium in the user's environment. Node tests alone do not verify browser behaviour.
- The transaction-abort scenario tests one storage failure mode, not all IndexedDB quota, permission, shutdown, or concurrency failures.
- Empty-history policy, cumulative replay budget, and mathematical proof validity remain separate concerns.
- No changes to IndexedDB storage format, application behaviour, or algebra transformations were made in this increment.

## Run

```sh
npm ci
npx playwright install chromium
npm test
npm run test:e2e
```

If `npm ci` reports a stale lockfile, run `npm install --package-lock-only` first; package-lock consistency should be verified in the release environment.
