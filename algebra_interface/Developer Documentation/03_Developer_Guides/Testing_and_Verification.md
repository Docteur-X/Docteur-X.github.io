# Testing and verification

`npm test` runs all Node tests, discovered recursively under `tests/`; `npm run test:e2e` runs Playwright Chromium (`e2e/`). Current counts live only in [Status](../00_Current/Status.md). Tests are grouped like the code: `tests/engine/`, `tests/rules/<bundle>/`, `tests/view/` and so on, and `e2e/` the same way.

**A passing test may not reach its scenario.** T4-2 and T4-3 found tests that could not fail for the behaviour they named. For a new safety behaviour, break it deliberately once and confirm a test fails, then restore it.

Separate evidence: pure mathematical correctness; commit lifecycle/serialization; actual browser rendering and gestures; manual educational usability. Passing Node tests cannot prove DOM mounting (a previous refactor accidentally omitted it). Browser tests should wait for observable eligibility classes/states before pointer release, not arbitrary sleep durations.

Test invalid/unknown mathematical conditions, stale revisions, duplicate confirmation, preview cancellation, history branching and import failure. Check keyboard/touch and small viewports where relevant. Keep the tests independent of the historical documentation folder layout. Performance benchmarks on older hardware are future work.

## Visual safety net for stylesheet work

`visual/states.spec.js` photographs each preview and feedback state in both themes and both hitbox modes, plus some whole pages, and compares them with a baseline. It answers one question: did this CSS change alter anything visible? It is separate from `npm run test:e2e` and says nothing about whether the mathematics is right.

Baselines depend on the machine's fonts and browser, so they stay local (`visual/baseline/`, ignored and not packaged). Generate them from a known-good version **before** changing any CSS, because a baseline taken afterwards would approve the change:

```bash
npm run test:visual:baseline
```

```bash
npm run test:visual
```

**Measured sensitivity** (`threshold: 0.08`, the lowest tried value with no false alarms; 0.04 and below flagged 17–33 images on unchanged code):

| Deliberate change | Result |
|---|---|
| Unchanged code, 3 runs | All pass |
| Amber outline dashed to dotted | Caught |
| Minus hitbox width | Caught |
| Eligible-green outline darkened 2%, 5%, 10% | **Missed** |
| Eligible-green outline darkened 20%, 40% | Caught |
| Removing a rule that another rule overrides | Passes, correctly |

So it is suited to catching a rule that stops winning, a lost style or moved layout. It cannot prove that a shade is exact. It covers only the listed states: add one with each new preview or feedback role. To find gaps, Playwright's `page.coverage.startCSSCoverage()` lists the rules that no state exercised.

### Exact check with computed styles

The same states can instead record what the browser finally decided for every property of every element. This has no edge noise, so it needs no tolerance: a one-digit colour change in a token was caught, while the screenshots miss a 10% change. Identical code captured twice gives zero differences across millions of values. Captures are large, so keep them outside the project.

```bash
npm run test:visual:capture -- ../capture-before
```

Change the CSS, capture to a second folder, then compare. Differences are grouped by property, old value and new value:

```bash
npm run test:visual:capture -- ../capture-after
```

```bash
npm run test:visual:compare -- ../capture-before ../capture-after
```

A second argument after the folder sets the page width, for narrow-screen rules (640 and 390 were used for the file split). At 390 the eight compression states fail during setup, on the original stylesheet too, so they are not covered at that width; the cause has not been looked into.

Use this for a change that should alter nothing, and read the differences for a change that should alter something. A difference on an element under `display: none` cannot be seen, but each one still deserves a look. Token names themselves are ignored, because a changed token shows in every property that uses it. Like the screenshots, it sees only the listed states, so it does not prove that a rule pair never conflicts elsewhere.

**Choose a mutation that reaches the screen.** A first colour check appeared to show the net was blind, but it had changed an overridden rule that nothing displayed.
