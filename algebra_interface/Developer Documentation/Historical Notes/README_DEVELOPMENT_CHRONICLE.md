# Archived development README (historical)

> Historical reference only. This document preserves the former long-form root README and may contain outdated project structures or dated feature descriptions. For current implementation status, use [CURRENT_STATUS.md](../CURRENT_STATUS.md), the [documentation index](../README.md), and source code.

---

# Algebra Workspace — visual mathematical manipulation

This is an offline-friendly prototype of a **manipulable algebra learning tool**.
It uses plain HTML, CSS and JavaScript ES modules. No framework or online
service is needed once the files have been downloaded.

The **expression tree**, not the browser DOM, is the mathematical source of
truth. A renderer turns nodes into selectable hitboxes; independent operation
modules implement the mathematical rules.

### First common-factor extraction (new)

Enter an explicitly grouped sum such as `(a*b+a*c+a*d)`. Ctrl/Cmd+click
the first `a` in every product. Drag one selected `a` into the small amber
zone just outside the left bracket, or click **Preview extraction**. The
selected occurrences briefly fade and amber overhead arrows converge on the
clickable extracted `a` in a **complete, normally laid-out proposed expression**. Click that factor (or Confirm extraction) to apply
`a*(b+c+d)`; click elsewhere or Escape to cancel without changing history.

Right extraction works with `(b*a+c*a+d*a)`. It preserves factor order even
when multiplication is noncommutative. No automatic factor reordering, coefficient decomposition, or algebraic simplification occurs. The separate +0 / ×1 toolbar can introduce identities deliberately; factorisation itself does not insert them automatically.
Read **`Developer Documentation/FACTORISATION.md`** and **`Developer Documentation/TRANSFORMATION_PREVIEW.md`** for detailed rules, full-result modal preview, provenance, code ownership, and testing limitations.

### Expressive rearrangement preview (non-mutating)

Dragging `a` between `b` and `c` in `a+b+c` now previews **`b+a+c`**, with
**both plus signs** and the moved term highlighted in blue. This uses a
separate, pointer-transparent visual clone: the real mathematical tree and
its original hitboxes do not move until the drop is committed. When the
pointer moves to a green numeric target or amber distribution target, the
visual reorder preview is dismissed. This is intentionally a *teaching*
preview as well as an interaction cue. It does not change history.

For maintenance, read **`Developer Documentation/ARCHITECTURE_DECISIONS.md`** (the reasons for design
choices), **`Developer Documentation/FUTURE_FEATURES.md`** (deferred work and known risks), and
**`Developer Documentation/INTERACTION_ARCHITECTURE.md`** (low-level drag mechanics).

### Stable drag-and-drop architecture

The drag system has been refactored to make the visual interaction independent
of mathematical editing. The full explanation, module responsibilities, and
browser testing checklist are in **`Developer Documentation/INTERACTION_ARCHITECTURE.md`**.

- Starting/hovering/cancelling a drag does **not change the expression tree**,
  node IDs or history. Only a successful drop commits a mathematical change.
- `js/interaction/hitTesting.js` captures stable hitbox rectangles at the start
  of each drag and maps pointer coordinates to targets. It refreshes on scroll
  or resize; its optional hysteresis setting is **off** by default.
- `js/interaction/dragFeedback.js` changes existing green/amber classes and
  delegates blue insertion previews to `rearrangementPreview.js`; it never
  rebuilds the real equation. A thin marker remains as a fallback.
- `js/interaction/rearrangementPreview.js` creates a temporary visual clone of
  the relevant Add/Multiply row, showing the proposed complete operand order
  with operators. The original row stays stationary for hit testing.
- Dragging leaves the original hitbox in place (dimmed). A visual clone follows
  the pointer; insertion markers no longer push terms around.
- Mathematical permissions still come from the addition, multiplication and
  distribution operation modules, not from the interface.


## Running the website

