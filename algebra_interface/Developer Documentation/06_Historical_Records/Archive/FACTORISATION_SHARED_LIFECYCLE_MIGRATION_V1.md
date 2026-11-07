# Factorisation — Shared Commit Lifecycle Migration v1

## Purpose and scope

This increment migrates common-factor extraction to the shared source-stamped,
single-use confirmation gate and detached history preparation. It does **not**
change factorisation mathematics, extraction-zone geometry, the modal inline
preview, provenance arrows, teaching scope, or clipboard behaviour.

The student still selects matching end factors, previews extraction, and either
cancels or explicitly confirms. Student agency remains the product's governing
principle; the Engine checks the mathematics, not the user's strategy.

## Ownership and data flow

1. `factorisationGesture.js` builds an immutable DOM-free request from selected
   factors. `factorisationPolicy.js` separately enforces teaching scope.
2. The registered rule in `transformationFeatureAssembly.js` checks the plan
   and creates an independent candidate. `result.root` is now an alias of
   `result.proposal.root` for the shared commit gate; older visual adapters
   retain their `result.proposal` contract.
3. `app.js` opens `factorisationCommitLifecycle` with a stamp containing active
   document, object, history cursor, root ID and source AST fingerprint.
4. The existing `transformationPreview` owns the temporary DOM, factor fade,
   arrows, click-to-confirm and cancellation presentation.
5. Confirmation consumes the proposal exactly once, checks the stamp, and
   rechecks mathematical plan and teaching scope against authoritative state.
6. `prepareAtomicTransformationCommit` builds the candidate history on a
   detached clone. Only after successful preparation does `app.js` publish the
   new root/history pair and attempt workspace synchronization and autosave.

## Invariants

- No unconfirmed preview modifies the authoritative Mathematical Object.
- Cancelling or a stale source never appends history.
- A confirmed proposal cannot be confirmed again or reentrantly.
- Failed history preparation cannot partially update the live root/history.
- Existing residual operands and node identities are governed by the same
  factorisation Engine as before. Newly extracted factor IDs/provenance remain
  part of the candidate and history metadata.
- A failed autosave does not undo a valid in-memory mathematical commit;
  persistence durability is a separate concern.
- This is not a general transaction covering every workspace side effect.

## Verification

The Node suite now has 241 tests, including three focused factorisation commit
checks for detached preparation, stale/cancel safety and injected failure.
The Playwright suite has 31 tests, including a new end-to-end cancellation and
single-commit scenario. Node tests passed in this development environment;
Playwright requires browser execution before release signoff.

## Remaining work

Grouping, rearrangement and numerical combination have not been migrated.
The commit coordinator and the application still share some responsibilities;
do not expand this increment into a large framework rewrite. The folder
structure should continue to evolve only when ownership boundaries warrant it.

## Handover guidance

Read the source and tests rather than trusting older milestone notes. When
migrating another feature, first inspect whether its Engine mutates inputs,
then preserve its gesture and preview semantics while migrating only its
confirmation and history boundary. Use observable eligibility feedback in
browser tests instead of arbitrary pointer delays. Future vectors, matrices,
logical relations and multiple views must retain the same separation of
mathematical truth, interaction, and presentation.
