# Distribution preview migration — 576 Node tests

Date: 2026-11-10. This is an implementation record; `ARCHITECTURE_CURRENT.md` and `HANDOVER_CURRENT.md` remain authoritative.

## Behaviour and ownership

Distribution's amber overlay continues to display the **committed** AST and the proposed factor copies. The mathematical engine constructs a detached candidate AST before the modal preview opens. The shared `previewSessionHost` now owns the modal lease, source-stamped single-use proposal, confirmation and terminal cleanup. The feature's presentation adapter owns only `state.distributionPreview` and rendering of the amber overlay. The pointer drag remains non-modal.

The previous `distributionPreviewLease`, sequence counter, `distributionCommitLifecycle` and manual lease release function were deleted. History publication, provenance, animation and autosave still use the existing atomic commit path. On document/object or history switch, cancellation now goes through the host rather than manually resetting its independent pieces.

## Verification and limitations

576/576 Node tests pass, including three new distribution-shaped host contract tests. Documentation links: 406/406. These tests verify host confirmation, cancellation, stale-source rejection and cleanup, **not** the browser's hitboxes or animation. Playwright remains pending on this archive. The previous 573-test version was reported Playwright-passing by the user.

Before the next preview migration, manually verify: distribution both directions by drag and keyboard, amber overlay, clicking a copied factor, Escape and click-away cancellation, interaction lock, source invalidation, provenance animation and history/undo. Pay particular attention to the fact that host cleanup rerenders the source view before the committed view is rendered.

## Remaining preview work

Grouping, factorisation and equality still have feature-specific preview leases/lifecycles. Do not delete those paths until each has been migrated and verified. Avoid expanding the host's responsibilities to include rule-specific geometry or mathematical validity.
