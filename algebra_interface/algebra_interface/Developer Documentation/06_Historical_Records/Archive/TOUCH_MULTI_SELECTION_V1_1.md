# Touch Multi-Selection v1.1 — Browser regression correction

## Diagnosis
The v1 Playwright test tapped `#selectionLabel` and expected the selection to clear. This label belongs to `.group-toolbar`, which is intentionally excluded from outside-tap clearing so students can interact with selection-based controls without losing their selection. The test expectation was incorrect; the production selection handler did not need modification.

## Changes
- The browser test now checks that tapping the selection label preserves multi-selection, then taps a genuinely blank area of `.equation-panel` to verify clearing and mode exit. It also checks that neither interaction creates a history commit.
- Playwright no longer reuses a server already listening on port 8000. This avoids silently testing an older extracted project. If the port is occupied, stop the other server before running the tests.
- No production UI, mathematical engine, history, or persistence logic changed.

## Verification
- Node suite: 202/202 passing using `node --test tests/*.test.js`.
- Mutation probe: incorrect factor ordering detected.
- Playwright suite: not run in this environment (npm/Playwright unavailable); run `npm run test:e2e` on a machine with dependencies installed.

## Contract
Tapping a mathematical term toggles it in multi-selection mode. Tapping genuine empty workspace clears selection and exits the mode. Interacting with the selection toolbar preserves selection so its controls remain usable. Neither action commits mathematical history.
