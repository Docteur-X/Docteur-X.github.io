# Equality-preview rerender cancellation consolidation — 2026-11-10

## Source-verified change

`renderApplication()` no longer explicitly calls `cancelEqualityApplication()` before `renderEquation()`. The latter synchronously calls `prepareEquationPresentationRerender()` **before** capturing geometry, building detached DOM, or publishing semantic targets; that routine already cancels open equality previews. Thus the cancellation still precedes equation publication and the surrounding panel updates. Direct callers of `renderEquation()` continue to use exactly the same policy. This removes a duplicate caller-specific check, not a preview-host responsibility.

The separate `dismissPreviewsForContextChange()` protocol is unchanged; distribution previews are still deliberately excluded from presentation-rerender cancellation. No AST, mathematical rules, history, node IDs, or preview lease contracts were changed.

## Verification

- `node scripts/run-node-tests.mjs`: **619/619 pass** after the change.
- Browser tests: **not run** in this environment (`npx`/Playwright unavailable). In particular, rerun `e2e/equality-function-application.spec.js`, `e2e/preview-dismissal.spec.js`, `e2e/phase4d-equality-lease.spec.js`, and `e2e/phase5d2-rerender-transitions.spec.js` before treating browser behaviour as verified.

## Next architectural step

Review the remaining `renderEquation()` call sites and verify that presentation-only rerenders do not accidentally trigger mathematical context-change policy. Do not introduce forwarding wrappers or change preview cancellation order without targeted browser evidence.
