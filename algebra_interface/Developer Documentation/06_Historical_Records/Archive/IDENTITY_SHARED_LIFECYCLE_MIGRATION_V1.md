# Identity insertion — shared transformation lifecycle migration

## Status and scope

This increment migrates **identity introduction (+0 and ×1)** to the same DOM-free, single-use proposal/commit gate and detached history preparation used by equality function application. It does not migrate distribution, factorisation, grouping, rearrangement or numeric combination. It does not change the mathematical identity rules, gestures, amber preview renderer, teaching policy, node allocation, or persistence format.

## Student agency and mathematical invariants

The student chooses to introduce an identity by dragging a toolbar item to a mathematical target. The Gesture Interpreter produces a node-ID request; the registered mathematical rule decides eligibility and proposes a candidate. No mathematical state changes during hovering or preview. The student may confirm or cancel. The new zero/one has its own ID and existing occurrences retain their IDs. The mathematical history records exactly one accepted transformation.

## Data and control flow

1. `identityGesture.js` resolves the target and builds a DOM-free request. The transformation coordinator proposes the candidate from the authoritative AST.
2. On drop, `identityCommitLifecycle.open(identityProposal, transformationSourceStamp())` records the candidate and a stamp of document ID, object ID, history cursor, root ID and complete AST fingerprint.
3. The existing identity visual adapter displays the proposal without mutating the mathematical object. Escape, click-away and explicit Cancel discard the pending gate and temporary DOM.
4. Confirmation calls `identityCommitLifecycle.confirm(...)`. It consumes the proposal before invoking the callback, rejecting stale or repeated confirmations.
5. `prepareAtomicTransformationCommit()` builds a detached root and history branch, including identity rule metadata, before publication. If history preparation throws, live expression/history remain untouched.
6. The application publishes the prepared root and history synchronously, synchronizes the active object and requests persistence. A subsequent save failure is a durability concern and does not invalidate the in-memory mathematical step.
7. The existing renderer and identity preview are retained. No new preview CSS or gesture behaviour is introduced.

## Boundaries and known limitations

- The gate and detached history preparation are shared; the **actual commit callback** and UI cleanup still live in `app.js`. This is an incremental migration, not the full unified transformation coordinator.
- `state.mathematicalDocument` and active-object synchronization occur after detached preparation. As with equality application, this is not a general database transaction across all workspace components. Future work should define a wider publish boundary if required.
- Browser rendering, touch gestures, preview geometry and IndexedDB behaviour require Playwright verification in addition to Node tests. No new mathematical rules are introduced.
- The current application has one active mathematical view. Future multi-window controllers must use object/revision-aware stamps and avoid coupling the mathematical engine to DOM or focus.
- Do not turn autosave failures into silent rollback: preserve valid mathematical work in memory and inform the user that export is advisable.

## Verification and handover

Run `npm test` and `npm run test:e2e`. The new `identity-shared-commit-lifecycle.test.js` tests both identity operations, detached preparation, stale cancellation, and injected history failures. The new browser test verifies that preview is uncommitted and confirmation creates one history entry. Existing identity browser tests still cover pointer movement, cancellation and node layout. Keep the last browser-verified v2.1 archive as the rollback baseline until all browser tests pass.

## Future migration checklist

For the next transformation family, preserve its mathematical rule and visual semantics. Capture an immutable, source-stamped proposal; use the shared single-use gate and detached history preparation; test stale/duplicate/cancel/failure paths; verify browser gesture and preview behaviour; update documentation. Avoid broad folder moves or changes to unrelated rules while migrating.
