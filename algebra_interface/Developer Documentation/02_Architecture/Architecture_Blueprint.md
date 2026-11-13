# Architecture blueprint — owner's target

**Status:** owner's vision, recorded 8 November 2026. **This is a target, not a description of today's code.** It guides structure so the project can be maintained and can accommodate more advanced mathematics. The gap table, open questions and the marked flow proposal are an assistant's reading awaiting owner review. No migration has been approved.

## Principle

Each responsibility is separate and does not affect the others. A mathematical rule does not need to know how a student interacts. Feedback changes only the appearance of the rendered equation and does not manipulate ASTs.

## Mathematical Engine

- Stores the ASTs: the true form of the expressions and statements the user is working with. A node carries metadata, for example whether a value is a scalar, vector or matrix, and how a product was entered (`\cdot`, `\times`, invisible).
- Understands which rules can be applied to the current AST, and under what conditions.
- Example: `Multiply(a, Add(b,c))` is the software's understanding of `a(b+c)`. The distribution rule tells the Engine whether it can apply to a subtree and, if so, what that subtree becomes, including provenance and metadata.

## History

- Records how the AST changes and can trace provenance.
- Lets the user return to an earlier state and continue, so new manipulations form a branch.
- Each Mathematical Object has its own identity and history. An object may be modified by other objects; history records that appropriately and is robust to potential bugs.

## Interaction layer

- **Renderer:** decides how the AST looks on screen and the visual properties of hitboxes. The AST is independent of how it is rendered.
- **Semantic target resolution:** turns clicks and drags into terms the software understands, for example "node12 is being dragged over node34".
- **Keyboard input module:** coordinates with semantic target resolution, for example Ctrl+click means multiple selection of nodes.
- These combine with the current settings of the software to describe what the student is doing, in terms of nodes and selections.
- **Gesture recognisers:** for example `DistributeGesture.js` recognises that a combination of inputs means the student intends left distribution. Another rule, such as rearrangement, may share the same inputs.
- **Intent arbiter:** decides which eligible interpretation takes precedence or rejects an ambiguous gesture, then tells the Transformation Coordinator that the user wants a rule applied.
- **Transformation Coordinator:** receives this mathematical request and asks the Engine whether it is valid.
- **Feedback files:** if valid, tell the Renderer how to respond. Hovering `a` over `+` in `a(b+c)` makes both glow amber. This is not only aesthetic: it says the gesture was recognised as that rule and that it is valid.
- **Outcome of a deliberate action:** either the Engine immediately modifies the AST and the Renderer displays it, or a preview mode highlights the new terms and changes, and the student must confirm or cancel before continuing.

## A rule as a bundle of separate parts

| Part | Responsibility | Must not |
|---|---|---|
| The underlying true rule | Conditions and how to manipulate the AST, for example "must be a nonzero scalar" | Know how the student interacts |
| `gesture.js` | Which gestures should try to invoke the rule | Decide validity |
| `feedback.js` | How the Renderer responds visually | Manipulate ASTs |

## Validity and arbitration (owner decision)

The Engine verifies all the possible rules for an input, and the intent arbiter then picks one using precedence rules. The Interaction layer never needs to know how a rule works.

## Teaching policy (owner decision; future feature, paused)

Intended for later. The notes below keep the intent, but how it fits will become clear as the project develops.

- A teaching policy is customisable by the teacher and acts like a feature, with its own `gesture.js` and `feedback.js`.
- Its mathematics must be justified by the underlying Engine, so every policy remains mathematically valid.
- It allows adjustable reasoning depth. A policy's rule can be inspected and expanded to show its atomic steps, the application of more elementary rules.
- It can add methods and can block them, for example preventing a student from invoking the quadratic formula before it is taught, even if the formula is inside the Engine and gesturable.
- It can change whether a rule uses a preview.

## Flow

Physical input → semantic target resolution and keyboard input, with settings → gesture recognisers propose interpretations → Transformation Coordinator asks the Engine about each → teaching policy applies → intent arbiter picks one by precedence → feedback to the Renderer → immediate change or preview with confirm/cancel, as policy determines → History.

The position of teaching policy in this flow is the assistant's proposal, awaiting owner review.

## Gaps between this blueprint and current source (assistant's reading)

| Blueprint | Current source |
|---|---|
| Engine stores the AST | The live AST sits in `state` inside `app.js`; there is no Engine object |
| Coordinator is the route to validity | Hover and drop paths in `app.js` also call rule functions directly |
| `feedback.js` per rule | Only some features register feedback; `*Visual.js` files describe previews; drag feedback and distribution preview drawing are hard-wired |
| `gesture.js` declares gestures | Gesture files mostly format a request; recognition lives in `app.js` and `hitTesting.js` |
| Keyboard input module | Key handling is spread through `app.js`; `selectionCommandRouting.js` covers part of it |
| Settings feed interpretation | No such input to recognition |
| Renderer independent of rules | `domRenderer.js` draws distribution previews and imports from `distribution.js` |
| Node metadata for scalar, vector, matrix | Symbols are assumed scalar |
| Objects may modify other objects | Not implemented; clipboard copies record only source provenance |