From this folder run `python -m http.server 8000` (on Windows you may use
`py -m http.server 8000`) and open `http://localhost:8000`. You can also use
`start-local-server.bat` on Windows or VS Code's Live Server extension.
Opening `index.html` with `file://` is **not** supported because imported ES
modules need to be served from an HTTP server.

## Try these examples

```text
2+(3*(4*5+6)*(7+8))
2+[3*{4*5+6}*(7+8)]
(a+b)c
((x))
(1)+2
0+a
1*x
```

Use **Build expression** to parse input, or change the equation by dragging.

- Drag a term/factor into a gap **within the same sum/product** to reorder it.
  Nested sums and products have their own independent child hitboxes. You can
  reorder the outer `2` and its large bracketed addend, the `3` and its two
  neighbouring bracketed factors, the `4` and `5`, or the `7` and `8`.
- Drag a numerically evaluable addend onto another to combine them; this also
  works for complex numeric products and grouped numbers, e.g. `(1)+2 → 3`.
- Zero and one identities work even with unknown variables: `0+a → a`,
  `0*a → 0`, and `1*a → a`. You can drag in **either direction**. Green on
  both the moving ghost and target means a valid combination is available.
- **Click** a hitbox to select it. Choose `( )`, `[ ]` or `{ }` in the **bracket
  toolbar**, then select **Wrap selection**. **Remove brackets** removes one
  explicit `Group` layer. Double-click a hitbox to toggle round brackets.
  **Alt+click** selects its surrounding hitbox when nested hitboxes overlap.
- The opening and closing brackets are **inside the Group hitbox**, so they
  visibly travel with a dragged bracketed expression.
- Left/right arrows reorder a focused child; Enter or Space selects it.
- Undo/branching history continues to store independent expression-tree
  snapshots, including Group IDs and bracket styles (not DOM elements).

### Bracket syntax and errors

`( )`, `[ ]`, and `{ }` are all explicit Group nodes. You can nest them and
use them around one number or variable, even redundantly: `((x))` is valid.
**Unmatched, mismatched and empty brackets** give helpful input errors in the
status/hint area. `|` is reserved for absolute value; `<` and `>` are reserved
for comparisons, so none of these characters can group expressions yet.

An expression is a **sum of products of signed atoms**, and an atom may itself
be a bracketed expression. `*` and `·` display a dot; `×` displays a times
sign; adjacency / whitespace can imply multiplication. `ab` remains **one
symbol** rather than automatically splitting into `a*b`. `_ab` explicitly
names that symbol; `_a _b` is a product. **`sin(x)` currently parses as the
symbol `sin` multiplied by `(x)`, not as a function call.** Actual function
syntax will require a symbol/function registry later.

General binary subtraction (`a-b`), powers, division, function calls, matrices
are **not** implemented. Narrow left/right factorisation and distribution are implemented; negative numeric
addends such as `a+-2` still work.

## What is a Group node?

Input `(a+b)c` produces this conceptual tree:

```text
Add (UI root, always exists)
└── Multiply
    ├── Group [bracketStyle = "round"]
    │   └── Add
    │       ├── Symbol(a)
    │       └── Symbol(b)
    └── Symbol(c)
```

A `Group` has **exactly one child**, `.operand`, which can itself contain an
arbitrarily complicated tree. `bracketStyle` is `"round"`, `"square"` or
`"curly"`. All nodes, including `Group`, have stable editor IDs.

`Group` is an explicit boundary created by the author. In contrast, when an
`Add` child is directly under `Multiply`, its visual parentheses are
**automatic** (mandatory for unambiguous notation). No Group node is needed
for the automatic brackets. Removing the Group from `(a+b)c` leaves the Add
below Multiply, so the display **still shows `(a+b)c`**. Removing a Group is
NOT the same thing as distributing a factor; distribution is a later feature.

