# Phase 4B — View-local modal preview ownership contract

**Date:** 2026-11-07  
**Status:** Implemented as an isolated, DOM-free contract; not wired into live preview entry points.  
**Baseline:** Phase 4A corrected grouping Escape characterization, 371 Node tests; project owner reports 62 browser tests passed.

## Responsibility and boundary

`js/interaction/modalPreviewOwnership.js` exports `createModalPreviewOwnership(viewId)`.
One instance belongs to **one rendered mathematical view**. It holds a single exclusive lease for an incompatible modal mathematical preview. It does not own ASTs, candidates, mathematical eligibility, DOM elements, focus, confirmation buttons, history, persistence, or transformation publication.

The existing `transformationCommitLifecycle` remains the only single-use mathematical proposal/confirmation gate. The new lease cannot authorize a commit; successful arbitration and lease acquisition do not imply mathematical validity.

## Contract

- `acquire({viewId, owner, documentId, objectId, sessionToken})` returns `{status:'acquired',lease}` or `{status:'invalid'|'occupied'|'disposed'}`. Failure never displaces an active lease. Only declared primitive identity fields are copied into a frozen lease.
- `owns(lease)` checks the exact live lease identity; `active()` returns its frozen identity or `null`.
- `release(lease)` succeeds only for the live lease; repeated or stale release is harmless. Lease IDs are monotonically increasing within the view so an old callback cannot release a new acquisition with the same owner/session.
- `invalidate()` clears ownership on rerender/object switch. The feature remains responsible for visual cleanup and cancellation of its mathematical proposal.
- `dispose()` invalidates and permanently closes the view-local registry. Late callbacks cannot acquire a lease after view teardown.
- No global registry or DOM singleton exists. Two views can independently hold leases, even if they display the same Mathematical Object.

## Deliberate exclusions

- No live gesture or preview integration in Phase 4B; Phase 4C must acquire only after a validated candidate exists, and release on **every** exit path, including thrown commit callbacks, Escape, stale state, object switch and teardown.
- No feature-specific rendering, focus restoration, selection clearing, compatibility inference, or mathematical revalidation.
- This first contract is **exclusive for modal previews only**. Non-modal rearrangement animations and hover feedback are outside its scope. Do not infer that every visual effect is mutually exclusive.
- Lease identities are lifecycle tokens, not security credentials; they prevent accidental stale-callback release in the application's trusted code, not malicious JavaScript with access to the registry.
- An explicit compatibility policy beyond one incompatible modal preview per view requires source and browser evidence before being introduced. Phase 4A's unverified preview pairs remain unverified.

## Migration protocol for Phase 4C

1. Choose one source-confirmed modal family; retain its current mathematical candidate, preview renderer and commit lifecycle.
2. Acquire a lease immediately before opening the preview, and refuse the new preview without disturbing an existing owner when acquisition fails.
3. Retain the returned lease in the feature's existing session state; do not reconstruct it from current DOM.
4. Release it on cancellation, confirmation (success or failure), exceptions, rerender and disposal. Use `try/finally` where appropriate. Ensure visual cleanup is feature-owned.
5. Add tests for competing owners in both directions, stale callbacks, repeated Escape/confirm, exactly-once history publication and preserved educational presentation.
6. Remove old feature-specific exclusivity gates only after verified parity and full caller review.

## Verification

Six new Node tests in `tests/phase4b-modal-preview-ownership.test.js`. Full Node suite: **377/377 passed**. Production preview handlers unchanged, so the Phase 4A browser-verified baseline is not intentionally affected; Phase 4B archive still requires its own browser verification. No claim is made that browser modal-conflict scenarios have already been tested.
