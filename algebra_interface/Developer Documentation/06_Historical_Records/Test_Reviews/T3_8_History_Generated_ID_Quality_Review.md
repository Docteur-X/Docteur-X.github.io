# T3-8 — History generated-node identity quality review

**Checkpoint:** 8 November 2026. **Status:** implemented and Node-verified; awaiting independent owner acceptance. **Baseline:** owner-accepted T3-7. See [T3–T5 execution plan](../../04_Testing/T3_to_T5_Test_Quality_Execution_Plan.md).

## Goal and decisions

Review nine document-history tests for distinct regression protection, maintainability, and diagnostic quality. Retain all nine tests. Strengthen only the test `replay preserves explicit node IDs, presentation metadata and new IDs` in `tests/state/document-history.test.js`. Do not merge, remove, rename, or change fixtures. No production changes.

The previous assertion merely required a nonempty `event.generatedNodeIds`. The strengthened test independently traverses the before-and-after snapshot ASTs, compares the event's generated IDs as a set to the actual new occurrence IDs, and asserts the event has no duplicate generated IDs. The fixture intentionally parses before and after separately: generated history IDs are a snapshot-set difference, not necessarily only the inserted identity node's ID. The test-local traversal is intentionally independent of the production history collector and is explained in comments.

**Deferred candidate B:** Do not replace the corrupted-event replay `/differs/` assertion with an exact error message: the existing test already detects disabling the output fingerprint check, and an exact message would add brittle wording coupling without demonstrated extra protection.

**Retained candidate C:** Compact branch hydration is distinct from document-level serialization and hostile-input validation; no merge or shared fixture is justified.

## Verification

- Targeted `node --test tests/state/document-history.test.js`: **9/9 pass**.
- Full `node scripts/run-node-tests.mjs`: **417/417 pass**.
- Controlled isolated mutation: fabricate `generatedNodeIds` only when new IDs are present in `js/core/documentHistory.js`. With strengthened tests, targeted suite **8 pass / 1 fail**, as intended. The mutation was applied only to a separate temporary copy; the packaged production source is unchanged.
- Documentation links: validated after updates; refer to final handover for count.
- Playwright: **not rerun**. Independent owner acceptance: **pending**.

## Rollback and next gate

Restore only `tests/state/document-history.test.js` from the owner-accepted T3-7 archive and revert this checkpoint's documentation edits. Do not change production source. Stop for independent owner verification before starting another batch. Preserve the principle that replay integrity is not mathematical proof.
