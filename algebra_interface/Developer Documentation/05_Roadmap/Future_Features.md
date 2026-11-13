# Future features — intentionally deferred

- **Mathematics:** justified substitution; subtraction/division with domain conditions; general function application with explicit bound variables and assumptions; inequalities with monotonicity proofs; logical connectors and simultaneous systems; vectors and matrices with type/dimension and left/right operator semantics.
- **Workspace:** movable/resizable/snapping windows, multiple views of one authoritative object, focus-limited manipulation, zoom/scroll/line-breaking, graphs, cross-object reasoning and reuse.
- **Annotation and pedagogy:** independent annotation layer anchored to node identities, underbraces/arrows/circles, teacher explanations, optional teaching policies and explanation-depth modes.
- **Engineering:** stronger proposal ownership/metadata contract, generic gesture arbitration, richer rejection reasons, performance benchmarks on low-end devices, measured history scaling and lazy feature loading when warranted.

- **Ratios (owner, for a later day):** calculating and comparing ratios, which come up often in school mathematics.

All items are **proposals**, not currently delivered features. Prior discussions remain preserved in [historical records](../06_Historical_Records/README.md). Future priorities are set by the project owner and classroom testing, not by this list alone.

## Statements that split into cases (owner's design, 12 November 2026)

When a step depends on something unknown, the statement splits into cases instead of asking or assuming. For example, multiplying a < b by c gives `If (c > 0) { c·a < c·b }`, `If (c = 0) { c·a = c·b }` and `If (c < 0) { c·a > c·b }`. The same goes for dividing by b (b = 0 or not), square roots and logarithms. Until statements can hold cases, the student is asked, and the answer is recorded as the step's assumption (E4). Design: [Engine standard](../06_Historical_Records/Superseded_2026-11-12/Engine_Standard_Design_Draft.md).

## Undefined values that stay but stop interacting (owner's design, 12 November 2026)

An undefined result such as something ÷ 0 stays in the expression. Well-defined subtrees around it keep combining, but the undefined object itself stops being a scalar and can no longer combine or interact with anything. Today, division by zero has no value and numeric combination refuses it. This belongs with the type system (an "undefined" type).

## Structured (MathQuill-like) input and editing (owner's idea, 12 November 2026)

An input mode where the student builds the expression as structure (a fraction bar with a numerator and denominator slot, a divisor in its own box) instead of typing a line of text. Ambiguous text such as `6÷2x` can then not arise at all: what the student sees is the tree. It would sit beside the text box, produce the same expression tree, and use the renderer's node specifications for its layout.

## Accepting `6÷2x` (only if teachers ask; owner, 12 November 2026)

Today `6÷2x` is refused as ambiguous (it could mean `6÷(2x)` or `6÷2×x`); `6÷2 x` with a space means `6÷2×x`. The owner considers `6÷2x` a bad notation that hides ambiguity. It may be accepted later, with one fixed reading and a visible explanation, only if teachers' feedback asks for it. A teacher setting could choose the reading.

## Derived rules and their proofs (owner's idea, 12 November 2026)

A shortcut rule should be tied to the chain of basic rules that justifies it. First case: cancel-opposites (`b + −b → 0`) is justified by six existing rules:

| Step | Result | Rule |
|---|---|---|
| start | `b + −b` | |
| 1 | `b + −1b` | negation expand (the minus is a hidden −1) |
| 2 | `1b + −1b` | identity ×1 |
| 3 | `(1b + −1b)` | range grouping (the factorisation teaching policy asks for a visible scope) |
| 4 | `(1 + −1)b` | factorisation, right |
| 5 | `(0)b` | numeric combination, add |
| 6 | `0` | numeric combination, multiply (`0·x = 0`, which already existed) |

**Done (12 November 2026): the machine check.** `tests/engine/derived-rule-chains.test.js` applies the six steps through the real transformation coordinator and checks they reach the shortcut's exact result, both for `b + −b` (giving `0`) and inside a longer sum (`a + b + −b`, giving `a + 0`). If any of the six rules changes, the test fails, so the shortcut can never drift from its proof.