`normaliseExpressionTree` may flatten **directly nested** `Add` or `Multiply`
nodes, but **never crosses or removes explicit Groups**. Consequently,
`(a+b)+c` keeps a grouped addend until you intentionally remove the Group.

### Numerical meaning of a Group

We chose to allow numerical evaluation through a Group. `(1)+2` may combine
to `3`, even while the brackets still exist. The evaluator visits the Group's
single child recursively and returns its value if known. That keeps grouping
pedagogically useful for organising work without arbitrarily preventing a
valid arithmetic action. A committed numeric combination consumes the two
operands, including any Group wrappers attached to those operands.

## How recursive parsing matches brackets

The parser uses a **recursive-descent** grammar:

```text
sum       -> product ('+' product)*
product   -> signedAtom (multiply-or-juxtaposition signedAtom)*
signedAtom -> '-'? atom
atom      -> number | identifier | OPEN sum CLOSE
```

It scans **tokens** one after another. At an opening bracket it calls the
`parseSum()` method again to parse the inner expression. JavaScript's call
stack keeps the expected closing bracket for that particular call. For
`[a+(b*c)]`, the outer call remembers `]`, while the inner remembers `)`.
If the wrong closing token appears, the parser reports what it expected.

This is **recursion**: a function handling a small expression can ask the same
function family to handle an even smaller expression nested inside it.
The parser does not try to infer mathematical meaning from DOM nesting.

## Why the precedence module exists

`js/core/operatorMetadata.js` keeps a central precedence table:

```text
Add (10) < Multiply (20) < Negate (30) < literal or Group (100)
```

A child with **lower precedence** than its parent needs automatic brackets:
for example, Add inside Multiply. Multiply inside Add does not. Those
parent-aware rules are shared by both the editor renderer and the text
serializer, so they cannot silently disagree on whether parentheses are
needed.

Future operators require **more than just precedence**. Non-associative cases
like `a-(b-c)`, `(a^b)^c` and `a/(bc)` need rules involving **which child
position** an operator occupies and associativity. The argument `position`
is already passed to `needsAutomaticBrackets`, which is where these cases
will be implemented. We intentionally have NOT guessed rules for unknown
operators. No powers/logarithms/integrals are claimed to work today.

## Project files

```text
algebra_interface/
├── index.html                      # HTML and bracket toolbar
├── styles.css                      # nested hitbox and bracket styles
├── js/
│   ├── app.js                      # state, pointer/keyboard actions, history
│   ├── core/
│   │   ├── nodeFactory.js          # constructors including createGroup
│   │   ├── parser.js               # recursive-descent bracket parser
│   │   ├── operatorMetadata.js     # precedence and automatic brackets
│   │   ├── treeUtils.js            # traversal, evaluation, normalisation
│   │   └── mathJson.js             # semantic output (no Group shell)
│   ├── operations/
│   │   ├── addition.js             # sum reorder/combine + hover eligibility
│   │   ├── multiplication.js       # product reorder/combine + 0/1 identities
│   │   └── grouping.js             # wrap/unwrap an explicit Group
│   └── rendering/
│       └── domRenderer.js          # recursively create nested hitboxes
└── tests/
    ├── expression-tree.test.js     # original model behaviour
    └── grouping.test.js            # deep trees, grouping, bracket errors etc.
```

### How to add a future operation

1. Define the mathematical rule **outside** `app.js` (new operation module or
   an existing relevant one). Give it an applicability check and a separate
   apply function; do not mix it with DOM/CSS.
2. Add tests for positive, negative and nested cases, IDs, and numerical
   meaning. Test symbolic and substitution variants separately.
3. Add any needed node type to `nodeFactory.js`, traversal, MathJSON, and
   serialization. New operators also need metadata/precedence rules.
4. Have `app.js` offer the rule on an appropriate selection or drop, create
   a **single meaningful history step**, and ask the renderer to redraw.
5. Add visual affordances and browser interaction tests.

