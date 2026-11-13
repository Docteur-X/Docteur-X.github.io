# T3-2 — Mathematical distribution test quality review

**Status (8 November 2026): T3-2A and T3-2B implemented and Node-verified, in separate increments.** The owner confirmed all tests passed after A and explicitly requested B. No production JavaScript or browser tests were changed.

## Scope and decisions

Read-only review covered the twelve direct mathematical distribution cases in `tests/distribution.test.js` and the five adjacent associativity, renderer, and equality cases. **Retain all existing tests**: no merges, deletions, or renames. Distinct protections include factor order, commutativity independence, adjacency, exact sum targeting, explicit groups, surrounding operands, occurrence identity, numerical evaluation, and invalid-plan nonmutation. Browser tests provide separate gesture and lifecycle evidence; they are not replacements for mathematical tests.

## T3-2A — implemented, verified

**Test:** `tests/distribution.test.js` — `compound source factors receive distinct new nested IDs with provenance`.

**Original protection retained:** Each nested source node receives two different new IDs, neither equal to its original ID; all resulting AST IDs are unique.

**Gap closed:** Previously the provenance map could contain fabricated or wrongly ordered IDs without being checked against the actual generated subtrees.

**New assertions:** Capture the original compound source traversal before mutation; find the produced sum by `result.resultId`; require two product terms; traverse the copied left factor of each term; require the same number of nodes; and assert that each actual copied node ID equals the corresponding `copiesBySourceId[original.id][copyIndex]` entry, with matching node type. Comments explain the intended failure mode and left-distribution ordering. The original uniqueness assertions remain intact.

**Verification:** Before edit: `node --test tests/distribution.test.js` **17/17 passed**. After edit: same command **17/17 passed**. Full `node scripts/run-node-tests.mjs` **416/416 passed** (8 November 2026, current container). No browser suite was run or claimed. The number and identity of tests remain unchanged.

**Rollback:** Revert only the additions inside the named compound-factor provenance test; no other tests or production files were changed for A.

## T3-2B — implemented, verified (8 November 2026)

**Test:** `tests/distribution.test.js` — `stale or direction-forged plans are rejected without mutation`.

**Exact addition:** Two null-result assertions for `{ ...good, productId: "not-a-product" }` and `{ ...good, sumId: "not-the-target-sum" }`. Existing invalid-direction, invalid-source-factor and null-plan assertions, plus the final unchanged-AST assertion, remain. A brief explanatory comment documents the identity and nonmutation contract. This is mathematical plan revalidation, not transaction-level source-stamp validation.

**Verification:** `node --test tests/distribution.test.js` **17/17 passed**; `node scripts/run-node-tests.mjs` **416/416 passed**; `node scripts/check-documentation-links.mjs` **336 links valid**. No Playwright run was performed in this increment. All original test identities and assertions remain, and no production code changed.

**Rollback:** Remove only the two new invalid-ID assertions and their accompanying comment inside the named test. T3-2A provenance strengthening must remain intact.

## Current gate / next action

T3-2A and T3-2B are implemented and independently Node-verified. Stop for owner review and browser testing as appropriate before the next test-quality increment. The broader T3–T5 plan remains active; do not begin Phase 6 or automatically implement another batch. Earlier pending-B instructions are historical and superseded by this section.
