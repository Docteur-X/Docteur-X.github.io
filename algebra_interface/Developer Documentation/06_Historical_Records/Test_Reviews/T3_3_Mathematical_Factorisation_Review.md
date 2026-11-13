# T3-3 — Mathematical factorisation test quality review

**Latest checkpoint (8 November 2026): T3-3A owner-accepted; T3-3B and T3-3C implemented together and Node-verified. Full T3-3 awaits owner browser/independent acceptance.**

## Review scope and decisions

The read-only review examined ten mathematical factorisation tests in `tests/factorisation.test.js` against the factorisation operation and neighbouring architecture/lifecycle coverage. Retain all ten tests; no merges or removals. Three targeted strengthening candidates were approved. T3-3A was owner-accepted, and T3-3B/C were subsequently combined into one risk-proportionate implementation batch.

## T3-3A — exact extracted-factor provenance (implemented)

**Test:** `left extraction retains residual IDs and explicit Group/Add IDs` in `tests/factorisation.test.js`.

**Gap:** A length-only assertion for `originIdsByNewId[extractedFactorId]` could pass with three incorrect or misordered IDs. It did not establish that `extractedFactorId` identifies a real occurrence in the resulting candidate AST.

**Change:** Replace that length-only check with `assert.deepEqual` against the fixture's exact original selected-factor `ids` in canonical addend order (the plan was deliberately requested with reversed selection order). Find the extracted occurrence in `result.root`, require that it exists and is `Symbol('a')`, and require `result.provenance.extractedFactorId === result.extractedFactorId`. Keep the existing generated-ID freshness, residual-ID, Group/Add-ID, source-immutability and formatted-output checks. Comments document the regression protected. No production code, test titles, test counts, or unrelated tests changed.

**Verification (current environment):** `node --test tests/factorisation.test.js` **16/16 passed**; `node scripts/run-node-tests.mjs` **416/416 passed**. Browser tests were not rerun. Owner verification is pending.

**Rollback:** Revert only the new provenance and generated-occurrence assertions within the named test, restoring the former length-only assertion. Leave prior T3-2A/B changes intact.

## Remaining approved-in-principle increments — NOT implemented

- **T3-3B:** In the compound common-factor test, verify fresh IDs for the extracted compound subtree and the precise distinction between root provenance (both selected factor origins) and descendant provenance (representative first factor). Reinspect the actual fixture and source before editing.
- **T3-3C:** In the forged-plan test, add narrow `sumId`, `productIds`, and direction rejection checks and verify nonmutation after each; do not duplicate transaction-level stale-source tests.

**Gate:** Await owner verification of T3-3A before beginning T3-3B. Phase 6 remains deferred. Historical earlier next-action statements in other documents are superseded by this latest checkpoint.

## T3-3B/C — combined factorisation test-quality increment (8 November 2026)

**Scope:** Only `tests/factorisation.test.js`; no production-code changes, new test cases, removals, or merges. T3-3A remains intact.

**T3-3B — compound-factor provenance:** In `compound common factors match structurally, ignoring IDs and bracket styles`, assert exact selected source-factor IDs, existence and structural equality of the extracted factor, fresh IDs for every extracted-subtree occurrence, unique extracted IDs, and correspondence of every reported origin to the actual generated subtree. The extracted root reports *both* selected factor IDs in canonical addend order; descendants report their corresponding origin in the *first* selected representative subtree. This intentionally tests the existing implementation contract rather than asserting that descendants have two origins. Existing assertions are retained.

**T3-3C — forged mathematical plans:** In `stale plan is rejected atomically, no mutation`, retain the forged `groupId` case and add forged `sumId`, `productIds`, and direction cases. Each rejection must return `null` and preserve the exact serialized source AST. This does not duplicate document-level stale-source lifecycle tests.

**Verification performed in this environment:** `node --test tests/factorisation.test.js` **16/16 passed**; `node scripts/run-node-tests.mjs` **416/416 passed**; `node scripts/check-documentation-links.mjs` **336 links valid**. Browser/Playwright tests **not rerun**. Independent owner acceptance of the combined increment is **pending**.

**Rollback:** Revert only the new compound-factor provenance assertions and the forged-plan loop to the prior single `groupId` rejection assertion; keep the accepted T3-3A provenance improvement and all T3-2 changes.

**Next gate:** Owner independently tests the packaged project. Do not begin another consolidation family until results are reported and the next batch is agreed.
