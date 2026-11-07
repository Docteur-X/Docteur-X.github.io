# Test Reliability and Correctness Audit v1

**Status (2026-11-05):** Test-only changes implemented. The existing Node suite passes **172/172**. The mutation probe detected a deliberately incorrect distribution ordering. The expanded Chromium suite has **not** yet been executed in this environment. The prior seven browser tests passed on the project owner's computer before these changes.

## Why this audit was necessary

The original `expectOneCommit()` checked only that the history grew and the displayed MathJSON changed. A wrong-but-different result could satisfy both conditions. A browser test must assert the exact mathematical outcome as well as the gesture/preview/commit lifecycle. Source-inspection tests are retained as temporary architectural guards, not as substitutes for browser behaviour.

## Implemented checks

- `e2e/support/mathAssertions.js` now exposes `expectMathJSON(window, expected)`, comparing parsed MathJSON structures with retry. This tests mathematical operator nesting and operand order, not typography.
- Identity insertion: exact additive identity placement `['Add','a',0,'b']`.
- Distribution: exact `ab+ac` structure, plus an equation-root test that preserves the right-hand side.
- Factorisation: exact `a(b+c)` structure.
- Rearrangement: exact `b+a+c` order, alongside its existing transient-preview and single-commit assertions.
- Grouping: exact nested `Add` and explicit bracket glyphs; new Escape-cancellation test ensures no mathematical commit.
- Document persistence: reload, reopen the saved document, compare mathematical structure and history count. This checks saved data rather than assuming the application auto-opens documents after reload.
- `scripts/mutation-probe.js` makes a temporary copy, reverses left-distribution factor order, and requires the existing distribution unit tests to fail. It never edits the working source tree.

## Commands

```sh
npm ci
npx playwright install chromium
npm test
npm run test:mutation
npm run test:e2e
```

If the supplied lockfile has not been regenerated on a networked machine, first run `npm install --package-lock-only` and then `npm ci`.

## What these tests do NOT prove

- MathJSON deliberately omits explicit `Group` node identities and bracket styles. Use the DOM bracket assertion and existing internal-AST unit tests for those properties.
- A passing `historyCount + 1` check alone does not prove the event has the correct rule metadata or provenance. Unit tests cover selected provenance contracts; future browser tests should inspect a stable read-only event interface if that becomes public.
- A settled rearrangement preview and correct final AST do not yet prove that no extra post-drop animation ran. Add a targeted animation-event/bounding-box test after examining the current animation scheduler, without imposing pixel-perfect timing assumptions.
- Browser coverage is not exhaustive: other equation sides, multi-object switching, import/export round trips, keyboard access, accessibility and cross-browser rendering remain future work.
- One deliberately killed mutation is evidence for a specific unit-test oracle, **not** a general mutation score.

## Contribution standards

1. Test the exact mathematical result and relevant operand order, not merely a changed tree.
2. Verify the pre-commit AST remains unchanged for deliberate previews and cancellations.
3. Verify history effects separately from visual state; one committed action should create one event.
4. For visual semantics, test stable roles, explicit brackets, hover classes and settled states, not whole-page screenshots or arbitrary sleeps.
5. Keep the Engine independent of browser code. Never weaken an assertion merely to make a test green; investigate actual AST serialization and UI behaviour first.
6. Update this document and `CURRENT_STATUS.md` after the first full Chromium run, including any corrections to new scenarios.
