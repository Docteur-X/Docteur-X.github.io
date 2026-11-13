# T3 progress log (historical)

Moved unchanged from the T3–T5 plan during consolidation. Next-action statements here are out of date.

## Immediate next action

**T3-1: distribution family, approximately 5–10 tests.** Inventory the exact cases and their protected invariants; compare engine-rule, gesture, preview, ownership and rebuild/reacquisition coverage. Produce the first decision-log entries *before* deleting, merging or moving anything. Report findings and obtain a verified baseline after any changes.

## T3 progress (8 November 2026)

T3-1 completed as a source-level review of ten distribution contract/lifecycle cases. All ten are **retained**; no source or test edits justified. See `T3_1_Distribution_Review.md` for the case-level decision log and evidence. Targeted Node distribution run: 24/24 passed. T3-2 should examine rule-level distribution assertions. T2 remains the last full browser-verified baseline.

## T3-5 progress (8 November 2026)

Following independent owner acceptance of T3-4, T3-5 reviewed eight equality-function tests and retained all eight. Two existing assertions were strengthened in one batch: copied clipboard operand identity freshness and right equality-side multiplication order. Both changes kill demonstrated previously surviving mutations. Targeted Node 8/8 and full Node 416/416 passed; no production changes or browser rerun. Await owner acceptance. See [T3-5 equality function application review](../../04_Testing/../06_Historical_Records/Test_Reviews/T3_5_Equality_Function_Application_Review.md). The earlier immediate-next-action section above is historical.

## T3-6 progress (8 November 2026)

After owner acceptance of T3-5, six identity-insertion tests were reviewed and retained. Three existing cases now verify `identityNodeId` against the actual inserted zero/one occurrence across additive sibling, multiplicative edge/gap and wrapping paths. A previously surviving fabricated-ID mutation now fails three targeted cases. Targeted Node **6/6**, full Node **416/416** passed. No production code changes, new/removed tests, or browser rerun. Await independent owner acceptance. See [T3-6 identity insertion review](../../04_Testing/../06_Historical_Records/Test_Reviews/T3_6_Identity_Insertion_Review.md). Earlier immediate-next-action text is historical.

## T3-7 progress (8 November 2026)

After owner acceptance of T3-6, the negation family retained all nine existing tests, strengthened one expansion-provenance assertion, and added one focused longer-product compression test. The original numeric-group overlap was retained for distinct diagnostic value. Targeted Node **10/10**, full Node **417/417** pass; isolated fabricated-ID and surviving-product-ID mutations were detected. No production edits or test removals; browser tests not rerun. Await independent owner acceptance. See [T3-7 negation review](../../04_Testing/../06_Historical_Records/Test_Reviews/T3_7_Negation_Test_Quality_Review.md). Earlier next-action instructions above are historical.

## T3-8 progress (8 November 2026)

After owner acceptance of T3-7, nine history tests were reviewed and retained. One existing test now compares event-generated IDs to the independently computed before/after AST ID difference, with duplicate-ID rejection. A fabricated-ID mutation that survived before is detected. Targeted **9/9**, full Node **417/417**. The corrupted-patch error-message change was deferred (no demonstrated additional regression detection); compact hydration tests were retained separately. No production changes or browser rerun. Await owner acceptance. See [T3-8 history review](../../04_Testing/../06_Historical_Records/Test_Reviews/T3_8_History_Generated_ID_Quality_Review.md). Older immediate-next-action text is historical.

## T3-9 progress (8 November 2026)

T3-9A: the five document-serialization tests and overlapping empty-object hardening case were retained unchanged after examining distinct coverage and maintenance savings. T3-9B: all seven existing save-coordinator tests retained, plus two deterministic regression tests for write ordering and failed-save dirty-state safety. Targeted **9/9**, full Node **419/419**, two isolated mutations detected. No production changes or browser rerun. Await owner acceptance. See [T3-9B autosave review](../../04_Testing/../06_Historical_Records/Test_Reviews/T3_9B_Autosave_Reliability_Review.md). Earlier next-action guidance is historical.

## T3-10 checkpoint (8 November 2026)

Owner accepted T3-9B. The semantic targeting family review retained fourteen existing tests and added one focused resolver collection/role-precedence test, verified by two controlled mutations. Node baseline **420/420**. See [`T3-10 review`](../../04_Testing/../06_Historical_Records/Test_Reviews/T3_10_Semantic_Target_Quality_Review.md). Pending owner acceptance. T3 closure assessment should precede T4; historical plan steps above are preserved for context.
