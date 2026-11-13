# T3-7 — Negation test quality review

**Checkpoint:** 8 November 2026. **Status:** implemented and Node-verified; awaiting independent owner acceptance. **Baseline:** owner-accepted T3-6. See [T3–T5 execution plan](../../04_Testing/T3_to_T5_Test_Quality_Execution_Plan.md).

## Objective and disposition

Improve diagnostic value and regression protection without manufacturing test changes or reducing meaningful coverage. Review the nine existing tests across `tests/negation-subtraction-v1.test.js`, `tests/negation-compression-v12.test.js`, and `tests/negation-contract-roundtrip.test.js`. **Retain all nine existing cases.** Do not merge the partially overlapping grouped-number tests: one also protects source detachment and selected Group identity; the other is a concise numeric-versus-structural regression. No fixture or production refactor is justified.

## Implemented changes

1. **Strengthen** `expansion constructs a detached candidate, preserving operand identities` in `tests/negation-subtraction-v1.test.js`: compare `candidate.result.insertedNodeIds` exactly to `[product.operands[0].id]` so provenance identifies the actual generated `Number(-1)` occurrence. Keep existing AST, ID, detachment and rejection assertions.
2. **Add** `compression retains a longer product and unrelated factor IDs` in `tests/negation-compression-v12.test.js`: on `-1*(a+b)*c`, verify the surviving Multiply ID and factor count, preserved Group and tail IDs, generated Negate ID correspondence, removal of the original -1 node, and source immutability. This covers the noncollapsing-product branch, distinct from existing two-factor tests.

No production JavaScript, shared helpers, test titles, or existing assertions were changed. Exactly one new test was introduced, changing the full Node count from 416 to 417.

## Verification evidence

- Targeted three negation files: **10/10 pass** (nine original plus one new).
- Full Node regression: **417/417 pass**, zero skipped/failed.
- Isolated controlled mutation A: fabricate `insertedNodeIds` in `js/operations/negation.js`; strengthened expansion test detects it (**2 pass, 1 fail** of three in its file).
- Isolated controlled mutation B: corrupt the surviving longer Multiply ID after compression; new test detects it (**3 pass, 1 fail** of four in its file). This probe is narrow and does not prove every branch error is detected.
- Documentation link validation: rerun after documentation edits; see current handover for final count.
- Playwright **not rerun**; independent owner testing **pending**.

## Rollback and next gate

Restore the two negation test files from the accepted T3-6 archive and revert this checkpoint's documentation additions. Do not change production code. **Stop for independent owner acceptance before selecting the next test family.** Preserve all earlier accepted T3 improvements and keep Phase 6 deferred.