Distribution is implemented in `js/operations/distribution.js`. It clones
factors using **new IDs**, preserves IDs of retained operands, and returns
provenance for history. New rules should follow the same separation.

## Test status and limitations

Run `node --test tests/*.test.js`, or `npm test` if npm is installed. These
check parsing, MathJSON, structural group preservation, numeric evaluation,
identity rules, reordering helpers and recursive DOM construction via a simple
mock document.

The mathematical/DOM-structure tests cannot prove that real-world pointer
handling, drag animation, ghost positions, responsive layout, toolbars and
hover transitions behave perfectly. **Test those interactions in your browser**
using the sample expressions above. The project intentionally does not yet
have an automated browser end-to-end test runner.

The MathJSON inspector removes Group wrappers (they do not alter arithmetic
meaning) as well as IDs/display styles. To preserve author-intended grouping,
use the **internal expression tree/history snapshot**, not MathJSON alone.
History uses branching snapshots plus versioned events. Workspace v1 saves documents and their histories in browser IndexedDB, with JSON import/export; see `Developer Documentation/WORKSPACE_V1.md` and `Developer Documentation/EVENT_SOURCED_HISTORY.md`. Compact event-only export exists as a history-library capability but is not yet the default document export.

## New: two-stage distributive law (left and right)

Try typing `a*(b+c+d)` and building the expression. Then:

1. Drag the factor `a` toward **one of the + signs** INSIDE `(b+c+d)`.
   Dragging toward the whole bracketed term does **not** trigger distribution;
   normal green numeric evaluation still works on ordinary hitbox targets.
2. When the plus sign is highlighted **warm yellow**, release the pointer.
   The yellow factor/sum outlines mean **a mathematical rule is available**,
   distinct from green, which means evaluation/identity simplification.
3. You now see an IN-PLACE PREVIEW with temporary yellow copies of `a`,
   curved overhead arrows from the original factor, and uncoloured `b,c,d`.
   The original equation has **not** been modified or recorded in history.
4. Click **any** temporary amber factor box (a real button with a generous
   click target) to confirm ONE distribution: `a*(b+c+d)` becomes
   `a*b+a*c+a*d`. The overhead curves and arrowheads are purely decorative:
   no separate arrow buttons occupy space in the equation.
5. Press Escape or click elsewhere to dismiss the preview with no changes.

**Keyboard alternative:** Focus a factor and press **D**. If exactly one
neighbouring factor is a sum, the same preview appears; Tab reaches the large
amber factor-copy buttons, and Enter/Space confirms. If two adjacent sums are available,
use pointer dragging onto the intended plus sign to disambiguate.

Right distribution is also supported: `(a+b)*c` becomes `a*c+b*c`.
It always retains factor order and remains valid for NONCOMMUTATIVE
multiplication. A factor may be distributed only onto an **adjacent** sum in
its immediate Multiply node; e.g. `a*x*(b+c)` does not permit distributing
`a` over `b+c` by silently jumping across `x`. You CAN distribute `x`.

### Mathematical semantics and transient state

`operations/distribution.js` owns both the eligibility check and the rewrite.
The renderer builds a preview **without** changing the tree. `app.js` merely
interprets a plus-sign drop, starts/cancels a temporary preview, and asks the
operation module to commit when an amber factor-copy button is clicked.

- **Left:** `A*(B+C) -> A*B+A*C`.
- **Right:** `(A+B)*C -> A*C+B*C`.
- The sum can sit inside explicit `()`, `[]` or `{}`, including multiple layers.
- Existing addends keep their node IDs; each duplicate source factor and ALL
  its descendants receive fresh IDs. For instance, `(x+y)*(a+b)` creates two
  copies of the grouped `(x+y)` factor, with independent IDs at every level.
- On confirmation, the new history node includes `transformation`, with
  `copiesBySourceId`, `retainedAddendIds`, and source/result IDs. A future
  history inspector can use this stored provenance to trace terms backwards.
