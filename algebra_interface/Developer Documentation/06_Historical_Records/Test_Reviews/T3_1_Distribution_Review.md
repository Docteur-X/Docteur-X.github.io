# T3-1 — Distribution test-family quality review

**Status:** Source-level review complete; no test or production changes justified. **Date:** 8 November 2026. **Baseline:** T2 accepted (416 Node / 77 Playwright tests, owner-reported browser verification). **Scope:** ten cases in three Node/browser contract files; adjacent mathematical-rule tests were also inspected for overlap.

## Method and evidence

Read complete bodies of `tests/distribution-architecture.test.js`, `tests/distribution-shared-commit-lifecycle.test.js`, `e2e/distribution-shared-lifecycle.spec.js`, and `e2e/phase4d4-distribution-lease.spec.js`, plus the test titles and coverage in `tests/distribution.test.js`. Compared *failure modes*, not just similar labels. Ran the three distribution Node files together: **24/24 passed**. Browser cases below are **not newly executed** in this review; their last accepted run is the T2 baseline. Do not mark a new browser run as passed on the basis of this document.

## Review decisions (proposed, no deletions)

| Test identity | Protected invariant / distinct evidence | Decision | Rationale and replacement |
|---|---|---|---|
| `tests/distribution-architecture.test.js` — `distribution gesture produces a frozen DOM-free request` | Gesture request is immutable, DOM-free, rejects malformed plan | **Retain** | Distinct adapter boundary; no equivalent replacement. |
| Same — `distribution candidate and visual description preserve left/right provenance targets` | Direction and highlighted IDs survive proposal → visual description; mathematical provenance exists | **Retain** | Tests cross-module provenance, not merely algebraic output. |
| Same — `distribution preview rejects stale revisions and supports cancellation` | Preview coordinator rejects stale source and supports reopening after cancellation | **Retain** | Pure preview contract; browser coverage exercises different entry points. |
| `tests/distribution-shared-commit-lifecycle.test.js` — `left distribution uses detached, single-use history commit` | Detached preview, atomic left commit, exact one history append, consumed proposal | **Retain** | Direction-specific publication and source immutability. |
| Same — `right distribution uses detached, single-use history commit` | Right-side factor order and publication lifecycle | **Retain** | Not equivalent to left because direction and order differ. |
| Same — `distribution cancellation and stale source do not commit` | Cancelled/stale proposals cannot publish | **Retain** | Different failure mode from successful single-use commit. |
| Same — `distribution history preparation failure cannot publish partial state` | Throw during atomic preparation leaves original state/history untouched and consumes gate | **Retain** | Exceptional failure coverage, not duplicated by cancellation. |
| `e2e/distribution-shared-lifecycle.spec.js` — `distribution cancellation followed by confirmation commits exactly once` | Real pointer drag, cancel, reacquire, commit exactly once | **Retain** | Integration evidence beyond mock gate. Hover eligibility assertion is deliberate. |
| `e2e/phase4d4-distribution-lease.spec.js` — `4D-4: switching objects cancels distribution and allows a fresh preview` | Object switch invalidates preview and releases lease | **Retain** | Distinct lifecycle transition; historical Phase 4D-4 regression protection. |
| Same — `4D-4 hardening: expression rebuild releases distribution ownership` | Rebuild cancels proposal *and* permits new preview | **Retain** | Detects stranded lease even when preview DOM disappears; historical hardening. |

**All ten decisions are proposed for retention.** No merge/remove is warranted from this batch. The two browser lease tests look similar but cover *different source-change mechanisms* (object switch vs expression rebuild). The Node preview and commit tests exercise distinct contracts; a shared label does not imply redundant evidence.

## Quality observations and follow-up

- `tests/distribution.test.js` includes additional rule-level tests (nonadjacency, nested groups, direction, stable IDs, equality sides, numeric preservation). Do not merge these into browser lifecycle tests; their assertions address different risks. Review them in a later focused batch.
- Browser drag setup is repeated in the two lease tests and the shared lifecycle test. **Defer helper extraction:** a helper could reduce repetition, but might hide eligibility and pointer-event assertions that historically caught failures. If reconsidered, preserve the visible hover-target assertion and test-specific postconditions.
- The second-drag eligibility regression from Phase 5D-2 is already protected elsewhere; do not remove it as a duplicate of lease reacquisition without comparing its distinct gesture-boundary failure mode.
- Some assertions compare the raw AST text/history count rather than a canonical structural representation; they are appropriate for unchanged-state checks, but any future strengthening should preserve the original state and history invariants.
- No test changes were necessary. The value of this batch is a documented, source-grounded **retain** decision, not a lower test count.

## Verification and next step

- Targeted Node: **24/24 passed**, command: `node --test tests/distribution-architecture.test.js tests/distribution-shared-commit-lifecycle.test.js tests/distribution.test.js`.
- Full Node and browser suites: latest accepted T2 baseline **416/416** and **77/77**; no new full run claimed by this review.
- T3-2: inspect approximately 5–10 *mathematical distribution rule* tests in `tests/distribution.test.js` and compare them with the actual browser distribution happy path and equality-side coverage. Decide whether to strengthen assertions; do not delete tests without named equivalent coverage.
