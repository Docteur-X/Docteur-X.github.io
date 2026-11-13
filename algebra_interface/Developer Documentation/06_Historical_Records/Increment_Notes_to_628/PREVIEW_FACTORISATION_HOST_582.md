# Factorisation preview migration — 582-test increment

## Scope and evidence

The factorisation confirmation preview now uses `createPreviewSessionHost` in `js/app.js`. The mathematical factorisation coordinator, teaching-scope policy, provenance, atomic history publication, selection and amber explanatory candidate remain feature-owned. The existing `transformationPreview` renderer still manages candidate DOM and arrows. No new production module was added.

Node suite: 582/582 passed. Documentation links: 406/406 valid. Browser/Playwright verification for this increment is pending; the user reported all tests passing on the preceding 579-test grouping version.

## Ownership and cleanup

The shared host acquires/releases the modal lease, owns the single-use proposal gate and rejects stale sources and revoked leases. The factorisation presentation adapter chooses `transformationPreview.finish()` after a successful atomic publication or `transformationPreview.cancel()` otherwise. Its `finally` resets feature UI state and selection paint. The feature-specific lease, sequence counter and commit lifecycle were deleted. Non-modal selection and extraction-zone drag remain unchanged.

A successful commit must discard saved candidate DOM rather than restoring the old DOM; cancellation and stale confirmation must restore the old DOM. The new contract tests exercise these three terminal paths using a headless presentation adapter. The real DOM and animation must be verified with Playwright.

## Equality preview audit (not migrated)

Equality currently owns `equalityPreviewLease`, `equalityPreviewSequence`, `equalityCommitLifecycle` and its own `equalityUI` presentation. It acquires ownership in `openEqualityApplication`, and releases it in `cancelEqualityApplication`; confirmation is handled by `confirmEqualityApplication`. A migration should retain clipboard operand snapshots, equation arming, accessible confirmation, independent mathematical eligibility, atomic history publication, and source-stamp validation. It should remove the duplicate lease and commit gate rather than wrap them.

## Browser acceptance checklist

- Factorisation both directions: open, confirm once, history and provenance correct.
- Escape and click-away: original expression and stable node IDs restored; selection preserved.
- Stale source, object switching, and competing preview: no stale commit or stranded modal lease.
- Candidate animation and arrow presentation remain correct; keyboard focus and confirmation work.
- Negation, identity, distribution, grouping and equality regression flows remain unchanged.

## Known follow-up

The shared host's commit callback can publish the mathematical state before later presentation cleanup fails. UI error reporting must not imply the mathematical commit was rolled back. This cross-feature edge case should be addressed in a later host contract refinement, with explicit tests for commit success plus cleanup failure. Do not conflate post-commit rendering or persistence failures with mathematical failure.