**Still to design (owner to choose; they can be combined):**
1. **"Show why".** The shortcut's history step records the rules that justify it (for example `justifiedBy` in its `transformation` record); a button replays the long chain as a sub-history, in place or in a side view. This fits decision 0.2 (detail steps stored; history can skip them).
2. **Earn the shortcut.** A teaching policy (`js/engine/teaching/`) keeps cancel-opposites hidden until the student has done the long chain by hand once; the rule's drop target asks the policy. A teacher setting could turn shortcuts on or off for a class.
3. **A general "derived rule" contract.** A bundle declares its justifying chain as data (`derivedFrom: [...]`), and the machine check, show-why and unlocking all read it. The same pattern would later cover both-sides (a balance explanation) and distribution (repeated addition).

## Outline policies (owner's idea, 11 November 2026)

An advanced setting for teachers and students to choose which outlines show at rest. For example:
- **every object** in the equation, for explaining structure;
- **only the parts that work out to a number**, such as `2+3` but not `x+3`.

**Rule for every policy:** never show two outlines around the same thing. When a bracket contains a single part, the bracket and that part share one outline, and the outer box wins.

**How it fits:** it is CSS only. The renderer adds labels to each box (`data-node-type`, `data-value="numeric"`, `data-wraps-single`), and each policy is a set of rules under `:root[data-outline-policy=…]`. Rules and the router are untouched. Today's "Always visible / On hover" setting becomes the simplest policy. Build after stage 7.

## Focus palette (owner's idea, 11 November 2026)

