# Preview consolidation — first phase: behavioural safety baseline

Status: implemented tests, **no production preview-host migration yet**. Date: 2026-11-10.

## Why this phase starts with tests

A universal preview host must not be built by assuming the existing feature-specific lifecycles behave identically. The existing `modalPreviewOwnership.js` grants view-local exclusive leases, while `transformationCommitLifecycle.js` separately guards single-use mathematical proposals. The former has no candidate/commit authority; the latter has no cross-feature exclusion. Feature-specific UI and cleanup still live in `app.js` and the preview modules.

## New executable characterization

`tests/previewOwnershipMatrix.test.js` adds six scenarios using both existing contracts together: cross-family exclusion; single-use confirmation; idempotent cancellation; stale document/object/revision/root/fingerprint; invalidation and stale leases; thrown commit callbacks. The tests cover the **contract pair**, not actual DOM preview or the correctness of all feature integrations. They deliberately document the cleanup gap: after a commit callback throws, the commit gate is consumed but the modal lease remains owned until the caller releases it.

## Observed architecture and constraints

- Preserve view-local ownership: one modal preview per view, independent views may preview independently.
- Preserve mathematical-object authority: previews must not write committed AST/history until confirmation.
- Preserve candidate single-use semantics and fresh source validation on confirmation.
- Feature-specific mathematical rules must remain outside the preview host.
- Modal ownership invalidation is not currently sufficient to close the feature-specific gate or remove its UI. Cleanup must be coordinated before a unified host can claim to own the entire lifecycle.
- A future host should own lease acquisition, candidate gate, UI teardown orchestration and terminal cleanup, but should not duplicate the authoritative AST/history store.
- Browser testing must characterize confirm, cancel, Escape, click-away, object switch, stale DOM and concurrent gestures for each feature family. Node tests cannot prove these behaviours.

## Proposed next vertical slice (requires implementation and browser verification)

1. Agree on a minimal view-local preview session API and its terminal states; decide whether confirmation exceptions propagate or return structured failures.
2. Migrate **one** feature (prefer negation) through a host that composes existing ownership and commit contracts, preserving its existing UI.
3. Add behavioural tests proving cleanup on confirm, cancel, stale source, thrown callback and invalidation, including reentrant actions.
4. Run Playwright and compare existing negation behaviour; only then delete the old negation-specific lifecycle wiring.
5. Migrate remaining feature families one by one. Do not delete historical documentation until its rationale has been incorporated into authoritative documents.

## Verification

`node scripts/run-node-tests.mjs`: 562/562 passed (previous baseline 556; six new tests). `node scripts/check-documentation-links.mjs`: 406/406 passed. Browser tests are **not run here**; the user previously reported the 556-test baseline passed Playwright.
