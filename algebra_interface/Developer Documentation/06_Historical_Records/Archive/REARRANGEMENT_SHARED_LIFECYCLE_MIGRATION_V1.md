# Rearrangement — Shared Lifecycle Migration v1

## Purpose and scope

Pointer and keyboard rearrangement now share the same source-stamped, single-use commit gate and detached history preparation as equality application, identity insertion, distribution, factorisation and grouping. No new algebraic rule or gesture is introduced. The established pointer preview is **continuous and nonmodal**, and the pointer-drop render still suppresses the second FLIP animation. Keyboard arrows still commit immediately and retain their existing focus restoration.

## Information flow

1. The gesture adapter creates a DOM-free rearrangement request identifying parent, dragged child and destination index.
2. The registered mathematical proposal checks operation-specific commutativity and supplies a *visual order*, without mutating the authoritative tree. This is safe to invoke repeatedly during dragging.
3. On an eligible, changed pointer drop or keyboard action, `prepareRearrangementCommitCandidate` clones the tree, applies the mathematical rearrangement to the clone and optionally runs the existing pointer-only normalization policy.
4. `commitRearrangementCandidate` opens and immediately consumes `createTransformationCommitLifecycle` using the current document/object/history/AST source stamp. Rearrangement is immediate; it does **not** acquire an unnecessary modal confirmation.
5. `prepareAtomicTransformationCommit` builds the new history branch on detached data. Only then does the application publish the root/history pair synchronously, synchronize the Mathematical Document, attempt persistence and update presentation.

## Invariants

- Pointer hover, animation and no-op insertion never mutate the authoritative mathematical AST or create history.
- Only operation-specific Engine rules decide whether reordering is legal; matrix and other noncommutative types must not inherit scalar commutativity assumptions.
- Existing operand and parent IDs are preserved by rearrangement. The source tree is never modified during candidate construction.
- A failed history append leaves the live root and history unchanged. An autosave failure after a valid in-memory commit is reported without discarding mathematics.
- A source stamp prevents stale confirmation and the single-use gate rejects repeated or reentrant commits.
- Pointer and keyboard routes share the commit mechanism but retain distinct animation/focus behaviour.

## Tests and handover

`tests/rearrangement-shared-lifecycle.test.js` covers both Add and Multiply, detached candidate construction, stale-state rejection, single-use confirmation and no-op cancellation. `e2e/rearrangement-shared-lifecycle.spec.js` covers keyboard history and identity; the existing `e2e/rearrangement.spec.js` covers the continuous pointer preview and exactly-one commit. Run `npm test` and `npm run test:e2e` in a browser-enabled environment.

Do not move pointer-hover candidate construction into the atomic history helper: the expensive detached clone belongs at the drop/keyboard commit boundary only. This distinction matters for responsiveness on low-end student computers. Do not make rearrangement depend on an active DOM element or a single global window when future multi-view contexts are introduced.

The teaching principle remains: the student chooses the action, the Engine enforces mathematical rules, and the application records the chosen reasoning path.
