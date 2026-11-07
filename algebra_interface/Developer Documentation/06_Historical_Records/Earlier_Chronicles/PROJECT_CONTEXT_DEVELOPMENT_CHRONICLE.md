# PROJECT_CONTEXT.md — Developer handover for the algebra interface

**Updated:** 4 November 2026  
**Release baseline:** Equality v1, multiple-document workspace, hybrid event history, identity toolbar, and equation-side distribution/grouping fixes. Earlier sections retain historical implementation notes.  
**Verification:** 143 automated Node tests passed for this release; real-browser verification is still required for untested interactions. Run `npm test` to establish the current count after future changes.  
**Current status:** see [CURRENT_STATUS.md](../Archive/CURRENT_STATUS.md) for the consolidated implemented/planned distinction.
**Authority:** the source files in this archive are authoritative. This document is a handover, not a substitute for reading code.

## 1. Vision and teaching philosophy

Build a **downloadable, offline-capable mathematics and physics teaching website** that works from a local server, can be shared through GitHub or USB, and does not depend on a hosted service. It should make mathematical reasoning *visible and manipulable*: students select terms and factors, propose valid transformations, inspect previews, confirm deliberate actions, and understand which mathematical rule justified each step.

This is **not** merely a LaTeX editor, computer algebra system or digital whiteboard. The emphasis is on student agency, mathematical correctness and a playful but comprehensible interface. Longer-term topics include algebra, functions, trigonometry, geometry, complex numbers, vectors, matrices, mechanics and relativity. Fractions, powers, roots, calculus, graphing and two-dimensional notation are future work.

## 2. Technology and getting started

- Plain HTML, CSS and JavaScript **ES modules**, with no mandatory front-end framework or network dependency.
- On Windows, use `start-local-server.bat` if available; otherwise run `py -m http.server 8000` from the project root. Alternatively run `python -m http.server 8000`.
- Open `http://localhost:8000/`. Do **not** open `index.html` with `file://`, because browser module imports need HTTP.
- Run `npm test` or `node --test tests/*.test.js` with Node.js installed. There is no `npm install` requirement for the project's own modules.
- If a browser appears to show an old version, check that the correct extracted directory is being served and reload it. A slow-loading local server previously caused apparent drag instability.

## 3. Current functionality — implemented in this release

- Nested `Add` and `Multiply` expression trees, `Number`, `Symbol`, `Negate` and explicit `Group` nodes. Explicit bracket styles `()`, `[]`, `{}` are preserved; automatic parentheses may be added for precedence without inserting a `Group` node.
- Parser with matching-bracket errors; partial negative-number handling. General symbolic subtraction, functions, fractions, powers, roots, matrices and calculus are **not yet fully implemented**.
- Operation modules implement addend/factor reordering, numeric combination, `+0`, multiplication by `0` and `1`, and configurable commutativity and associativity checks. Rule-aware normalization does not flatten explicit `Group` boundaries.
- Left and right distribution with a **two-stage amber preview**; original addend IDs survive and copied factors get new IDs with provenance.
- Green numeric evaluation feedback; stable geometry for drag hit-testing; mathematical tree unchanged until drop; non-layout-changing overlays; deliberate blue rearrangement preview with queued transitions and smooth return. Hysteresis is prepared but **off**.
- **Range grouping:** Ctrl/Cmd+click persists a set of selected node IDs. Selection can include nonadjacent or cross-parent nodes, but only two or more **consecutive siblings** of an associative `Add` or `Multiply` can be range-grouped. A subtle dashed blue envelope appears; clicking its border or the toolbar enters a modal bracket preview. Confirm creates an explicit group, preserving operand IDs and recording one history entry. Cancel changes no mathematical state. Grouping the full range has special handling to preserve the existing product node when appropriate.
- **Factorisation:** Visibly bracketed sums of products can extract matching leftmost or rightmost factors. Ctrl/Cmd+click one factor from each product, then drag to the amber zone or use the preview toolbar. A complete candidate expression is rendered in normal layout during the modal preview, so the extracted factor cannot cover a neighbouring term. A brief source fade and converging arrows explain provenance; confirmation records many-to-one provenance, while cancellation restores the original DOM/tree/selection. See `FACTORISATION.md`.
- Tree-snapshot history with meaningful committed changes; temporary hover, drag, selection and previews should not generate history entries.

