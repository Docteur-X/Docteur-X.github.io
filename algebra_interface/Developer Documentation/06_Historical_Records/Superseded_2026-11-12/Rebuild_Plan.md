# Rebuild plan: making new features easy and predictable

**Status:** the owner approved the direction on 10 November 2026 and the staged plan on 11 November 2026. **Stage 0 is done** (11 November 2026). **Stage 1 is complete on paper** (all decisions made, 11 November 2026): the [interaction standards](Interaction_Standards_Draft.md). **Stages 2 and 3 are done** (11 November 2026: one mode per view, one router per view). **Stage 4 is done** (11 November 2026): all eight rules are bundles in `js/rules/`. **Stage 5, part 1 is done:** the renderer paints no state and imports no rule. Stages 5 to 7 haven't started.

## Goal

A new rule should only need **its own folder and its own section of CSS**. It should need no edits to:
- `app.js`
- the renderer
- the input code
- any other rule

Its interaction with other rules should be predictable without testing it. For example, while one rule is previewing, nothing else can start, because the view mode says so.

## How progress is measured

**The real goal is lower complexity and clearer architecture, not fewer lines** (owner, 11 November 2026). The coupling report is one measure of that, and it's advisory: no test fails on it, and a stage is never judged on line count alone.

Run `npm run report:coupling`. For each feature, it prints:
- the files that mention it;
- the lines in `js/app.js` that mention it;
- the lines in the renderer that mention it.

**Starting point (version 628, 11 November 2026):**

| Feature | `.js` files mentioning it | Lines in `app.js` | Lines in the renderer |
|---|---|---|---|
| Factorisation | 18 | 130 | 1 |
| Grouping | 18 | 127 | 0 |
| Identity insertion | 36 | 102 | 1 |
| Distribution | 23 | 98 | 27 |
| Equality | 19 | 58 | 5 |
| Negation | 18 | 56 | 1 |
| Rearrangement | 17 | 38 | 0 |
| Numeric combination | 17 | 36 | 5 |

`app.js` itself is 3,448 lines. The interaction layer is 9,220 lines: all of `js/` except `core`, `operations` and `relations`, with `app.js` included.

A "mention" is any line containing the feature's word stem (for example `factoris` or `distribut`), comments included. A comment naming a feature in `app.js` usually means its behaviour is still wired there.

The starting numbers are kept in `scripts/coupling-baseline.json`, and the report shows how each number has changed since then.

**What we hope to see:**
- a feature that has moved needs no lines in `app.js` or the renderer;
- the interaction layer gets simpler.

The other signs of lower complexity count as much:
- each question ("is a preview open?", "is this still fresh?") has one answer, in one place;
- a new rule needs no edits to other rules;
- fewer callbacks are passed between modules.

If, after stage 4, those signs aren't improving, the standards get rethought. More guards aren't the answer.

## What is kept

- **Kept unchanged, and used by the new pieces:** `js/core`, `js/operations`, `js/relations`, `css/`, every test, and the visual safety net.
- **Kept in the new design:** the preview host (`js/steps/previewSessionHost.js`), source stamps, and the save and history protections from versions 593 to 628.
- **The tests are the specification.** A feature has moved when its old tests pass.

## Stages

| Stage | Work | Done when |
|---|---|---|
| 0 | One base: Git on version 628; the plan and draft standards brought over; increment notes archived; coupling report added | **Done 11 November 2026.** All tests pass on the Git base, and the report runs |
| 1 | **Drafted 11 November 2026: [interaction standards](Interaction_Standards_Draft.md).** Agree four short standards, as design only: view mode, gesture declaration, rule bundle and renderer labels. Settle the notation question (is `a−b` the same as `a+(−b)`?) | The owner approves each one |
| 2 | **Done 11 November 2026.** One mode per view, in `js/view/viewMode.js`, replacing `state.factorDrag`, `state.distributionPreview`, `state.groupingMode`, `state.factorisationMode` and the modal ownership registry | `canStart` reads `mode.kind === "idle"`; the five flags are gone |
| 3 | **Done 11 November 2026.** One router per view, in `js/view/inputRouter.js`: it finds the labelled part that was touched, matches it against the gesture declarations, and checks the mode in one place. Today the equation has 10 competing listeners plus several on `document`; most of `app.js`'s 69 listeners are toolbar buttons, and those stay | No equation or document pointer/key listeners in `app.js`; a browser test shows that, while a preview is open, only confirm and cancel work |
| 4 | **Done 11 November 2026.** Rules own their behaviour, in `js/rules/<name>/`, smallest first: negation, then rearrangement and combination, identity, grouping, distribution, factorisation and equality. `executeOrdinaryDragExit` becomes a generic loop | The coupling report shows 0 lines in `app.js` for each moved rule |
| 5 | A clean renderer: distribution's preview moves into the preview host, highlights move to the feedback layer, and interaction wording moves to the router | The renderer imports no rule; screenshots and computed styles are identical |
| 6 | **Done 12 November 2026.** `app.js` only starts the program; the shared `state` is split into document state and per-view state | `app.js` is 639 lines (from 3,448 at version 628), creates modules and installs bundles, and decides nothing by feature name. The interaction layer as a whole grew (headers, comments and smaller modules), which the report shows honestly |
| 7 | **Done 12 November 2026.** Prove it: add one new small rule using only a bundle. Owner chose "same to both sides": drag a term across = to add its opposite to both sides (`js/rules/both-sides/`) | The coupling report shows 0 lines in `app.js` and the renderer. Outside its folder: one line in `js/rules/bundles.js`, its CSS section, and the deliberate pins (route table, rule-ID list, coupling row). Building it found and removed two hidden couplings first: three separate lists of rules (now `js/rules/bundles.js`), and hard-coded drop-target kinds in the shared arbiters (now a generic `rule-drop`) |

## Rules while working

- **Every step is one Git commit,** checked by the Node tests, the browser tests, the screenshots and the computed styles.
- **No new mathematical features until stage 7.** Defects are recorded in [Known Issues](../../05_Roadmap/Known_Issues.md), not fixed, unless the owner asks.
- **The program stays usable after every commit.**
- **Each stage ends with a package for the owner to check** before the next one starts.
- **Docs are updated as each stage finishes:** [Current Status](Current_Status.md), the [handover](HANDOVER_CURRENT.md) and the standards.

## Related drafts

- [Interaction standards (stage 1)](Interaction_Standards_Draft.md)
- [Display and interaction model](Display_and_Interaction_Model_Draft.md)
- [Renderer standard](Renderer_Standard_Draft.md)
- [Preview standard](Preview_Standard_Draft.md)
- [Engine statements](../../02_Architecture/Engine_Statements_Draft.md)
