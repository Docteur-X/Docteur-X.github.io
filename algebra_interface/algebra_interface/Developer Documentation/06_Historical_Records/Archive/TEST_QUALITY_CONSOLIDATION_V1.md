# Test Quality Consolidation v1 — developer handover

## Scope and baseline

Based on Touch-Friendly Multi-Selection v1.1 (202 Node tests, 17 Chromium tests). This increment is **test-only**: no mathematical engine, UI, history, storage or import/export production logic is changed. Existing documentation remains historical evidence, not necessarily an exact description of current code. Always inspect implementation and tests before changing a contract.

## Added checks

1. `tests/mathematical-properties.test.js`: two reproducible 40-case families of scalar distribution and factorisation. Expected values come from independent arithmetic (`a*b+a*c`), not from the engine's evaluator or generated result. Both left and right factor positions are exercised. The fixed seeds make failures reproducible. These are *semantic* checks and complement, rather than replace, exact MathJSON/ID/provenance assertions in existing tests. They do not assert that future matrix multiplication commutes.
2. `e2e/history-navigation-quality.spec.js`: navigates two sibling historical states through real history UI buttons, checks their mathematical expression against separately hydrated fixture snapshots, and checks the selected branch survives reload. The fixture's branching graph is asserted explicitly so changes to the fixture cannot silently weaken the scenario. The browser test has not been executed in this environment; it must be verified on a machine with Playwright Chromium installed.
3. `scripts/mutation-quality-probes.js`: in temporary copies only, deliberately reverses extracted-factor placement in factorisation and allows nonadjacent distribution. Each must cause a real assertion failure. A missing mutation anchor or unrelated execution failure is not reported as success. The original distribution-order probe remains in place.

## What the suite establishes, and what it does not

- **Exact AST assertions** protect operand order and structural intent; **semantic property assertions** protect scalar numerical meaning. Neither alone proves all algebraic transformations correct.
- **Node tests** verify engine rules, identities, snapshots, validation and persistence adapters. **Browser tests** verify actual interactions and visible state. Source-text/wiring checks are architectural tripwires, not behavioural proofs.
- The new history browser scenario uses a deterministic fixture to check navigation; it is not a substitute for a full live edit → branch → reload interaction test.
- Mobile repeated-tap selection is already covered with `hasTouch` and a narrow viewport. True touch-pointer dragging and physical-device scrolling/gesture conflicts remain unverified. Do not infer support for all mobile gestures from tap-only tests.
- The legacy v1 fixture is synthetic; genuine archived user exports should be added as immutable fixtures when available.
- Mutation probes are curated examples, not mutation coverage percentages. Avoid indiscriminately growing test counts.

## Commands and expected results

- `node --test tests/*.test.js`: **204** tests expected.
- `node scripts/mutation-probe.js`: existing factor-order mutation must be killed.
- `node scripts/mutation-quality-probes.js`: both new mutations must be killed.
- `npm run test:e2e`: **18** tests expected, including one new history-navigation test. Browser verification is pending on a Playwright-capable machine.
- Playwright deliberately sets `reuseExistingServer: false`. Stop any other server on port 8000 before running.

## Priorities before future mathematical features

1. Verify the new browser test, and adjust only after investigating whether a failure comes from implementation, fixture, test expectation or environment.
2. Add an authentic historical export fixture if available. Do not invent one and describe it as historical.
3. When adding touch-based copying or other manipulation, test an actual touch-pointer drag with device emulation and a physical device; keep scrolling and drag gestures distinct.
4. When adding vectors/matrices, introduce explicit mathematical type/shape/operation contracts. Scalar numerical properties must not be generalized to noncommutative operations.
5. For every new transformation, verify eligibility, exact output, mathematical meaning, stable existing IDs, newly allocated IDs, non-mutation during preview, cancellation, history replay, and at least one meaningful rejection case. Reuse common helpers when this reduces duplication without hiding the oracle.

## Architecture and maintainability

Tests are deliberately independent of production feature modules wherever possible: expected scalar arithmetic is written directly in the test. The browser page object is reused instead of duplicating selectors. No production APIs or test-only hooks have been introduced. Keep comments explanatory (mathematical assumption, intent, failure mode), not line-by-line restatements of code. Future developers should update this document and the primary project context when changing the testing contract.
