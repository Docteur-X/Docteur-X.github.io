# T3-6 — Identity insertion test quality review

**Checkpoint:** 8 November 2026. **Status:** implemented and Node-verified; awaiting independent owner acceptance. The owner accepted T3-5 before this increment. See [T3–T5 execution plan](../../04_Testing/T3_to_T5_Test_Quality_Execution_Plan.md).

## Purpose and decision

Review all six cases in `tests/identity-insertion.test.js` for distinct coverage, assertion strength, diagnostic clarity, and maintenance cost. Retain all six; merge/remove none. A controlled mutation demonstrated that returning a fabricated `identityNodeId` could escape the original six tests and the related architecture/lifecycle tests. The ID is consumed by preview/history integration, so matching metadata to the actual inserted AST node is a meaningful contract.

## Implemented change

In **three existing test cases only**, assert `result.identityNodeId` equals the ID of the actual inserted Number node:

1. Additive sibling insertion before and after a target (`0`): one comparison in each loop iteration.
2. Multiplicative factor-edge and product-gap insertion (`1`): one comparison per returned proposal.
3. Explicit Add wrapping of a factor (`0`): one comparison against the new wrapper's identity operand.

These are **four assertion sites** covering five runtime insertion scenarios (the additive test loops over both sides). Existing value, position, preservation, invalid-request and non-associativity checks remain. No new tests, helpers, fixture changes, or production edits. No unnecessary micro-release split.

## Verification evidence

- `node --test tests/identity-insertion.test.js`: **6/6 pass**.
- `node scripts/run-node-tests.mjs`: **416/416 pass**, zero failures/skips.
- Isolated temporary mutation: replace `identityNodeId: identity.id` in `js/operations/identityInsertion.js` with a fabricated string. The strengthened targeted suite rejects it (**3 pass / 3 fail**); the original production file was restored byte-for-byte before packaging. This mutation intentionally does not cover every possible corruption pattern.
- Documentation links: run after final documentation edits; final result recorded in handover.
- Playwright: **not rerun**. Independent owner acceptance: **pending**.

## Rollback and next gate

Restore `tests/identity-insertion.test.js` from the owner-accepted T3-5 ZIP and revert this checkpoint's documentation changes. No production migration is involved. **Stop for independent owner verification before selecting another batch.** The consolidation goal is trustworthy, understandable, maintainable and diagnostic tests, not fewer tests for their own sake.