**Important limitations:** only the narrow, structurally exposed left/right factorisation rule is implemented; the default teaching policy requires visible brackets (explicit or mandatory). **Deliberate +0 / ×1 identity insertion is implemented via the toolbar**; coefficient decomposition and equivalent-expression replacement of identities remain future work. Incremental **Edit Expression** is not implemented: editing the full input and rebuilding the tree regenerates node IDs. Grouping and factorisation have automated tests and user-reported browser checks; further regression testing is needed for keyboard focus, narrow layouts, click-through and complex nested pointer behaviour.

## 4. Module map — where to look first

| Location | Main responsibility | Must not do |
| --- | --- | --- |
| `js/app.js` | Coordinate UI events, temporary modes, history, and call operation modules | Reimplement mathematical laws or infer meaning from CSS |
| `js/core/nodeFactory.js` | Create consistently shaped mathematical nodes and IDs | Decide when algebraic transformations are permitted |
| `js/core/parser.js` | Parse input text and explicit bracket styles into a tree | Preserve IDs when rebuilding from unrelated text |
| `js/core/treeUtils.js` | Generic traversal, lookup, replacement and cloning | Assume every operation is associative or commutative |
| `js/core/normalization.js` | Connect generic tree normalization to operator-specific permissions | Silently delete explicit groups |
| `js/core/operatorMetadata.js` | Precedence, operand-position and display-bracket rules | Create actual mathematical Group nodes merely for display |
| `js/core/mathJson.js` | Mathematical interchange conversion | Treat visual IDs or DOM hitboxes as mathematical meaning |
| `js/operations/addition.js` | Addition rules, applicability, reordering, associativity | Access DOM coordinates |
| `js/operations/multiplication.js` | Multiplication rules, identities, commutativity, associativity | Access DOM coordinates |
| `js/operations/distribution.js` | Left/right expansion and copied-factor provenance | Assume factors commute |
| `js/teaching/factorisationPolicy.js` | Decide whether a mathematically valid factorisation has an acceptable visible grouping boundary | Define distributive algebra or manipulate DOM |
| `js/operations/factorisation.js` | Validate and apply left/right extraction atomically with provenance | Access DOM, silently commute or invent identities |
| `js/core/structuralEquality.js` | Compare factor subtrees ignoring IDs and visual Group style | Assume mathematical equivalence from commutativity |
| `js/interaction/factorisationPreview.js` | Position a small pre-drop extraction zone, avoiding other hitboxes | Render a result factor over the equation |
| `js/interaction/transformationPreview.js` | Generic candidate-expression display, short-lived provenance graphics, accessible confirmation, exact DOM restoration | Change mathematical rules or history |
| `js/operations/grouping.js` | Validate range/single-node grouping and perform atomic structural edit | Interpret mouse events or draw brackets |
| `js/rendering/domRenderer.js` | Render the tree as mathematical DOM and nested hitboxes | Decide mathematical permissions |
| `js/interaction/hitTesting.js` | Capture stable rectangles and determine pointer targets | Modify mathematical nodes |
| `js/interaction/dragFeedback.js` | Show hover colours and insertion feedback | Perform transformations |
| `js/interaction/rearrangementPreview.js` | Inert proposed operand order and transitions | Commit a mathematical reorder |
| `js/interaction/selection.js` | Store selected node IDs and resolve nested-selection conflicts | Decide whether selected nodes may be grouped |
| `js/interaction/groupingPreview.js` | Non-layout-changing range envelope and modal preview | Edit the expression tree |
| `tests/` | Mathematical and interaction-helper regression tests | Substitute for actual browser interaction checks |

## 5. Core invariants — preserve these in future changes

