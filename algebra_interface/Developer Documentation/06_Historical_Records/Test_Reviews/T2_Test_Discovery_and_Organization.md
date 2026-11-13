# T2 — Test Discovery and Organization (Pilot)

**Status:** Historical record of a completed pilot; the owner later reported browser acceptance (see [Current Status](../Superseded_2026-11-12/Current_Status.md)). Date: 8 November 2026. This is a limited organizational pilot, **not** test consolidation.

## Changes

- Added `scripts/run-node-tests.mjs`, which recursively discovers `.test.js` files beneath `tests/` and invokes Node's test runner with explicit file paths. `npm test` now calls this script. `--list-files` prints the discovered files. This avoids shell globstar portability issues and silent omission of nested tests.
- Updated `scripts/build-test-inventory.mjs` to recursively discover both Node and Playwright tests, including nested directories.
- Moved four Node tests and two browser specs into responsibility-oriented subdirectories; relative imports and fixture paths were updated. Test names, bodies, and assertions are unchanged.
- Kept existing helpers, fixtures, and page objects in their original locations; left all other tests untouched.

## Relocation map

| Old location | New location |
|---|---|
| `tests/document-history.test.js` | `tests/state/document-history.test.js` |
| `tests/document-serialization.test.js` | `tests/state/document-serialization.test.js` |
| `tests/phase5d-equation-layout-transition.test.js` | `tests/presentation/phase5d-equation-layout-transition.test.js` |
| `tests/phase5d3-equation-semantic-refresh.test.js` | `tests/presentation/phase5d3-equation-semantic-refresh.test.js` |
| `e2e/persistence.spec.js` | `e2e/workspace/persistence.spec.js` |
| `e2e/touch-selection.spec.js` | `e2e/accessibility/touch-selection.spec.js` |

## Verification

- **Node execution:** 416/416 passed, zero failures, after relocation (Node v22.16.0).
- **Discovery:** 75 Node test files and 39 Playwright spec files; 114 total, matching T1. Static inventory reports 403 and 73 declarations respectively; these are not executed-test totals.
- **Browser execution:** **not run in this environment**; `@playwright/test` executable and npm are unavailable here. Last accepted user-verified baseline is 77/77 from the pre-T2 build. Run the full browser suite before accepting T2.
- **Production application:** no changes.

## Risks and next actions

1. Run `npm test` and `npm run test:e2e` on the user's computer. Both must pass, with 416 and 77 executed tests respectively.
2. Verify Playwright picks up the relocated specs (`testMatch: '**/*.spec.js'`) and that relative imports and fixtures resolve.
3. Only after verification consider a broader responsibility-based reorganization. Avoid moving every file in one patch.
4. T3 must review assertions and regression provenance before merging or deleting tests. No test was merged or deleted in T2.
5. Preserve historical phase provenance in test comments and inventory even if filenames are later modernized.

## Maintenance guidance

- `node scripts/run-node-tests.mjs --list-files` enumerates Node test files recursively.
- `node scripts/build-test-inventory.mjs` refreshes the inventory; it does not change test source.
- Never replace the recursive Node runner with a root-only glob without a discovery-count regression check.
- A count match is necessary but insufficient: preserve test titles and invariant coverage when reorganizing.