- `Group` wrappers belonging to the distributed sum are consumed by the
  confirmed rewrite. Any unrelated outer groups remain untouched.
- If there are extra surrounding factors, only the adjacent factor and sum
  are replaced: `x*a*(b+c)*y -> x*(a*b+a*c)*y`. The renderer supplies the
  REQUIRED parentheses without fabricating an explicit `Group` node.
- The original user-selected multiplication style is used for the new
  products; the display-style override still works independently.
- This first version of **distribution** does not implement partial distribution
  over only some addends, multi-factor redistribution, or a persistent lesson
  annotation. A preview is cancelled without creating a history entry.

### Operator-rule ownership

The latest available grouping source was extended here to include the earlier
operation-permission refactors. `addition.js` and `multiplication.js` now own
independent associativity and commutativity permissions:

- Node constructors in `core/nodeFactory.js` never assume associativity.
- `core/normalization.js` asks those operation modules whether generic
  `treeUtils.normaliseExpressionTree()` may flatten a nested node.
- The parser also retains left-nested structure when associativity is disabled;
  `operatorMetadata.js` supplies parentheses for those nonassociative cases.
- Pointer and keyboard factor rearrangements both consult `multiplication.js`;
  neither route can bypass the noncommutativity restriction.
- Addition's `+0` rule and multiplication's `*0` and `*1` rules still live in
  the corresponding rule modules, not in the interface controller.

For experiments, `setMultiplicationCommutative(false)` makes factor reordering
illegal; distribution still works because it does NOT rearrange factors.
`setMultiplicationAssociative(false)` prevents automatic flattening. Rule
settings are programmatic and should be changed before parsing an expression.
Changing them while a tree is already loaded does not retroactively restructure
that existing tree.

### Automated tests

Run `node --test tests/*.test.js` in the project root (Node.js required).
The test suite covers the existing parser/grouping/numeric rules and the new
left/right distribution, adjacency, provenance, noncommutativity, invalid plans,
and mock-DOM preview structure. Tests are *not* a substitute for trying the
pointer drag/hover/drop behaviour in a real browser. The arrow animation
respects the operating system's reduced-motion preference and gracefully
skips animation when the Web Animations API is unavailable.

### Forward compatibility

**Range grouping is now implemented:** Ctrl/Cmd+click consecutive siblings of
an associative Add/Multiply, preview their brackets, and commit while preserving
operand IDs. See `Developer Documentation/RANGE_GROUPING.md`. **Incremental Edit Expression** remains
future work: editing the full text and rebuilding still regenerates IDs. This
will matter for selective factorisation and inserting terms inside groups.

### Deliberate rearrangement previews (November 2026)

Dragging an addend or factor into a new position displays the proposed full
expression, including its operators. Its **blue, dashed destination box** is
itself a valid drop target once the movement has completed. Moving rapidly
between destinations does not interrupt a transition: the newest intention is
queued until the current movement finishes. Leaving the preview makes the
copied operands return smoothly to their original positions. The mathematical
tree stays unchanged during the whole gesture.

For safety and educational clarity, releasing the pointer while a new preview
is still animating does not commit an unseen order. Hold the pointer briefly
until the intended arrangement is visible, then release. Green numeric
combination and amber distribution are still separate actions. Hysteresis is
still disabled. For code-maintenance details see
[`Developer Documentation/REARRANGEMENT_TRANSITIONS.md`](../../Developer%20Documentation/REARRANGEMENT_TRANSITIONS.md).

## 2026-11-02: multiple selection and deliberate range grouping

The interface now supports Ctrl+click (Windows/Linux) or Cmd+click (Mac) on mathematical hitboxes. This creates a persistent multi-selection without moving terms, modifying the mathematical tree or creating history. Ctrl/Cmd may be released between clicks. Non-adjacent or non-sibling selections are allowed, but only consecutive siblings of one associative Add/Multiply parent produce a thin blue grouping envelope.