1. **Mathematical truth is the expression tree**, not rendered HTML or a flat string. DOM elements and hitboxes reference nodes by stable IDs.
2. **Selection is not a mathematical transformation.** Ctrl/Cmd+click may select arbitrary nodes; it does not imply that a particular rule applies.
3. **One rule, one committed edit, one history entry.** Previews and pointer motion must not mutate the tree or history. Revalidate eligibility at commit.
4. **Only mathematical operation modules grant permissions.** Associativity permits eligible flattening/regrouping; commutativity permits reordering. Noncommutative distribution preserves factor order.
5. **Explicit groups are intentional.** Their bracket style survives. Display-only parentheses must not be mistaken for user-created groups.
6. **Preserve IDs of unaffected and moved nodes.** Copying a factor during distribution creates new IDs and provenance. Range grouping creates structural IDs while reusing original operands.
7. **Keep hit-testing stable.** Hover colours, previews and animations must not move the geometry used to decide an operation. Avoid rebuilding the equation on every pointer move.
8. **Modes must be deliberate and escapable.** Range-grouping preview locks conflicting drags; Escape/outside click cancels without mathematical changes. Hysteresis stays disabled unless evidence justifies enabling it.
9. **Keep mathematical logic testable without a browser.** UI tests should separately cover event handling, DOM geometry and animation timing.

## 6. Range grouping: current interaction and extension points

1. Ctrl/Cmd+click multiple operands; releasing the modifier does not clear selection. Ordinary click outside clears selection.
2. Selection remains valid even for nonadjacent or cross-parent nodes. Only an eligible adjacent sibling range under an associative `Add`/`Multiply` gets a dashed blue envelope.
3. Click the envelope's border or the **Preview grouping** toolbar action. During preview, normal drag/drop is temporarily locked and bracket style may be changed.
4. Click the highlighted preview or **Confirm grouping** to commit; click elsewhere or Escape to cancel and retain selection. Escape again clears selection.
5. A proper range produces a new inner operation and `Group`; existing operands keep IDs. Full-range grouping may wrap the existing operation to preserve its ID. The history entry records the transformation.

See `RANGE_GROUPING.md` for algorithm, code entry points, click-through geometry, edge cases, and the browser test checklist.

## 7. What to test before accepting a new release

Run `npm test` and JavaScript syntax checks; record the exact results. In a real browser, manually test:

- `a+b+c+d`: Ctrl+click `b`, `c`; preview, switch bracket styles, confirm, undo, redo. Select `a`, `c`: no grouping envelope.
- Nested/grouped expressions and whole-product range grouping; verify original operand IDs and explicit brackets survive.
- `3*(4*5+6)*(7+8)`: drag `3` over the first group; no jitter, correct green/amber feedback.
- `a+b+c`: drag `a` between `b`, `c`; preview `b+a+c`, with visible operators and a stable return on cancel.
- `a*(b+c+d)` and `(a+b)*c`: preview and confirm distribution; factor order remains valid when multiplication commutativity is disabled.
- `0+a`, `0*a`, `1*a` in both drag directions; cancel a drag with Escape.
- Resize, zoom, scroll, dark mode, wrapped expressions, focus/keyboard, and reduced-motion behaviour.

The current release has **143 passing automated tests** (verified 4 November 2026). Earlier milestones had smaller suites; those historical counts are not the current baseline. Automated tests do **not** prove browser interactions are correct.

## 8. Future roadmap and unresolved decisions

**Near term:** consolidate Workspace v1 (including deeper import validation and optional compact history exports), verify browser interactions, then develop cross-document source selection and justified operations on both sides of equality. Factorisation and range grouping are already implemented; preserve their noncommutative restrictions and explanatory amber previews.

**Important reminder:** incremental **Edit Expression** should preserve existing node IDs when inserting, replacing or editing a local subtree. Full **Build expression** from text still creates a fresh tree. Revisit this before introducing extensive structural editing or insertion inside nested groups.

**Later:** Shift+click range selection; optional subtle hitbox shading (on-hover visibility is already implemented); general two-dimensional role-based layout for fractions, powers, roots and matrices; type/dimension checks; domain assumptions; variable binding in integrals and sums; lineage browsing; touch/keyboard accessibility; real-browser automated interaction tests; performance for large expressions.

**Rule extensibility (deferred):** Prefer DOM-independent rule modules with
separate applicability checks and atomic apply functions returning structured
results and node provenance. In the future, teachers might compose validated
rules into shortcuts or advanced developers might register custom rule modules;
these systems are **not implemented**. See `FUTURE_FEATURES.md` and
`ARCHITECTURE_DECISIONS.md`.

