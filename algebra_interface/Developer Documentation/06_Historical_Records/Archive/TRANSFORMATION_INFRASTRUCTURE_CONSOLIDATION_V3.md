# Transformation Infrastructure Consolidation v3

**Date:** 2026-11-06  
**Baseline:** Numerical Calculation — Shared Lifecycle Migration v1 (252 Node / 34 Playwright tests previously verified by user).  
**This increment:** 256 Node tests passed in the implementation environment; browser suite still requires verification.

## Why this increment exists

The seven migrated transformation families had shared stale-state and history-preparation safety, but each callback duplicated publication of the root, history and mathematical document. Numerical calculation also bypassed the registered proposal path. Different proposals expose different materialization stages.

## New boundaries

- `js/manipulator/transformationPublication.js`: `publishPreparedTransformation({state,staged})`. Receives an already-prepared root/history pair. Prepares a detached mathematical document using `updateDocumentRoot` before changing authoritative references. Then publishes the root/history and copies the prepared document fields into the existing document object (preserving document identity). Does not render or save.
- `js/composition/transformationFeatureAssembly.js`: registers `addition.combine-numeric` and `multiplication.combine-numeric` with immediate confirmation, a DOM-free gesture adapter, and semantic visual feedback. These call the existing detached `prepareNumericCombinationCommitCandidate`, so mathematical combination logic is not duplicated.
- `js/manipulator/numericCombinationGesture.js`: optional DOM-free request and feedback adapters. Browser hit-testing still belongs to the interaction layer.
- `js/manipulator/transformationCandidate.js`: `candidateStage` and `materializedRoot` distinguish eligibility-only plans from AST candidates. The distinction avoids eagerly cloning trees on every hover.
- `js/app.js`: all seven existing publication blocks delegate to the same function; numerical calculation obtains its proposal from the registry coordinator. Feature-specific labels, UI cleanup, previews and persistence scheduling remain in app.js for now.

## Guarantees and limitations

- Failed history preparation (existing `prepareAtomicTransformationCommit`) cannot publish an incomplete result.
- Failed mathematical document preparation now cannot change authoritative root/history/document.
- Publication is synchronous and does not await anything between root/history/document assignments. The plain-object assignment boundary is not a database transaction; exceptional setters, process crashes and persistence failures are outside its guarantee.
- The document object identity is preserved for workspace references. The underlying root and history are replaced with the staged values.
- Autosave failure is a durability problem: valid in-memory mathematics must not be rolled back.
- The mathematical engine continues to own validity; the student chooses the transformation. No mathematical rule or teaching policy was changed.
- Historical proposal shapes are still accepted; the accessor is a compatibility bridge, not a complete schema migration. Do not force all gestures into preview mode.
- Multiple windows and richer types/assumptions remain future work.

## Tests and browser handover

Run `node --test tests/*.test.js` (or `npm test` where npm is installed). Then `npm run test:e2e` with Playwright Chromium installed. The expected browser suite remains **34 tests**. In particular, verify numerical drag-to-combine, distribution, factorisation, grouping, equality, and document save/reload. Node tests exercise publication failure and registered numeric proposals; they cannot establish DOM or pointer correctness.

## Adding a new transformation

1. Implement a pure mathematical rule, with explicit assumptions and node-ID preservation.
2. Register its proposal and optional gesture/feedback/visual adapters in `transformationFeatureAssembly.js`.
3. Use the shared commit lifecycle and `prepareAtomicTransformationCommit`.
4. Publish with `publishPreparedTransformation`, then perform UI rendering and persistence separately.
5. Test mathematical correctness, cancellation, stale-state rejection, single-use confirmation, history failure and actual browser interaction.

Do not move mathematics into the gesture interpreter or let rendering decide rule validity. Keep explanatory comments and handover notes current.
