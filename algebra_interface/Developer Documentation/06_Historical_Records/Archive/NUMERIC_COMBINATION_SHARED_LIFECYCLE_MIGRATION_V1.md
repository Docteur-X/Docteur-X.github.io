# Numerical Combination — Shared Lifecycle Migration v1

## Purpose and student agency

Students choose when to combine two eligible sibling addends or factors. The
software validates the algebra and records exactly one committed step. This
migration does not introduce automatic simplification, new mathematics, or a
new gesture. Green hover feedback remains transient; dropping is the immediate
confirmation, unlike the deliberate amber previews of distribution.

## Information flow

1. The existing pointer interpreter identifies a sibling combination target.
2. The existing `canCombineAddends` / `canCombineFactors` rules establish green
   hover eligibility. No AST changes during hover.
3. On drop, `commitDraggedCombination` rechecks the source parent, source
   position and eligibility.
4. `prepareNumericCombinationCommitCandidate` clones the authoritative root,
   locates the source and target by stable node IDs, removes the moving child
   from **the clone**, and applies the existing arithmetic operation there.
   It normalizes only the detached candidate.
5. `numericCombinationCommitLifecycle` stamps the current document, object,
   history revision, root identity and AST fingerprint. Confirmation is
   synchronous, stale-safe, single-use and non-reentrant.
6. `prepareAtomicTransformationCommit` builds a new history graph and result
   root on detached data. Only after success are the root and history
   published together. Autosave is a separate best-effort durability step.
7. The existing renderer displays the committed result; pointer feedback is
   cleaned up through the existing drag controller.

## Correctness and identity

- Literal zero and one follow the existing identity rules; a substituted
  variable is not mistaken for a literal zero or one.
- Numerical addition/multiplication uses the existing evaluator and preserves
  its finite-number checks and precision policy.
- Zero multiplication can collapse the **whole product**, not merely the two
  touched factors.
- Surviving symbolic occurrences retain their IDs. Newly calculated numeric
  values receive new IDs. The normalization layer retains the application's
  root-Add invariant.
- Invalid, stale or failed candidates cannot partially edit the live tree.
- No automatic rearrangement or cross-parent combination is introduced.

## Verification and limitations

Node tests cover both operation types, source immutability, zero multiplication,
identity preservation, stale rejection, cancellation, duplicate confirmation,
and injected history preparation failure. Browser tests exercise the existing
pointer path and verify no commit during hover and one commit on drop.

This is **not** a generalized numeric evaluation engine or a full transaction
across IndexedDB. It does not change matrix/typed algebra assumptions, nor
factorisation, grouping, rearrangement or equality previews. Future typed
operations should continue to enforce their mathematical requirements inside
operation modules rather than in the pointer controller.

## Handover

Relevant files: `js/manipulator/numericCombinationCommitCandidate.js`,
`js/manipulator/transformationCommitLifecycle.js`,
`js/manipulator/atomicTransformationCommit.js`, `js/app.js`,
`tests/numeric-combination-shared-lifecycle.test.js`, and
`e2e/numeric-combination-shared-lifecycle.spec.js`.

Keep mathematical rules DOM-free, keep preview state separate from committed
mathematical objects, and do not remove the dragged source from the live tree
before atomic preparation succeeds. Do not add heavy cloning to pointermove.
