# Escape event-phase contract — 628-test baseline

Status: **source audit, no production change** (2026-11-11). The user reports that the full browser suite, including `e2e/escape-single-action-boundary.spec.js`, passed on the preceding release. This is user-reported browser evidence, not a local browser run.

## Verified from source

- `equalityInteractionController.js` registers a **capture-phase document** `keydown` listener. While its preview is active, Escape calls the feature's `onCancel`. It does not stop propagation.
- `app.js` registers a **bubble-phase document** Escape listener for negation. It cancels an active negation preview and reports status; it does not stop propagation.
- `app.js` registers a **bubble-phase window** Escape listener with an ordered `if/else if` chain for identity, factorisation, factor drag, grouping, ordinary drag, distribution and non-modal multi-selection. It does not directly branch on equality or negation preview state.
- `structureNavigator.js` uses a capture-phase document listener, but only for Alt+arrow navigation; it is not an Escape owner.
- `previewConfirmationTargets.js` responds to Enter/Space, not Escape.
- `previewDismissals` in `app.js` is the separate, six-family **context-change** inventory; it attempts all active preview dismissals and checks modal leases before changing source. It must not be substituted for one-action Escape semantics.

## Interpretation and remaining risk

The passing negation regression establishes that its particular selection/preview interaction did not double-cancel in the user's browser. It does **not** establish the same for every combination of equality preview, non-modal selection and keyboard focus. Event phases alone do not prove a defect: cancellation may update the state observed by later listeners.

Do not consolidate listeners merely because they exist at different phases. A justified change requires a reproducible multi-action Escape failure, a stated priority contract, and tests for both the preview and retained non-modal state. Keep the preview host authoritative for modal leases; feature adapters continue to own visual teardown.

## Next investigation

Characterise Escape with equality preview and retained selection, if that combination is reachable through the UI. First inspect whether equality preview creation intentionally clears selection. If so, do not construct an impossible test setup or demand selection retention contrary to the interaction contract. Audit document/window listener disposal on view teardown before introducing shared keyboard dispatch.

## Verification

Production unchanged in this increment. Run `node scripts/run-node-tests.mjs`, `node scripts/check-documentation-links.mjs` and `npx playwright test` for a new release. The previous full Playwright suite passed according to the user.
