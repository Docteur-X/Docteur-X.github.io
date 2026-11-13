# Preview cleanup failure contract — 628-test increment

## Scope and evidence

Starting point: `Manipulator_Factorisation_Provenance_From_Identity_Fix_625.zip`. The user reported that the full browser suite passed on that release; this increment has **not** been browser-tested locally.

Reviewed `js/interaction/previewSessionHost.js`, `js/interaction/modalPreviewOwnership.js`, and existing host tests. The shared host owns the candidate lifecycle and modal lease, while feature presentation adapters own visual cleanup. A failure in `presentation.show` or `onShown` must cancel the candidate; `cancel()` must release its lease even if `presentation.clear` throws; disposed ownership must reject new sessions.

## Changes

Three Node tests added to `tests/previewSessionHost.test.js`: post-show callback failure cleanup, explicit cancellation with failing cleanup, and post-disposal open rejection. No production code or browser tests changed. All 628 Node tests passed in a fresh local run.

## Architecture decision

No new generic cleanup coordinator. The existing host's `finally` lease release and single-use candidate lifecycle already satisfy these cases. Feature-specific presentation adapters continue to own their DOM. Do not move DOM cleanup or mathematical rule decisions into the ownership registry.

## Follow-up

Audit feature-specific context-switch and teardown adapters for callbacks that bypass the shared host; add targeted regressions only for demonstrated gaps. Run the full Playwright suite on the updated archive to confirm no packaging regressions.
