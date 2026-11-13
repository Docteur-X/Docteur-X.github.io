# Lessons

**Read this before changing code.** This page collects the lessons from the project's mistakes and defects, from 8 to 12 November 2026, in one place. Each entry gives what happened, the rule that follows from it, and where to find the evidence.

The evidence for each defect stays where it was recorded: [Known Issues](../05_Roadmap/Known_Issues.md) (defects D1–D10 and their own lessons), the [T3–T5 test plan](../04_Testing/T3_to_T5_Test_Quality_Execution_Plan.md) and the [rebuild plan](../06_Historical_Records/Superseded_2026-11-12/Rebuild_Plan.md). This page doesn't replace them.

**To add a lesson:** add one entry under the right heading, with a date and a link to the evidence. Keep each entry short. If a lesson stops being true, mark it out of date and say why, rather than deleting it.

---

## Architecture

**A1. Moving code out of a file doesn't by itself reduce complexity** (versions 500–628).
- *What happened:* about 130 increments moved logic out of `app.js` into small modules, and `app.js` barely shrank (3,519 to 3,448 lines). The new modules called back into `app.js`: the drag controller alone was handed 17 callbacks, and `ordinaryDragPorts.js` existed only to check that they were supplied.
- *Rule:* move a responsibility only together with its decisions, so the new module asks nothing back. Wiring alone isn't progress.
- *Evidence:* the audits of versions 593 and 628, recorded in the [rebuild plan](../06_Historical_Records/Superseded_2026-11-12/Rebuild_Plan.md).

