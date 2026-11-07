# Architectural Consolidation v2 — Shared proposal/commit gate

## Status and scope

This is a **bounded first migration**, not a rewrite or a claim that every
transformation now shares a complete lifecycle. Equality function application
is the first integrated feature. Distribution, grouping, factorisation,
identity insertion, and rearrangement retain their existing specialized
preview/commit paths for now. Their educational visuals are deliberately not
forced into one animation or confirmation model.

## Why this exists

Before v2, `app.js` maintained `equalityCandidate` and manually compared five
pieces of authoritative state during confirmation. Other features implemented
similar, slightly different stale-state guards. Repeating those guards in each
feature makes future errors likely, especially with multiple Mathematical
Objects and eventually multiple views of the same object.

`js/manipulator/transformationCommitLifecycle.js` now implements the reusable,
DOM-free **single-use gate**. It does not know algebra, pointers, IndexedDB,
CSS, or which feature is calling it. A pending proposal is a candidate, not a
committed Mathematical Object.

## Exact data flow

1. A student arms the equality and selects a session clipboard operand.
2. The equality gesture adapter constructs a DOM-free intention.
3. The registered Transformation Coordinator asks the pure equality Engine for
   a proposed AST and returns semantic preview information.
4. `app.js` opens the commit gate with that candidate and a source stamp:
   document ID, Mathematical Object ID, history cursor, root node ID, and
   serialized source AST fingerprint. The UI controller owns the inline amber
   preview, but neither it nor the gate writes mathematical history.
5. Confirm calls the gate with a **fresh** source stamp. The gate rejects stale
   proposals and consumes the pending proposal *before* invoking the commit
   callback, preventing reentrant/double confirmations.
6. The application callback updates the authoritative mathematical state and
   records the same rule/provenance/history metadata as before. The existing
   UI controller then cleans up its temporary DOM; application rendering
   displays the committed state. Cancel only discards the pending candidate.

## Invariants and tests

- A preview never changes the Mathematical Object or its history.
- A proposal cannot commit if the document, object, history cursor, root ID,
  or source AST has changed. A cursor check alone is not sufficient.
- Confirmation is single-use. Cancellation and unrelated rerenders invalidate
  the gate and remove transient presentation through the existing UI controller.
- The two clipboard-derived occurrences have distinct IDs; original side IDs
  and provenance are preserved by the existing Engine, not by the gate.
- The gate never selects a transformation, evaluates mathematical validity,
  changes DOM, or writes persistence.
- New Node tests cover successful single-use commit, all five stale-state
  dimensions, cancellation, defensive source stamp capture and exceptions.
- The existing Playwright equality tests must be run to verify real pointer,
  preview, confirmation and history behaviour. This release does **not** claim
  browser verification until those tests have passed on a browser.

## Important limitation: commit atomicity

The gate guarantees **at most one invocation** of the commit callback. It
cannot by itself guarantee transactional atomicity of an arbitrary callback
that mutates in-memory mathematical state and then writes history or storage.
That remains the responsibility of the Mathematical Object/document history
integration. A future increment should define a single authoritative commit
API with rollback/transaction semantics before migrating all features. Do not
misrepresent this gate as an IndexedDB transaction or as a proof of atomicity.

## How to extend

Migrate one existing transformation at a time. Keep its mathematical Engine,
gesture adapter and visualizer unchanged. Capture a source stamp when opening
its proposal; use the same gate for confirm/cancel; ensure all rerender and
navigation paths invalidate pending proposals. Verify stale state, cancellation,
exactly one history event and preservation of mathematical identities in both
Node and browser tests. Only then remove that feature's old duplicate lifecycle.

## Longer-term architectural requirements

Keep student agency central: students choose mathematical transformations;
mathematical rules establish validity, and history preserves reasoning. The
core must remain independent of gestures, DOM and teaching-policy presentation.
Plan for logical relations, inequalities, matrices and noncommutative contexts,
explicit assumptions and domains, multiple views of one authoritative object,
low-resource devices, and accessible interaction alternatives. The commit gate
must remain presentation-independent and not assume one global window.

## Handover / verification

Run `npm test` and `npm run test:e2e` after installing dependencies. This
increment added three Node tests; expected Node total is 226, with 28 existing
Playwright tests. If a browser test fails, inspect console errors and the
rendered mathematical DOM before changing mathematical rules. The prior stable
baseline is Architectural Consolidation v1.2.

## v2.1 follow-up

See `ARCHITECTURAL_CONSOLIDATION_V2_1_ATOMIC_COMMIT.md` for the detached
history preparation and failure-injection tests added after the v2 audit.
The equality callback no longer assigns the live root before building history.