Consult `FUTURE_FEATURES.md` for a detailed backlog. A listed idea is not an approved implementation requirement until discussed.

## 9. Documentation index and handover workflow

- `README.md`: quick start, supported interactions and general orientation.
- **`PROJECT_CONTEXT.md` (this file):** first document for a new maintainer or a new ChatGPT conversation.
- `ARCHITECTURE_DECISIONS.md`: *why* major design choices were made, trade-offs and invariants.
- `INTERACTION_ARCHITECTURE.md`: stable geometry, drag state and visual feedback.
- `REARRANGEMENT_TRANSITIONS.md`: queued rearrangement animations and preview targeting.
- `RANGE_GROUPING.md`: multi-selection and modal range-grouping design.
- `DISTRIBUTION_IMPLEMENTATION_GUIDE.md`: distributive law and provenance.
- `FUTURE_FEATURES.md`: deferred ideas, risks and prerequisites.

**Safe workflow for future developers:** inspect the actual files first; discuss proposed design before major rewrites; change one coherent responsibility at a time; comment functions with their purpose, parameters, return values, assumptions and limitations; test mathematical logic independently of DOM; run regression tests; verify visual interactions in a real browser; update these Markdown files; deliver a complete Windows-friendly ZIP. Never claim browser verification or test success without actually performing it.

## Factorisation and future algebraic structures (2 November 2026)

The first factorisation implementation is intentionally narrow; read
`FACTORISATION.md` before changing it. Three mathematical distinctions should
be preserved in future modules:

1. **Associativity and commutativity are independent.** Grouping and extracting
   factors must never silently reorder a noncommutative product.
2. **Wrapping an existing subtree is not regrouping.** Adding `Group` around
   an existing expression is valid even for nonassociative operations, whereas
   creating a new inner operation from selected siblings may require
   associativity. The grouping rule is deliberately conservative.
3. **Matrices need types and dimensions.** Today's `Symbol`/`Multiply` model
   can preserve factor order, but matrix compatibility and scalar/matrix
   identities will need operator-specific type validation later.

Potential future extension: a common `check/apply` contract with structured
provenance, then composite macros made from existing trusted rules. This is
not implemented and should not be mistaken for a proof system.

## Handover update: full-expression transformation previews

The first factorisation preview used a fixed amber result factor outside the
brackets. It overlapped neighbouring terms in expressions such as
`(b*a+c*a+d*a)*f`. This has been replaced with a **generic modal preview**:
`app.js` constructs an independent candidate tree with final node IDs and
provenance; `domRenderer.js` lays it out normally in the complete expression;
`interaction/transformationPreview.js` manages DOM swapping, a short faded
source snapshot, decorative converging arrows, and click/keyboard confirmation.
Cancelling restores the original DOM objects and preserves selection; confirming
commits the already-created candidate as one history action. Normal drag
geometry remains stable and separate. Read `TRANSFORMATION_PREVIEW.md` before
changing this lifecycle. **Real-browser QA is outstanding.**

## Factorisation teaching policy versus mathematical eligibility (3 November 2026)

**Read this before changing factorisation eligibility.** `js/operations/factorisation.js`
checks only mathematical conditions: all addends of the same `Add` must explicitly
expose structurally identical leftmost or rightmost factors; the rule never
reorders factors or invents identities. It returns a plan even for an ungrouped
standalone `Add`. It preserves existing `Group` nodes when present; otherwise
it rewrites the `Add` directly and lets the renderer insert precedence brackets.

`js/teaching/factorisationPolicy.js` separately checks the educational scope
requirement. The default `visible-brackets` policy accepts either an explicit
`Group(Add(...))` or parentheses that the renderer **must** display because
`Add` occurs inside `Multiply`. It rejects a standalone unbracketed sum. Other
supported policies for future teacher configuration are `explicit-group` and
`any-add`; no settings UI exists yet. `app.js` checks policy before offering
extraction and again before committing a proposal. The pure mathematical
operation does not import the teaching policy.

The preview affordance now anchors to `plan.scopeNodeId`: the outer explicit
Group when present, otherwise the bracketed Add hitbox. Never assume
`plan.groupId` is non-null. Regression tests verify the two representations,
standalone teaching restriction, complete addend coverage, and ID preservation.