Click the envelope's border (or **Preview grouping** in the bracket toolbar) to enter a lightweight modal preview. Change the bracket style if desired. Click the prominent preview or **Confirm grouping** to commit. Escape, **Cancel**, or clicking elsewhere cancels the proposal but keeps the selection; Escape again clears it. Ordinary dragging is temporarily locked during the preview. The actual operation preserves original operand IDs and creates one history entry. See [`Developer Documentation/RANGE_GROUPING.md`](../../Developer%20Documentation/RANGE_GROUPING.md) for module responsibilities, architectural decisions, invariants, and a browser testing checklist.

Run automated regression tests with `node --test tests/*.test.js` (no npm installation required).

### Factorisation scope (3 November 2026)

The default teaching policy requires a visible bracketed sum before extraction.
Both deliberately entered `Group` brackets and automatic precedence brackets
inside a multiplication count. An unbracketed standalone sum must be grouped
first. The pure mathematical rule can handle all three; the restriction lives
in `js/teaching/factorisationPolicy.js`. See `Developer Documentation/FACTORISATION.md`.

### Factorisation explanatory preview (3 November 2026)

The modal factorisation preview now retains the original factors in faded form
and inserts an amber proposed factor on the same line, with persistent
converging arrows. The explanatory display is not the candidate expression;
only confirmation commits the independent mathematical result. See
`Developer Documentation/TRANSFORMATION_PREVIEW.md` and `Developer Documentation/ARCHITECTURE_DECISIONS.md`.

### Equality v1

Enter one top-level equality such as `a+b=c+d`. The two sides retain the existing algebra interactions independently. Use **Swap equality sides** to apply symmetry; directly comparable literal numbers show TRUE/FALSE feedback. See [EQUALITY_V1.md](../../Developer%20Documentation/EQUALITY_V1.md) for the mathematical model, architecture, tests and limitations. Run `node --test tests/*.test.js` (or `npm test` when npm is available) to execute the regression suite.

### History architecture

History remains snapshot-backed for fast undo/redo, but now records replayable,
versioned events and supports event-only export/hydration at the module level.
See [EVENT_SOURCED_HISTORY.md](../../Developer%20Documentation/EVENT_SOURCED_HISTORY.md) for the design,
limitations and guidance for current document persistence and future compact exports.

### Architecture vocabulary

See [`Developer Documentation/TERMINOLOGY.md`](../../Developer%20Documentation/TERMINOLOGY.md) for the agreed names of the Mathematical AST, Mathematical Window/View, Manipulator, Engine, Document, and Workspace. These are conceptual responsibilities; existing JavaScript filenames are unchanged.

### Hitbox visibility
Use **Hitbox outlines** to switch between **Always visible** (default) and **On hover / selection**. Selected nodes and green/amber rule cues stay highlighted. Details: [HITBOX_VISIBILITY.md](../../Developer%20Documentation/HITBOX_VISIBILITY.md).


## Developer documentation

All architecture, feature and handover guides are organised in [Developer Documentation](../../Developer%20Documentation/README.md). The root README remains the project entry point.

## Multiple-document workspace

Create a named document from the **Documents** panel, enter an expression or equation, and use the existing Mathematical Manipulator. Documents autosave to browser-local IndexedDB after committed changes; **Save** is also available. **Close** keeps the saved document; **Delete** removes it after confirmation. Use **Export JSON** to keep a portable backup and **Import JSON** to restore it. Browser storage depends on the site address/port and browser profile and can be cleared. Technical handover: `Developer Documentation/WORKSPACE_V1.md`.

The toolbar supports dragging **+0** or **×1** onto a term edge or a matching associative operator. An amber inline preview must be confirmed before it changes the document. See [identity toolbar developer notes](../../Developer%20Documentation/IDENTITY_TOOLBAR.md).
