# Preview Host lease and error hardening — 570-test increment

Date: 2026-11-10. Production change: `js/interaction/previewSessionHost.js`; tests: `tests/previewSessionHost.test.js`.

## Why this change matters

A mathematical source stamp is not sufficient to authorise confirmation: a view can be invalidated or disposed while its mathematical AST remains unchanged. The Preview Host must require both a fresh mathematical source and a still-owned modal lease. Confirmation now returns `{ status: 'invalidated' }` without invoking the commit callback if ownership was revoked. It consumes and clears the candidate.

The host also preserves the original commit exception if presentation cleanup independently fails, logging the secondary cleanup error while always releasing its lease. A cleanup failure without a primary error is still propagated, so presentation bugs remain visible. These are deliberately host-level guarantees, shared by all future migrated features.

## Verification

570/570 Node tests passed (three new regression tests). The user reports Playwright passing for the preceding 567-test archive; Playwright for this increment remains pending. No new preview family is migrated in this increment. Mathematical rules, history and negation visuals are unchanged.

## Next step

Migrate a second complete modal preview family (consider identity or distribution) only after tracing its existing state, presentation and cleanup paths. Preserve the original visuals and atomic history commit. Remove feature-owned lease/lifecycle state once the host owns it, and add browser tests for confirm, cancel, stale source, revoked ownership and cleanup. Avoid introducing a second state store. Do not delete historical documentation before consolidating its important design decisions.