## Design update — explain transformations, not just outcomes (3 November 2026)

**Pedagogical principle:** A mathematical preview should explain **both what
changes and why**, not merely show the answer. For factorisation, the preferred
next UI revision is a persistent **single-line** explanatory preview like the
existing distribution preview: old common factors fade in place; overhead amber
arrows converge toward a new, clickable amber extracted factor positioned
outside the sum. Amber means a newly proposed occurrence; faded + arrow means
that an occurrence is moving/merging, not vanishing without explanation. Keep
this explanation visible until confirmation, rather than showing arrows only
for a fleeting animation. Avoid stacked original/result lines.

**Historical proposal, subsequently implemented.** The one-line explanatory factorisation preview now exists; see the later handover update and `FACTORISATION.md`.
Keep committed expression tree, history and drag hit-test geometry unchanged
during modal preview. Make the proposed factor fit through normal layout/reflow
without overlapping surrounding operands. See `ARCHITECTURE_DECISIONS.md`,
`FACTORISATION.md`, and `FUTURE_FEATURES.md`.

## Handover update — 3 November 2026: explanatory factorisation preview

The factorisation preview is now designed as a **one-line explanation**, not
just a before/after answer. Old selected factors remain visible but faded; a
new amber extracted factor appears in normal layout beside the sum; persistent
SVG arrows show their many-to-one provenance. The student confirms by clicking
the new factor or the toolbar, or cancels without changing tree/history.

Important division of labour: `operations/factorisation.js` creates a valid
candidate tree; `interaction/inlineExtractionVisual.js` constructs a temporary
visual-only composition; `interaction/transformationPreview.js` manages modal
preview and arrow graphics; `app.js` commits the separately stored candidate.
Never serialize or commit the explanatory DOM as mathematics. The general
principle is **show what changes and why, not only the result**.

Browser QA is still required for arrow placement, long/wrapped expressions,
scrolling, and complex nested bracket styles. The current test suite checks
structural DOM behaviour, not pixel-perfect browser layout.

### Drag preview boundary fix (2026-11-03)
Rearrangement destinations now retain ownership while the visual transition is
unsettled; settled preview hitboxes do not interpret their own interiors as a
request to return to the old ordering. See `INTERACTION_ARCHITECTURE.md` and
`tests/interaction.test.js`. Hysteresis remains disabled. Browser testing is
pending; this change does not affect mathematical rules or node identities.

## Equality v1 reconstruction (2026-11-03)

Equality v1 adds a binary scalar `Equal(left, right)` statement node, one-top-level-`=` parsing, separate expression interactions on either side, symmetry with stable IDs, conservative derived truth feedback, and a `MathematicalDocument` wrapper with metadata/history. The source code is divided between `core/nodeCategories.js`, `relations/equality.js`, the existing parser/tree/renderer/controller, and `core/mathematicalDocument.js`. Read **EQUALITY_V1.md** first for module boundaries, tests, limitations and handover guidance. Logical connectors, operations applied to both equation sides, and cross-document substitution remain future work. **Multiple documents and persistence are now implemented**; see `WORKSPACE_V1.md`.

## Handover note — History storage direction (2026-11-03)

Current history stores complete mathematical-tree snapshots, which make undo,
redo and branching reliable but duplicate unchanged nodes. A future option is
**event sourcing**: retain an initial tree and record each user action (rule ID,
version, target node IDs, inputs, generated IDs and provenance), then replay
those events to reconstruct later states. Pure replay risks slow navigation,
rule-version incompatibilities and broken node references; unrestricted free
edits also need replacement-subtree payloads. **Preferred direction:** keep
snapshots for now, enrich event metadata, and evaluate a hybrid of periodic
checkpoints plus replay after measuring real storage/performance costs.
History must remain separate from mathematical rule validation, UI previews,
and workspace persistence. See `ARCHITECTURE_DECISIONS.md` and
`FUTURE_FEATURES.md`.

## Event-sourced history foundation (implemented, 2026-11-03)

