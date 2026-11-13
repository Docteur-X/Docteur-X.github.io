# Handover: how to continue

The single handover. It says how to work on the Manipulator; [Status](Status.md) says where things stand, and [Decisions](Decisions.md) says what the owner decided. Earlier handovers are historical records.

## What the project is

The Manipulator is an offline, student-directed algebra workspace. The student chooses each step and acts on the mathematics directly (drag, tap, select); the Engine checks that the step is mathematically valid and never solves for the student. The [founding vision](../01_Founding_Vision/Student_Agency.md) and the owner's [target architecture](../02_Architecture/Architecture_Blueprint.md) explain why.

**Always preserve:** the tree as the mathematical authority (never the page); stable occurrence IDs for unchanged nodes and fresh IDs for copies; explicit brackets as nodes; ordered products (for future non-commutative types); previews that never change committed state; source-stamped, single-use confirmations; one history step per commit, with any assumption recorded on it; branching history per object; offline storage; and the separation of gestures, teaching policy and mathematical validity.

## Reading order

1. [Overview](Overview.md): the layers and where things live.
2. [Pipelines](Pipelines.md): reading, drawing, a step, saving, file by file.
3. [Status](Status.md) and [Decisions](Decisions.md).
4. [Adding things](../03_Developer_Guides/Adding_Things.md), before adding a type, operator, relation, identity, gesture or rule.
5. [Lessons](../03_Developer_Guides/Lessons.md) and [Known issues](../05_Roadmap/Known_Issues.md), before changing code.
6. The actual source and tests for the task. They are authoritative; if a document disagrees with them, find out why and correct the document.

## How the owner works

- **Plain language;** explain with real code or output, not analogies.
- **Design before building.** A design or plan goes to the owner first; build after approval. Ask with options only when a decision is truly needed now.
- **Architecture first.** Defects are recorded (Known issues) and deferred unless the owner asks.
- **Root causes, not patches.** When something breaks, find why, fix that, and add a check (a test, a lesson) so it cannot come back.
- **No hidden ambiguity.** Refuse an ambiguous form with a clear message; ask before choosing a silent reading.
- **Keep the documentation current with every increment,** unprompted: Status (in place), Decisions (new decisions), Known issues and Lessons (with evidence), and the relevant guide.
- **Line counts are advisory;** the goal is lower complexity.

## How to make a change

1. Read the code and tests involved; write down what must not change.
2. For anything beyond a small fix, write the design first and get the owner's answer.
3. Make the change in small, checkable steps. Prefer one path per job: reuse the shared pieces (the candidate preview, `copyWithFreshIds`, the definition helpers) rather than writing another.
4. Run all suites on the finished change, not while editing (lesson 13): `npm test`, the browser suite, the screenshot suite, `npm run check:docs`. See [Testing and verification](../03_Developer_Guides/Testing_and_Verification.md).
5. Update the documentation, commit with a message that says what and why, and package the project for the owner (a zip whose top folder is `Manipulator/`, without `node_modules`, `test-results` or `visual/baseline`, with `.git`; run `git gc --aggressive --prune=now` first).

## Next

E4 is complete: functions, identities as data, `<` and `>`, and multiplying both sides of an inequality with the sign question; every preview now uses the shared candidate preview in the equality preview's look. The owner chose a group for E5, then paused it to think about what groups should do. The [ideas overview](../05_Roadmap/Ideas_Overview.md) gathers the open threads and questions; the next step follows the owner's answers there.
