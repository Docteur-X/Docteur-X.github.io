# Status

**As of 12 November 2026.** One table, updated in place with each increment (not appended). The earlier running log is kept in the [historical records](../06_Historical_Records/Superseded_2026-11-12/Current_Status.md).

## Test counts

| Suite | Command | Count | Result |
|---|---|---|---|
| Node tests | `npm test` | 878 | all pass |
| Browser tests | `npx playwright test` | 173 | all pass (on a busy machine some time out at 30 s; they pass with `--workers=1 --timeout=90000`) |
| Screenshots | `npx playwright test --config=playwright.visual.config.js` | 176 | all pass (baselines refreshed for the boxed `−` of `a − b` and italic amber copies, 14 November 2026) |
| Documentation links | `npm run check:docs` | 590 links | all resolve |
| Unused code | `npm run report:unused` | 0 unused exports, 0 unreferenced modules | test-enforced |
| Coupling | `npm run report:coupling` | advisory | — |

How to run them, and the visual safety net: [Testing and verification](../03_Developer_Guides/Testing_and_Verification.md). The browser and screenshot suites run on a finished change only (lesson 13); under heavy load the screenshot suite can time out falsely, so rerun it when the machine is idle.

## Work

| Area | Done | Next |
|---|---|---|
| Rebuild (stages 0 to 7) | All done: interaction standards, view mode, input router, renderer standard, rule bundles, the split of `app.js`, the generic rule drop. | — |
| Division | D1 to D3: `÷` as `Invert`, the leading 1, `÷` and `/`, `b÷b = 1` and `0·a÷b = 0` with the assumption `b ≠ 0`, the reorder preview. | D4: stacked fractions (not scheduled). Division states in the screenshot suite. |
| Engine standard | E1 node registry and canonical text; E2 table-driven parser and printer; E3 definition objects and rule requirements; I1 gestures as definitions; E4a functions (`\sin(x)`); E4b identity rules as data (sin and cos of a sum); E4c `<` and `>` and one both-sides rule; E4d multiplying both sides of an inequality (a known sign keeps, flips or gives `=`; an unknown sign asks the student, and the answer is the step's assumption); every preview on the shared candidate preview, in the equality preview's look. | E5 (a group) is paused while the owner considers what groups should do; see the [ideas overview](../05_Roadmap/Ideas_Overview.md). |
| Clean-up | C1 to C8 done: correct names, one candidate preview, one result shape, folders by layer, tests by subject, no unused code, this documentation. | — |

## Open defects (deferred, architecture first)

| ID | Summary | Where |
|---|---|---|
| D5 | An arrow key on some occurrences throws an uncaught error; nothing changes mathematically. | [Known issues](../05_Roadmap/Known_Issues.md) |
| D6 | A preview can outlive an object switch made without a pointer press. | [Known issues](../05_Roadmap/Known_Issues.md) |
| D11 | The relation's operation menu stays open over the preview. | [Known issues](../05_Roadmap/Known_Issues.md) |
| D12 | A function's drag ghost is drawn larger than the original. | [Known issues](../05_Roadmap/Known_Issues.md) |

## Recorded, not scheduled

Stacked fractions (D4); derived rules that show why and can be earned; statements that split into cases; undefined values that stay but stop interacting; structured (MathQuill-like) input; accepting `6÷2x` if teachers ask; constants such as `\pi`; functions of several arguments; matching identities up to commutativity; a natural `Equal` chain and `BinaryEqual`; the focus palette; outline policies. Details: [Future features](../05_Roadmap/Future_Features.md).