History now records **both** complete tree snapshots and versioned, replayable
transformation events. `js/core/documentHistory.js` owns branch links, state
IDs, event construction and deterministic data patches; `app.js` remains the
editor adapter. Undo/history navigation still loads snapshots immediately.
Event-only export and snapshot hydration remain history-library functions; **end-user document save/load is now implemented** via IndexedDB and full JSON export/import. Compact event-only document export is not yet the default. See `EVENT_SOURCED_HISTORY.md` for invariants,
known limitations and handover instructions. Future rule callers should supply
structured rule IDs, versions, parameters and provenance; never treat a free
edit or a variable-testing assignment as a mathematical proof.

## Agreed architectural vocabulary

Use **Mathematical AST**, **Expression Tree**, **Statement Tree**, **Mathematical Document**, and **Workspace** for mathematical data and organisation. Use **Mathematical Window** (visible container), **Mathematical View** (rendered content), and **Mathematical Manipulator** (umbrella interaction/presentation subsystem). The Manipulator coordinates a **Gesture Interpreter**, **Transformation Coordinator**, **Mathematical Renderer**, and **Transformation Visualiser**, consulting the independent **Mathematical Engine** and **Teaching Policy**. See [`TERMINOLOGY.md`](../Archive/TERMINOLOGY.md) for precise definitions and implemented-versus-proposed distinctions. The final product name remains undecided.

## Long-term accessibility and embeddability (planned, 2026-11-04)

**Pedagogy is the primary objective.** Performance, memory, packaging, and engineering metrics are tools for identifying barriers to learning, not ends in themselves. Preserve explanatory previews and mathematical clarity while measuring and addressing real performance problems, especially on low-end/offline devices.

The **Mathematical Engine** and **Mathematical Manipulator** may eventually be reusable JavaScript libraries embedded in other educational websites. Keep the Engine callable without browser/DOM dependencies. Keep the Manipulator's gesture, preview, rendering, and interaction state scoped to an instance rather than a single global `app.js`. This is a future goal, not a currently supported public API. See `FUTURE_FEATURES.md`.

## Hitbox visibility (implemented)
The Mathematical View offers Always visible and On hover / selection outlines. Only the deepest hovered hitbox is decorated; explicit single/multiple selections and green/amber rule feedback remain visible. Hitbox geometry and the AST never change. See `HITBOX_VISIBILITY.md`.

### Workspace v1 status

The application now starts with zero documents and supports creating/opening/switching/renaming/duplicating/closing/deleting, local IndexedDB saving and JSON import/export. The active Mathematical Manipulator is reused, with independent committed roots and histories per document. Cross-document selection and simultaneous interactive windows remain future features. See `WORKSPACE_V1.md`.

## Identity toolbar (implemented, browser verification pending)
A +0 / ×1 toolbar requests deliberate identity introduction through hitbox edges or matching associative operator gaps. The candidate is rendered inline in amber; only confirmation commits a tree and history event. See `IDENTITY_TOOLBAR.md`.

### Identity toolbar interaction update (2026-11-04)
Dragging +0 or ×1 now shows a floating amber tool and a stationary, amber-highlighted target with left/right or operator-gap hints. The full amber inline transformation appears only after a valid drop; confirmation alone commits the tree and history. See `IDENTITY_TOOLBAR.md`.

### Equality-side grouping renderer fix (2026-11-04)
Grouping every direct addend on either side of `=` can create a `Group` as that
side's root. The renderer now accepts this root and displays explicit brackets
immediately; rebuilding from the input is no longer required. Existing node IDs,
normalisation, and mathematical grouping rules are unchanged. See
`ARCHITECTURE_DECISIONS.md` and `tests/equality-root-rendering.test.js`.

## Documentation maintenance note (4 November 2026)

The 143-test baseline was reverified with `node --test tests/*.test.js` on this archive. Run the suite again after changing code; historical test counts in dated guides are not release baselines. Browser-verified behaviour reported by the project owner includes document switching, persistence across refresh, JSON import/export, closing windows, and identity-toolbar drag feedback; other complex pointer paths still warrant regression checks. Older design sections are preserved for decision history, but **later status updates supersede earlier planned/not-implemented labels**. For current capabilities consult this file, `WORKSPACE_V1.md`, `IDENTITY_TOOLBAR.md`, and the source.