## Architecture audit (9 November 2026)

An assistant's audit of the code after the stylesheet tidy, requested and accepted for the record by the owner. The priorities below are recommendations, not approved work. It measured the code and read key modules, but did not read all of `app.js` line by line, and did not test long sessions or classroom use. Figures are from this date.

**Verdict:** a good foundation with one real structural weakness. The maths, history and test layers meet professional standards. The interaction layer's design is right, but much of it still sits in `app.js`. Fix this gradually; no rewrite is needed.

| Area | Rating | Evidence |
|---|---|---|
| Separation of maths and UI | Strong | `tests/architecture/dependency-boundaries.test.js` forbids maths-to-UI imports and import cycles |
| History and data safety | Strong | Branching, versioned events, replay checks, validation on load, size limits |
| Testing | Strong | Node, browser and visual tests, deliberate-break checks, CI |
| Rule design | Good | A rule's gesture, visual and maths parts are separate and use a shared coordinator |
| Security | Good | No outside code or `eval`; one `innerHTML` use, seen but not inspected |
| Speed | Fine for now | At 400 terms, a click took 88 ms and a 10-step drag move 253 ms, including test-tool overhead |
| Documentation | Good | Thorough for a project of this size |
| Composition (`app.js`) | Weak | 3,515 lines, 32% of the JS; 72 imports, 94 functions, 455 uses of one `state` object |
| Input handling | Weak | Key handling is spread across `app.js` and several modules; the arbiter's keyboard route permits no transformations yet |
| Layer direction | Minor leaks | `core` imports `operations`, `relations` imports `teaching`, and the renderer imports `distribution.js`; the test does not forbid these |

**Version control:** the assistant's working copy has no Git history and work moves as zip files. The owner should confirm whether the project is in Git; the CI workflow only runs if it is pushed to GitHub.

### Readiness for future features

| Feature | Readiness | What stands in the way |
|---|---|---|
| Documents and Mathematical Objects | Good | Each object already has its own AST and branching history |
| `θ`, `π` | Good | They already parse as symbols |
| Italic imaginary `i` | Easy, with one trap | Extra fields survive cloning, but `structuralEquality.js` compares symbols by name only |
| Teaching policy | Fair | The coordinator offers a place to plug in, but `relations` already calls a policy directly |
| Fractions, powers, roots | Fair | The parser rejects `^`, `/` and `√`. Hit testing works on rectangles, which helps; rendering is row-based |
| Matrices | Fair | Commutativity flags exist, but every symbol is assumed scalar |
| Multi-line simultaneous equations | Needs design | A root holds one expression or one equality; `Equal` appears in 21 places |
| Functions such as `sin(x)` | Not connected | The node type exists, but `sin(x)` parses as `sin` times `x` |
| Objects modifying other objects | Not built | Clipboard copies record only their source |
| Multiple windows | Blocked | One `state`; `app.js` refers to the single `dom.equation` 49 times |
| Full keyboard use | Blocked | No input module yet; recognition lives in `app.js`. See also defect D5 |

### Recommended order

1. **Move gesture and view state out of `app.js`,** one recogniser at a time, with the tests watching. Shape it around the owner's Windows and Documents thinking. Suggested as the next architecture project after the grouping preview.
2. **Decide how numbers work before adding division.** *(Done 10 November 2026: exact rationals.)* Defect D3 already shows 12-digit rounding giving wrong answers, for example `1000000000000 + 1` gives `1000000000000`, and `1/3` cannot be stored exactly. Consider a rational number type.
3. **Describe each node type in one place** before the first new notation. `Negate` alone appears in 11 modules, and there are 100 node-type checks across 20 modules.
4. **Stop rule-specific data reaching the renderer.** It receives options such as `distributionHover` and `combineTargetId`; it should receive general feedback roles, which also supports the blueprint's `feedback.js`.
5. **Close the layer leaks** above, then extend the dependency test so they cannot return.

**Can wait:** cascade layers, speed work unless large objects show a problem, history storing a full snapshot per step, and further stylesheet tidying beyond [its open decisions](../06_Historical_Records/Superseded_2026-11-12/Rendering_and_Interaction.md#still-open).

## Open questions for the owner (paused with teaching policy)

1. When policy blocks a valid rule, should the student see that it exists but is not allowed yet, or see nothing? The creative backlog distinguishes invalid mathematics, valid but prohibited by policy, and ambiguous gestures.
2. Can a policy change precedence between competing interpretations?
3. How is a policy's composed rule justified: is each atomic step rerun through the Engine when applied? (Assistant's suggestion: yes, and the whole rule is rejected if any step fails.)
