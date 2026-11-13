# T3-5 — Equality function-application test quality review

**Checkpoint:** 8 November 2026. **Status:** implemented, Node-verified; awaiting independent owner acceptance. This record supplements the [T3–T5 execution plan](../../04_Testing/T3_to_T5_Test_Quality_Execution_Plan.md). The latest accepted baseline before this increment is T3-4, independently accepted by the owner.

## Purpose and decision

Review the eight cases in `tests/equality-function-application.test.js` for distinct regression protection, assertion quality, and maintenance value. Retain all eight. Strengthen two existing cases in one risk-justified batch; no test additions, merges, removals, fixture changes, or production JavaScript changes. No shared helper or restructuring is warranted.

## Changes to the existing tests

1. **Addition context preserves original side IDs and clones operand twice with unique IDs.** In addition to preserving the existing source immutability, equality-side identity, grouping, visual-role and result-uniqueness assertions, traverse the inserted compound operand on each equality side. Check that each copied subtree has the original operand's node count and that none of its node IDs occurs in the original clipboard operand. This protects fresh occurrence identities *across* the clipboard/result boundary, which global result uniqueness alone does not establish.
2. **Left and right multiplication retain factor order, never claim reversible equivalence.** Keep all original left-equality-side checks. Assert the order of the inserted `c` and original `b` on the **right** equality side for both `multiply-left` and `multiply-right`, and require `not-established` equivalence metadata for both contexts. This protects ordered multiplication on both sides rather than only the left side.

The six other equality-function cases remain unchanged. The misleading undo-related title in `tests/equality.test.js` is recorded as a separate potential diagnostic-clarity review, not changed here.

## Mutation evidence

Two independent temporary copies of the project were used; neither mutation was applied to the delivered project:

- **Clipboard descendant identity reuse:** make the left inserted operand reuse an original clipboard descendant ID. Before strengthening, the eight-test suite allowed this mutation; after strengthening, the targeted run reports **7 pass / 1 fail**, with the new original-ID rejection assertion failing.
- **Right-side factor order reversal:** reverse only the right equality-side factors for `multiply-left`. Before strengthening, the eight-test suite allowed this mutation; after strengthening, the targeted run reports **7 pass / 1 fail**, with the new right-side order assertion failing.

Both mutations were discarded; the packaged production source is unchanged from T3-4.

## Verification

- `node --test tests/equality-function-application.test.js`: **8/8 pass** on unmodified production code.
- `node scripts/run-node-tests.mjs`: **416/416 pass**, zero skipped or failed.
- `node scripts/check-documentation-links.mjs`: recheck after documentation edits (recorded in the final package verification).
- Playwright browser suite: **not independently rerun** for this test-only increment.
- Independent owner testing: **pending**.

## Rollback and next gate

Rollback: restore `tests/equality-function-application.test.js` from the accepted T3-4 archive, and revert this checkpoint's documentation edits. No production migration is involved. **Stop for owner independent verification** before selecting the next test-consolidation batch. The broader goal remains reliable, understandable, maintainable, diagnostic coverage, not an arbitrary reduction in test count.