A collapsible palette shows a chosen subtree as one large, resizable hitbox. Acting on it acts on the original subtree in the equation. This is for accessibility. The design is in the [interaction standards](../06_Historical_Records/Superseded_2026-11-12/Interaction_Standards_Draft.md#the-focus-palette-owners-idea-11-november-2026-future-not-in-this-plan); it's built after stage 7 of the [rebuild plan](../06_Historical_Records/Superseded_2026-11-12/Rebuild_Plan.md).

## Presentation contract follow-ups (design accepted, not implemented)

See [Mathematical Presentation Composition Contract v1](../04_Reference/Mathematical_Presentation_Composition_Contract.md): complete AST occurrence addressability, AST-based structure navigator, compact persistent document-owned target proxies, stale target resolution, and eventual optional rule-declared proxy continuity/provenance. Proxies are outside mathematical history; provenance-based automatic retargeting is **not** approved for v1.


## Current creative exploration backlog (8 November 2026)

For the detailed, authoritative **unapproved** ideas (adjustable reasoning depth, transposition, equality-operation cycling, floating clipboard, structural differentials, derivation export) and intentionally deferred Phase 6 questions, see [Creative Exploration and Deferred Phase 6](Creative_Exploration_and_Deferred_Phase6.md). These concepts are not implemented features or approved implementation contracts.

## Interaction review draft (8 November 2026; not yet approved)

Owner's review of existing rules. Numeric combination, rearrangement, distribution and factorisation are satisfactory. Brackets are left alone for now.

| Item | Owner's request | Evidence so far | Proposed direction |
| --- | --- | --- | --- |
| Range grouping envelope | Box lags or jitters vertically | Measured: on entering preview, a toolbar row appears and moves the equation down 44 px, but the envelope was measured first, leaving it about 44 px too high. The selection-stage jitter was not reproduced | Measure after the toolbar updates; better, stop preview controls moving the equation |
| Factorisation toolbar row | Related to the 44 px jump | Measured: the row collapses when hidden (`display: none`, height 0). A rule meant to reserve its space never worked, because `[hidden]` with `!important` beat it, so that rule was deleted in the stylesheet tidy | Decide with the grouping preview: stop preview controls moving the equation |
| Range grouping brackets | Preview brackets overlap neighbours | Measured: the overlay brackets sit on the neighbouring `+` signs, because an overlay cannot make room | Render the validated candidate in normal layout, as negation and factorisation do |
| Equality discoverability | Owner's earlier ideas | Recorded in the [creative backlog](Creative_Exploration_and_Deferred_Phase6.md) | To be discussed. Cycling through all four operations needs subtraction and division, which the Engine lacks |
| Structure navigator after a rule | With the purple marker on the Group `(ab+ac)`, factorising to `a(b+c)` leaves it on `(b+c)`. The owner expects it on the whole expression or on `(b+c)`, and asked for this to be noted and fixed at the appropriate time | Seen on 9 November 2026: the Group keeps its node ID (`node-2810` before and after), and the navigator stays on a retained ID, as [its design](../06_Historical_Records/Superseded_2026-11-12/Mathematical_Structure_Navigation_v1.md) says | To be decided by the owner. Proposed: the marker stays on what is equal to what it marked, here all of `a(b+c)`. The rule should report this as provenance, because the navigator must not guess. Provenance-based retargeting is not approved for v1, so this belongs with the proxy and provenance follow-ups above |

**Done, awaiting owner check:** step 1. Identity preview now uses the same dashed amber appearance as proposed insertions, with theme colours; the negation minus is wider. CSS only, with tests in `e2e/view/interaction-appearance.spec.js`. 

**Done, awaiting owner check:** step 2. Signed factors show `b · −c`, the parser reads them, and the negation minus outline obeys the hitbox setting.

**Done, awaiting owner check:** hovering a proposed term no longer turns it blue, in either hitbox mode.

**Owner checked:** amber on `-1` and the `+0` preview are good. **Done:** identity insertion uses the shared `proposed-insertion` feedback role. The role is the one source of its look: amber text and dashed outline at rest; on hover or keyboard focus of a term, solid outline, dashed inner border and stronger glow, like distribution copies. This applies to negation's `-1` too. `identity-preview-new` is a behaviour hook with no paint, guarded by `tests/rules/identity-element/proposed-insertion-role.test.js`.

**Done, awaiting owner check:** the identity drag highlight uses a new shared `proposed-target` role ("you can drop here"), distinct from `proposed-insertion` ("this is new"). The drag ghost uses theme colours.

**Done, awaiting owner check:** in hover mode, keyboard focus outlines and the green "Release to negate" target now show. Both were hidden by the old hover-mode rules, against those rules' own comments; simplifying the rules corrected them.

### Grouping preview audit (10 November 2026)

Owner asked for this before the Engine work. Measured in Chromium at 1440 and 390 px wide, with addends selected by Ctrl+click. Nothing was changed.

**What works:** selecting adjacent addends draws the thin blue envelope; one segment per row when the selection wraps on a phone; Preview grouping, clicking inside the envelope and Escape all behave; confirming gives `a + (b + c) + d` with operand IDs preserved; the preview goes through the coordinator, the arbiter, a modal lease and the shared single-use commit lifecycle. Keyboard students can build the selection with Ctrl+Enter or Ctrl+Space on a term, and reach the envelope's top edge with Tab.

| Problem | Evidence | Cause |
|---|---|---|
| Envelope sits 44 px too high in preview | Selecting `b,c` in `a+b+c+d`: operands top 465 px, envelope top 412 px. Same at 390 px wide | `enterRangeGroupingPreview` measures the overlay, then `updateGroupToolbar` reveals Confirm/Cancel, whose new toolbar row pushes the equation down 44 px. Any later refresh (scroll, resize) puts it right, which explains the "lag" the owner saw |
| Brackets cover the neighbouring `+` | Once aligned, `(` and `)` overlap the plus signs on both sides | The brackets are drawn 15 px outside an overlay, which cannot make room in the layout |
| The equation moves when preview controls appear | 44 px shift on entering preview | Controls are added to the toolbar's flow above the equation. The factorisation row has the same problem (row above) |

**Architecture reading:** grouping is the only preview still drawn as a measured overlay. Negation and factorisation already render the candidate AST in normal layout, and grouping's coordinator already produces that candidate (`candidate.result.root`). Rendering it would remove all three problems at once: real brackets take space, nothing is measured, and nothing goes stale. The selection envelope (before preview) can stay an overlay, since it adds no brackets.

**Proposed fix, for owner approval:**
1. Render grouping's candidate in place, as negation does, with the new brackets marked by the shared `proposed-insertion` role.
2. Stop preview controls moving the equation: give them reserved space, or place them where they cannot shift it. Apply the same to the factorisation row.
3. Keep the envelope overlay for selection only, refreshed after any toolbar change.

Small, separate, also noticed: the probe could not select a factor of a product with the test helper used, so products were not measured.

**Direction (owner, 10 November 2026):** fix grouping by first defining a shared preview standard, so every preview follows one framework: [preview standard draft](../06_Historical_Records/Superseded_2026-11-12/Preview_Standard_Draft.md). The renderer standard is reviewed next, since previews depend on it.

**Remaining order:** preview standard and renderer review, then grouping on the new standard, then the Engine work, then equality design.
