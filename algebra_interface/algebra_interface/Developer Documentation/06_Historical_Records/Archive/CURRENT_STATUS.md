> **Latest source update (2026-11-06):** Transformation Infrastructure Consolidation v3. 256/256 Node tests passed locally; 34 browser tests not yet rerun for this increment. See [v3 handover](TRANSFORMATION_INFRASTRUCTURE_CONSOLIDATION_V3.md). The previously browser-verified baseline was Numerical Calculation — Shared Lifecycle Migration v1.

> **Latest release candidate (2026-11-06): Grouping Shared Lifecycle Migration v1.** Grouping now uses detached mathematical proposals, source-stamped single-use confirmation and atomic history preparation. **244/244 Node tests passed.** The **32-test Playwright suite awaits browser verification**. See [Grouping Shared Lifecycle Migration v1](GROUPING_SHARED_LIFECYCLE_MIGRATION_V1.md). Older dated status sections below are historical and may contradict current source.

> **Latest increment (2026-11-06):** Factorisation shared lifecycle migration v1. The registered factorisation proposal now uses source-stamped, single-use confirmation and detached history preparation. Node suite: 241 passed. Browser suite: 31 tests, awaiting verification. See [migration handover](FACTORISATION_SHARED_LIFECYCLE_MIGRATION_V1.md).

> **Latest increment (pending browser verification):** Distribution now uses the shared stale-safe, single-use, detached-history commit lifecycle. 238/238 Node tests pass; 30 Playwright tests remain to be run. See [Distribution Shared Lifecycle Migration v1](DISTRIBUTION_SHARED_LIFECYCLE_MIGRATION_V1.md).

> **2026-11-06 incremental update:** Transformation Feature Contract v1 registered `equality.apply-function` through the existing coordinator, added optional multiple gesture references and semantic feedback, and added 2 Node tests. **220/220 Node tests passed.** Browser suite (26 inherited tests) requires user verification. See [contract guide](TRANSFORMATION_FEATURE_CONTRACT_V1.md). The broader `app.js` consolidation and v1.3.2 visual/grouping refinements remain pending.

# Current implementation status

**Source baseline:** 5 November 2026, Transformation Feature Registry v1 archive. **Verified here:** `node --test tests/*.test.js` — **168 passed, 0 failed**. This is a dated check; rerun after changes. Do not treat unit tests as browser interaction tests.

## Implemented

- Scalar mathematical AST, binary equality, explicit groups, operator metadata and rules for arithmetic evaluation, rearrangement, grouping, distribution, factorisation, equality symmetry and `+0`/`×1` insertion.
- Manipulator with stable hit-testing, selection, hover feedback, deliberate amber/blue previews, identity toolbar and configurable hitbox visibility. Five major interaction families use structured gesture/action/visual contracts; the **Transformation Feature Registry v1** registers seven rule IDs and centralises proposal dispatch. `app.js` still handles substantial UI coordination.
- Mathematical Documents **schema v2** contain independently evolving Mathematical Objects, each with its own AST, variable assignments and branching snapshot/event history. Workspace supports document/object management, IndexedDB persistence and JSON import/export.
- Event-only history-library serialization and replay exist; **workspace document export is still full JSON in this release**. Compact document export from an earlier separate development line has not been merged into this baseline.

## Browser observations reported by project owner

Workspace creation/switching, reload persistence, JSON import/export and Close behaviour; identity insertion; distribution including equations; and the five migrated interactions were reported working in the browser. These are informal observations, not a recorded cross-browser end-to-end test suite. The registry integration itself still merits a complete browser regression pass.

## Not yet implemented in this baseline

- Adjustable per-rule confirmation mode, teaching-site integration, historical visual replay/timeline, reversible explanatory-depth controls, annotation layer and a complete gesture resolver.
- Copy as new Mathematical Object, cross-object provenance/transactions, document-level organisational history, operations on both sides of equality and equality substitution.
- Compact export/import for schema-v2 documents, deep untrusted-import validation, simultaneously mounted Manipulators, logical connectors, fractions/matrices and broader mathematical typing.
- Standalone embeddable Manipulator API and comprehensive browser/accessibility/performance testing.

## Next engineering priorities

1. Browser-check registry integration and reconcile compact-history serialization with multi-object schema v2 (without breaking old full JSON).
2. Implement copy of expressions/subexpressions/statements as new independent Mathematical Objects, with fresh occurrence IDs and source provenance; begin distinct document-operation events.
3. Build cross-object mathematical actions and equality transformations, then substitution. Keep advanced explanation/replay and annotations as explicitly documented future design work.

**References:** [Architecture overview](ARCHITECTURE_OVERVIEW.md), [registry v1](TRANSFORMATION_FEATURE_REGISTRY_V1.md), [multi-object documents](MULTI_OBJECT_DOCUMENTS_V2.md), [future roadmap](FUTURE_FEATURES.md).

## Application Controller Consolidation v1 (2026-11-05)

Extracted Transformation Feature assembly, DOM bindings, workspace navigation rendering and presentation preferences from `app.js`. This is a behaviour-preserving first pass, not a complete extraction of drag/preview coordination. **171 automated tests pass**; browser regression testing is still required. See [Application Controller Consolidation v1](APPLICATION_CONTROLLER_CONSOLIDATION_V1.md).

### Application controller regression fix (2026-11-05)
The first consolidation build removed eight direct adapter imports still required by live `app.js` drag/drop handlers, breaking interactive drops and previews. Those imports are restored in the corrected release; an explicit regression test was added. Latest verified Node baseline: **172/172 tests**. Browser verification of this corrected build is pending. See `APPLICATION_CONTROLLER_CONSOLIDATION_V1.md`.

## Browser-testing update (2026-11-05)

The user verified Playwright Architecture v2 smoke/identity tests (3/3). Playwright Interaction Coverage v3 adds tests for rearrangement, distribution, grouping, and factorisation; these new scenarios await a real Chromium run. Playwright is pinned to 1.64.1; regenerate and verify the supplied lockfile with npm on a networked machine before CI adoption.

## Test reliability audit v1 (2026-11-05)

The owner verified **172/172 Node tests and 7/7 Chromium browser tests** on the corrected Playwright v3 baseline. The new audit strengthens exact mathematical outcomes and adds equation-root, grouping-cancellation, persistence and a controlled mutation probe. The 172 Node tests and the mutation probe pass in the audit environment; the expanded browser suite remains **unverified** until run in Chromium. See [Test Reliability and Correctness Audit v1](TEST_RELIABILITY_CORRECTNESS_AUDIT_V1.md).


### Equality preview visual refinement v1.3.1 (6 November 2026)

Equality inserted operands now share distribution’s dashed amber outline, soft fill, and luminous halo through common CSS declarations. Mathematical rules and AST grouping are unchanged. **216/216 Node tests passed locally**; updated Playwright test and visual comparison on actual browsers are pending. See [v1.3.1 handover](EQUALITY_FUNCTION_APPLICATION_V1_3_1_AMBER_GLOW.md).


## Numerical combination shared lifecycle migration (2026-11-06)

Numerical sibling combination (+ and multiplication) now prepares a detached AST candidate and uses the same source-stamped, single-use, detached-history commit mechanism as rearrangement and the other migrated transformations. See `NUMERIC_COMBINATION_SHARED_LIFECYCLE_MIGRATION_V1.md` for ownership, invariants, tests and limits. This milestone preserves green hover feedback and immediate drop confirmation. Browser verification is pending; Node suite: 252 tests passed.
