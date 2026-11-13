# Preview context-dismissal consolidation — 2026-11-10

## Verified implementation

`js/app.js` now defines one ordered `previewDismissals` inventory of six preview families (identity, factorisation, grouping, distribution, negation and equality). `dismissPreviewsForContextChange()` iterates the inventory instead of repeating independent cancellation calls. Each entry tests the current live feature/host state and delegates to the existing feature-specific cancellation adapter. The Preview Host remains the authoritative owner of modal leases and proposal lifecycles; this inventory is not a second state store.

If a cancellation adapter throws, the routine logs the error, continues attempting cleanup of other active previews, and rejects the context change. It also rejects the change if the mathematical interaction gate still reports a held modal lease. This preserves fail-closed navigation semantics.

## Boundaries deliberately preserved

Feature-specific presentation cleanup, selection preservation and status messaging remain in the existing adapters. The shared host continues to own single-use commit proposals and leases. Immediate transformations are not turned into modal previews. No mathematical engine, AST, history or document schema changes were made.

## Verification

- Node suite: 610/610 passed using `node scripts/run-node-tests.mjs`.
- Documentation links: 413/413 passed.
- JavaScript syntax: `node --check js/app.js` passed.
- Playwright: NOT run in this environment; user should run the full browser suite.

## Next architectural work

Audit Escape, pointer-away and other direct cancellation entry points for genuinely duplicated policy. Do not blindly route them through context dismissal: Escape cancels one active interaction, whereas a deliberate context change must release all relevant previews before changing the mathematical source. Only consolidate where behaviour and ownership truly match. Then measure change locality and consider retiring outdated migration documents after updating the authoritative architecture and handover.