**A2. One question, one answer, in one place** (stages 2–3).
- *What happened:* "is a preview open?" was answered by five flags plus a preview registry, and the drag start and drag release checks each combined a different selection of them. The 10 listeners on the equation competed for the same events, depending on the order they were added (for example, the negation listener's `stopImmediatePropagation`).
- *Rule:* each question has one owner. For "what is this view doing?", that's `js/view/viewMode.js`. For "who handles this input?", it's the routes in `js/view/inputRouter.js`. Don't add a flag or a listener beside them.
- *Evidence:* [interaction standards](../06_Historical_Records/Superseded_2026-11-12/Interaction_Standards_Draft.md), standards 1 and 2.

**A3. Every part a student can point at needs a box of its own** (D8, D10).
- *What happened:* the `+` in `2(x + -y)` belonged to a sum with no box, so hover and drop targets landed on the whole bracket. That one gap caused both a wrong glow and a wrong rule (negation was offered instead of distribution).
- *Rule:* renderer decision R1: every `Add` and `Multiply` gets its own box. One structural fix can remove several defects, so look for the shared cause.
- *Evidence:* [Known Issues, lessons 1 and 8](../05_Roadmap/Known_Issues.md#lessons-from-d8-d9-and-d10).

**A4. One painter for "what is highlighted now"** (D8).
- *What happened:* CSS `:hover`, which also matches every ancestor, and the JavaScript hover class both painted highlights, and they disagreed.
- *Rule:* highlights are decorations added after rendering, by identity, and they follow the view mode. During a drag, only drop-target feedback shows.
- *Evidence:* [Known Issues, lessons 2 and 3](../05_Roadmap/Known_Issues.md#lessons-from-d8-d9-and-d10).

**A5. Shared code must never list the rules by name** (stage 7).
- *What happened:* the first rule built from scratch found three separate lists of rule bundles, and drop-target kinds hard-coded in the shared arbiters. A new kind's drop was refused silently.
- *Rule:* when shared code needs "which rules exist", it asks the registered extensions. Building a new rule is the real test of a design, so do it early.
- *Evidence:* [Known Issues, lesson 11](../05_Roadmap/Known_Issues.md#lessons-from-d8-d9-and-d10); `tests/architecture/rule-bundle-list.test.js`.

**A6. Exact numbers from the start** (D3, D4).
- *What happened:* 12-digit rounding meant `1000000000000 + 1` gave `1000000000000`, and `0.1 + 0.2 = 0.3` was false.
- *Rule:* the Engine never uses floating-point numbers for mathematics. Numbers are exact rationals in `js/engine/rational.js`.
- *Evidence:* [Known Issues, historical dispositions](../05_Roadmap/Known_Issues.md#historical-dispositions).

**A7. Watch the total, not only `app.js`** (12 November 2026, open).
- *What happened:* by stage 7, `app.js` was down from 3,448 to 626 lines, and every rule needs 0–5 lines there. But the interaction layer as a whole grew from 9,220 to 11,484 lines, partly from rule bundles and new boundary checks.
- *Rule:* the coupling report is advisory, and lower complexity is the goal, not line count (owner, 11 November). Still, check each stage for code that only passes things along (lesson A1). New layers should replace old code, not sit beside it.
- *Evidence:* `npm run report:coupling`.

## Testing

**T1. A passing test may not reach the scenario it names** (T3, T4-2).
- *Rule:* before trusting a test, break the code on purpose (a mutation) and check that the test fails. Check that it passes on correct code first.
- *Evidence:* [T3–T5 plan](../04_Testing/T3_to_T5_Test_Quality_Execution_Plan.md).

**T2. Pointer paths across a live preview change what they aim at** (T4-4).
- *What happened:* early versions of a test were flaky: 2 of 300 runs failed, then 77 of 300.
- *Rule:* leave the preview first, then make one direct move. Don't add retries or longer waits to hide flakiness.
- *Evidence:* [T3–T5 plan, T4-4](../04_Testing/T3_to_T5_Test_Quality_Execution_Plan.md).

**T3. Node tests can pass while the program is broken in the browser** (stages 6a, 6e, cancel-opposites).
- *What happened:*
  - a renamed `state` was missed in a shorthand `{ state, staged }`, so every commit threw an error;
  - an alias import was lost when code moved;
  - a bundle committed `candidate.root`, which was undefined.

  The Node tests passed every time. The browser suite caught the first two before commit. The third was only caught later, through a bundle's browser test of its real install path.
- *Rule:* run the browser suite before every commit that changes interaction code. Each rule has a browser test of its real install path. `tests/architecture/free-names.test.js` checks that every name used in moved code is declared.
- *Evidence:* [Known Issues, lessons 9 and 12](../05_Roadmap/Known_Issues.md#lessons-from-d8-d9-and-d10).

**T4. Screenshots catch what a general rule breaks** (stage 6f).
- *What happened:* "hover outline only when idle" also removed the outline from equality's confirm targets. The first fix then broke factorisation's own hover style.
- *Rule:* when a general rule replaces several special cases, check it against each one. Read every screenshot difference before calling it expected.
- *Evidence:* [Known Issues, lesson 10](../05_Roadmap/Known_Issues.md#lessons-from-d8-d9-and-d10).

**T5. A test of the stylesheet must test the rule that's actually in effect** (stylesheet safety net).
- *What happened:* a colour test checked a rule that another rule overrode, so it proved nothing. Measured afterwards: a green made 10% darker went undetected, while 20% darker was caught.
- *Rule:* test the live rule, and know how small a change the test can detect.


**T6. Measure layout only after the fonts have arrived** (maths fonts, 13 November 2026).
- *What happened:* with bundled maths fonts, a "nothing moves" test failed by 0.9 px: the fonts are fetched when maths is first drawn, so the "before" was measured in the fallback font and the "after" in the real one. A touch test also failed because it probed a fixed 4 px above a box whose height depends on the font.
- *Rule:* wait for `document.fonts.ready` before measuring (the e2e `build` helper does); derive probe distances from the measured box, never from one font's sizes.


**T7. Text that shows mathematics must go through the notation contract** (amber copies, 14 November 2026).
- *What happened:* in distribution's preview the amber copies showed upright letters (`a·b + a·c`) while the same letters in the equation were italic. The copies were written as `textContent = expressionToDisplayString(node)`: plain text, so the renderer's mark for a letter (`term__label--symbol`), which the font set turns into the italic letter face, was never applied. The switch to TeX fonts (13 November) made the gap visible; with monospace both looked the same.
- *Contract broken:* "the renderer marks a letter; the font set decides how it looks" (Decisions, 13 November). Any second place that writes maths must keep it.
- *Rule:* never turn a tree into a string and put it in the page. Write it with `writeNotation(element, node)`, which marks letters from the tree itself; or render it. When a look is changed by a token or a class, search for every place that writes the same kind of content without that class (`textContent =` near a display string).
- *Guard:* `tests/rules/distribution/distribution.test.js` (letters marked, function names upright) and `e2e/rules/distribution/notation.spec.js` (copies use the same computed face as the equation).

## Debugging

**B1. Reproduce it before explaining it** (D8).
- *What happened:* the first probes used coordinates off the screen, so the drag never started, yet the results looked plausible.
- *Rule:* a probe must check that it reached the state it claims to test, for example with `manipulatorDiagnostics.mode()`.
- *Evidence:* [Known Issues, lesson 5](../05_Roadmap/Known_Issues.md#lessons-from-d8-d9-and-d10).

**B2. When a probe contradicts the hypothesis, check the probe first** (D8, D9).
- *What happened:* one picture showed two defects, and only one was explained.
- *Rule:* a fix is done when the picture the owner reported has disappeared, not just the part that was understood.
- *Evidence:* [Known Issues, lesson 6](../05_Roadmap/Known_Issues.md#lessons-from-d8-d9-and-d10).

**B3. Errors must reach the student, not only the console** (stage 6a).
- *What happened:* a drop that threw an error simply did nothing on screen.
- *Rule:* a failed step says so, for example "That step could not be completed; the expression is unchanged." Previews and toolbar commands still report only to the console, so that work remains.
- *Evidence:* [Known Issues, lesson 9](../05_Roadmap/Known_Issues.md#lessons-from-d8-d9-and-d10).

**B4. Copies of the mathematics need the same CSS scope** (D9).
- *What happened:* the drag ghost and the preview copies sat outside `#equation`, so the nested-box layout rules didn't reach them.
- *Rule:* anything that shows mathematics carries `.math-scope`.
- *Evidence:* [Known Issues, lesson 7](../05_Roadmap/Known_Issues.md#lessons-from-d8-d9-and-d10).

**B5. Silence is also feedback** (D7, D8).
- *What happened:* a quick release during a preview's return animation was silently cancelled (D7). Later, a stray hover glow was the only signal on screen.
- *Rule:* every state the student can be in should show something true, including "nothing will happen here".
- *Evidence:* [Known Issues, lesson 4](../05_Roadmap/Known_Issues.md#lessons-from-d8-d9-and-d10).

## Process and documentation

**P1. One current status, one handover.**
- *What happened:* by version 628 there were 89 notes, each claiming to be "current", alongside a START_HERE and a status page that were three days out of date. Some contradicted each other.
- *Rule:* update [Status](../00_Current/Status.md) and the [handover](../00_Current/Handover.md) in place. Notes about a single increment go into `06_Historical_Records`.
- *Evidence:* [Increment notes archive](../06_Historical_Records/Increment_Notes_to_628/README.md).

**P2. Two copies of the project drift apart.**
- *What happened:* versions 593 and 628 were built from a copy that lacked the rebuild plan, while another copy had the plan but not the code.
- *Rule:* the project lives in one Git repository. Each step is a commit, and packages are made from it.

**P3. Record defects; fix them only when asked** (owner rule).
- *Rule:* a defect found in passing goes into Known Issues with how to reproduce it and its likely cause. It's fixed in its own step, with the owner's approval.

**P4. Standards before features.**
- *What happened:* the renderer and the interaction layer never had an agreed standard, and that's where the tangle grew.
- *Rule:* an important layer or boundary gets a short standard, approved by the owner, and features are built within it.
- *Evidence:* [interaction standards](../06_Historical_Records/Superseded_2026-11-12/Interaction_Standards_Draft.md), [renderer standard](../06_Historical_Records/Superseded_2026-11-12/Renderer_Standard_Draft.md).

**P5. Check claims against the code before stating them.**
- *What happened:* an audit said `app.js` had "69 listeners on equation parts". In fact most were toolbar buttons, and the real problem was 10 competing listeners on the equation itself.
- *Rule:* count with a command, and say what was counted.

## Working with the owner

**W1. No analogies.** Explain with real HTML, CSS, tree output and code. Plain language is welcome; metaphors are not. (The display-model and renderer drafts still contain older analogies.)

**W2. Line counts are a measure, not a target.** The goal is lower complexity and better architecture (11 November 2026).

**W3. Ask with question buttons only when a decision is truly needed now.** While brainstorming, discuss; don't write files until told.

**W4. Use names that mean something to a student.** For example, "Question" rather than "Problem".

- **A clash that only a browser shows needs a check that runs everywhere** (E4b): two bundles used the same route name, and only the browser noticed. A Node test now checks that route names are unique. See Known Issues, lesson 13.
