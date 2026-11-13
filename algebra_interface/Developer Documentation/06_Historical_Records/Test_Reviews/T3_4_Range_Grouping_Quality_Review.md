# T3-4 — Range grouping test-quality review

**Checkpoint: 8 November 2026. Implemented and Node-verified; awaiting independent owner acceptance.**

## Purpose and decision

Review eight mathematical/selection cases in `tests/range-grouping.test.js` for unique regression value, assertion quality, and maintainability. Retain all eight: no justified merges or removals. One assertion was demonstrably weak: the proper-subset grouping test checked only that `provenance.createdNodeIds` had two entries, not that they identified the generated nodes. No other changes were justified.

## Implemented change

In `Ctrl+click order does not affect grouping order; proper range keeps all operand IDs`, replace the length-only check with an exact ordered comparison of `result.provenance.createdNodeIds` to `[result.inner.id, result.group.id]`. Preserve all other assertions and test cases. This checks the generated AST occurrences against reported provenance; it does not change the mathematical operation.

## Evidence

- Targeted test suite: `node --test tests/range-grouping.test.js` — **10/10 passed**.
- Deliberate temporary mutation in `js/operations/grouping.js` substituted fabricated IDs for `[inner.id, group.id]`; the strengthened targeted test **failed as intended**. The original production source was restored before final verification.
- Full Node suite: `node scripts/run-node-tests.mjs` — **416/416 passed**.
- Documentation links: `node scripts/check-documentation-links.mjs` — **336 valid**.
- Playwright/browser tests: **not rerun in this environment**; independent owner acceptance pending.

## Scope and rollback

Only one existing assertion in `tests/range-grouping.test.js` was changed. No production code, test count, test title, fixtures, or discovery logic changed. To roll back T3-4 alone, replace the exact ordered provenance comparison with the former `assert.equal(result.provenance.createdNodeIds.length, 2)` and remove the accompanying explanatory comment. Keep T3-2 and T3-3 changes intact.

## Next gate

Stop for owner independent verification before choosing another T3 test family. Phase 6 and creative explorations remain deferred. Older handover next-action statements are historical.
