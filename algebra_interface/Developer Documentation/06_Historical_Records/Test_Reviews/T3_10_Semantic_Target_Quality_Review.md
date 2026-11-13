# T3-10 — Semantic target quality review

**Date:** 8 November 2026. **Status:** implemented and Node-verified; awaiting owner acceptance. **Baseline:** owner-accepted T3-9B. **Scope:** test-only, no production changes.

## Decision and rationale

Reviewed the six semantic resolver tests plus four semantic-container-map tests and four semantic-refresh tests. Retained all fourteen. Browser hardening tests protect actual renderer metadata and visual integration; they are not substitutes for resolver collection semantics. Existing operator-position filtering and stale-DOM tests already protect their respective contracts; no additional tests were added for those alone.

Added one focused Node regression test to `tests/presentation-phase2-semantic-targets.test.js`: **`Phase 2: multiple semantic representations retain occurrence precedence and attached targets`**. The fixture models an Add occurrence with two occurrence hitboxes, one content container, and two indexed operator targets. It checks preferred-role precedence, complete target collections in scan order, explicit roles, operator filtering and no fallback, `describe()` counts, and detached-target filtering without a refresh. The test is deliberately independent of actual browser geometry.

## Verification

- Targeted: `node --test tests/presentation-phase2-semantic-targets.test.js` — **7/7 passed** (previously 6).
- Full Node: `node scripts/run-node-tests.mjs` — **420/420 passed** (previously 419).
- Controlled mutation A: discard all but the first occurrence target — **6 passed, 1 failed**.
- Controlled mutation B: remove preferred occurrence selection, allowing content to win — **1 passed, 6 failed**.
- Both mutations were temporary and the original production resolver was restored. No production files were changed.
- Browser Playwright suite was **not rerun** in this increment; owner acceptance pending.

## Rollback and next step

Restore only `tests/presentation-phase2-semantic-targets.test.js` from the owner-accepted T3-9B archive, and revert this increment's documentation. No production rollback is necessary. Stop for owner testing. After acceptance, reassess the overall T3 priority-family coverage before proceeding to T4 stability, input methods, and diagnostics; do not manufacture additional T3 assertions.
