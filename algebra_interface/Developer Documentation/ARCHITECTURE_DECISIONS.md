# Architecture decisions — algebra interface

**Originally compiled:** 2 November 2026; later addenda extend this record

This is a record of the *why* behind our software architecture, not merely a
list of file contents. When changing a decision, update this file and the
nearby code comments. The project is an offline mathematics teaching tool, so
visual intelligibility is a functional requirement, not just decoration.

## ADR-001 — The expression tree is the mathematical source of truth

**Status:** Accepted.

Mathematical expressions are stored as `Number`, `Symbol`, `Add`, `Multiply`,
`Group`, etc. nodes with stable IDs. DOM elements and textual input are views.
Applying a rule changes the tree; moving a mouse or viewing a preview does not.

**Trade-off:** There is some coordination code in `app.js`, but UI bugs cannot
accidentally redefine mathematical meaning simply by rebuilding HTML.

## ADR-002 — Mathematical permissions belong to operation modules

**Status:** Accepted.

Commutativity, associativity, identities (+0, *0, *1), and distribution are
validated by operation-specific modules. `app.js` coordinates those modules;
`hitTesting.js` detects geometry and knows nothing about algebraic laws.

**Example:** Factor reordering must respect noncommutativity even when the
pointer is visually over a valid insertion area.

## ADR-003 — Explicit brackets differ from automatic precedence brackets

**Status:** Accepted.

An authored `Group` is an identifiable node whose brackets move with it.
Automatic parentheses are inserted by the renderer to maintain the expression's
meaning; they do not create mathematical nodes. Explicit groups survive
normalisation. This separation is needed for future grouping and factorisation.

## ADR-004 — Dragging is a tentative gesture; commit only on release

**Status:** Accepted, stable drag refactor.

`startDrag()` records a source ID and captures geometry, but does NOT remove
it from its parent. Drag cancellation discards temporary UI state. Only
`finishDrag()` may perform a permitted rewrite and create a history entry.
The pointer cannot create partial edits to the mathematical tree.

**Alternative rejected:** Remove the source operand from the tree at drag start
and reinsert it on cancellation. This made the displayed expression's layout
and target geometry depend on tentative interaction state.

## ADR-005 — Hit testing must not depend on moving preview geometry

**Status:** Accepted.

`hitTesting.js` stores target rectangles at the start of a gesture and refreshes
them only for genuine layout changes such as scrolling or resizing. Pointer
movement only uses those captured rectangles. Hysteresis is structurally
available but DISABLED by default; it cannot be used to hide geometry bugs.

**Alternative rejected:** Repeatedly rebuild the equation or reread displaced
hitboxes while a pointer hovers. This was fragile and could cause jitter.

## ADR-006 — An expressive preview is a separate decorative view

**Status:** Accepted, implemented 1 November 2026.

Students should see the actual proposed result, e.g. dragging `a` in `a+b+c`
into the gap between `b` and `c` should show **`b+a+c`** with both plus signs,
not merely a thin insertion marker. This is pedagogically important.

`interaction/rearrangementPreview.js` clones ONLY the affected Add/Multiply
sequence into a non-interactive overlay and rearranges its existing visual
children. The original sequence is temporarily transparent but remains in
normal document flow, at exactly the same geometry. The overlay uses
`pointer-events:none`, `aria-hidden`, and `inert`, so it cannot steal focus or
become a drop target. Gentle visual animation is applied ONLY to clones and
respects reduced-motion settings. There are no temporary mathematical nodes,
changed IDs, or history entries.

`dragFeedback.js` switches between blue rearrangement, green numeric combination,
and amber distribution without requesting a full expression re-render. The
plain thin insertion marker remains as a fallback if an unusual DOM layout
cannot be represented by the clone preview.

**Important:** All mathematics still belongs to operation modules. The overlay
has no permission to change factor order unless `app.js` has already checked
`canReorderAddend()` or `canReorderFactor()`.

**Trade-offs:** A temporary visual clone duplicates some DOM markup. That is
acceptable because it exists only during one drag, is inert, and is more
predictable than mutating real hitboxes. When fractions, roots or exponents
arrive, add specialised preview adapters rather than assuming every layout is
a simple row of sibling factors.

## ADR-007 — Distinct visual meanings for algebraic interactions

**Status:** Accepted.

Green is an eligible numerical/identity combination, amber is an eligible
structural distribution rule, and blue is a proposed rearrangement. Visual
feedback must not alter hit-testing geometry. The amber distribution preview
requires an additional user confirmation; the rearrangement commits on drop.

## ADR-008 — Stable node provenance is a future design constraint

**Status:** Accepted as a constraint; full history tracing is deferred.

Existing operand IDs survive local reorders and most structural edits.
Distribution creates new copied factor IDs and records their source IDs.
**Implemented range grouping** reuses existing operand IDs. Future incremental **Edit Expression** should likewise reuse existing nodes rather than reparsing the whole expression.

See `FUTURE_FEATURES.md` for prerequisites and design questions.

## ADR-009 — Visual drop targets follow settled previews; animations do not restart on every pointer move

**Status:** Accepted, 1 November 2026.

An expressive preview is useful only if its *visible* destination can be
selected. Original hitbox coordinates remain the authoritative stationary
reference, but once a rearrangement clone settles, the interaction module may
capture a **separate, stable snapshot of its displayed rectangles**. The
visible moved operand is then itself a valid insertion destination. No hit-test
sampling is performed during animation frames.

For clarity, a running rearrangement transition is never interrupted merely
because the pointer quickly crosses another gap. A latest-wins queue records
the newest intention, applied after the current transition completes. When the
pointer leaves the preview, the clone returns towards the unchanged original
hitboxes before revealing the original display.

**Safety condition:** A mathematical drop may commit only a rule-authorised
outcome that is fully displayed. Releasing during an unfinished/queued preview
cancels rather than silently applying an unseen order. Escape, blur and pointer
cancellation always perform immediate cleanup for safety and reliability.

**Trade-off:** Rapid movements may feel deliberately slower (roughly 165 ms per
preview move, 195 ms return). Learning clarity is preferred over immediate
response to every cursor movement. Hysteresis stays OFF.

See `REARRANGEMENT_TRANSITIONS.md` for implementation and regression tests.

## 2026-11-02 — Persistent selection and deliberate range grouping

**Decision.** Ctrl/Cmd+click stores arbitrary selected node IDs separately from the mathematical tree. A mathematical range-grouping proposal exists only for consecutive siblings of the same associative Add/Multiply parent. The student deliberately enters a lightweight modal preview by clicking a thin envelope border or the toolbar, and commits by clicking the preview or Confirm. Outside click/Escape cancels the preview while retaining the selection.

**Why.** This separates the general *ability to select* from the much narrower *permission to regroup*. It supports future factorisation (matching factors in different products) without silently moving addends. Preview mode avoids competing pointer targets, and a fixed overlay keeps the established drag geometry unchanged. The operation module, not the UI, owns associativity and the tree rewrite.

**Consequences.** New `interaction/selection.js` and `interaction/groupingPreview.js`; extended `operations/grouping.js`. The app coordinates the modal lifecycle. Proper-range grouping creates a new inner operation and Group; full-range grouping of a non-root operation wraps the existing operation to preserve its ID. The history entry records preserved and created IDs. See `RANGE_GROUPING.md`.

**Trade-offs.** The preview requires an extra deliberate click, but avoids accidental grouping. The thin border has a wider pointer target and a toolbar alternative. The first version uses a row-based geometry heuristic, not a general two-dimensional layout engine. No global hysteresis is enabled. Browser interaction verification is still required.

## 2026-11-02 — Direction for reusable mathematical rules (proposal; deferred)

**Design intention, not implemented:** Keep mathematical permissions and
transformations in DOM-independent rule modules. As new operations are added,
aim for a consistent check/apply contract returning an atomic result with
node-ID provenance. This would support future teacher-defined shortcuts made
from sequences of already validated rules, without bypassing commutativity,
associativity, or other assumptions. Avoid building a macro engine or plugin
loader until concrete teaching use cases justify it. See `FUTURE_FEATURES.md`.

## ADR — Narrow factorisation and explicit extraction previews

**Status:** Accepted (initial implementation, 2 November 2026).

Factorisation has independent left/right rules and never invokes
commutativity, identity insertion, or coefficient decomposition implicitly.
The student exposes matching end-factors in an explicitly grouped sum, then
selects and extracts them. A pure rule validates and constructs an independent
new tree with provenance; a fixed overlay handles amber extraction zones,
source fading, and converging arrows without moving mathematical hitboxes.

**Trade-off:** `ab+a` and `ab+ca` are not direct shortcuts. They will become
available through explicit preparatory steps when identity insertion and
other rules exist. This is deliberate pedagogy, not a parser limitation.

**Future algebraic structure:** Associativity and commutativity remain
independent; wrapping a subtree never assumes associativity. Matrix shapes,
scalar/matrix identities, and more general algebraic types require later
validation. A uniform rule protocol and teacher-defined composite macros
remain design goals, not implemented capabilities.

## ADR — Render full candidate trees during deliberate previews (2 November 2026)

**Status: Accepted, implemented for factorisation.** A fixed-position amber
result factor overlapped neighbouring operands. Rather than inventing more
pixel-offset rules, construct an independent proposed expression tree and
render it with the normal mathematical DOM renderer while in modal preview.
Only the small *pre-drop* extraction affordance uses absolute positioning.
Short-lived source fading and provenance arrows are decorative and do not
participate in layout or hit-testing.

**Invariant:** Committed tree and history are untouched during preview.
Cancelling restores the original DOM and selection. Confirmation rechecks
applicability, then commits the exact candidate already displayed (including
its IDs and provenance), once. The renderer is reusable for future 2-D
structures; mathematical rule modules remain DOM-independent.

**Trade-off:** The entire candidate DOM is rendered for now. Future local
subtree reflow is a possible performance optimisation, not a prerequisite.
Real-browser layout and pointer QA are still required. See
`TRANSFORMATION_PREVIEW.md`.

## 2026-11-03 — Separate factorisation mathematics from teaching scope

Mathematical distributivity does not require an explicit `Group` node. The
operation planner checks matching end-factors, while a separate pure teaching
policy controls whether a student has established an acceptable visual scope.
Default: explicit Group OR precedence-required brackets. A standalone sum must
be grouped first. This keeps the mathematical API reusable for macros, teacher
settings, and future two-dimensional notation without silently removing the
pedagogical grouping exercise. `scopeNodeId` is used for the extraction overlay;
`groupId` is optional. The renderer, not the algebra, supplies mandatory brackets.


## ADR — Explanatory, single-line factorisation previews (3 November 2026)

**Status: Implemented.** The single-line factorisation preview now uses this design; retain the following as its rationale. A transformation preview
should explain **what changes and why**, not merely display the final answer.
For factorisation, prefer the established one-line distribution-preview visual
language rather than two stacked before/after equations. Example:

- Original: `(45*5 + 45*9)`
- Transient preview: an amber `45` appears outside the sum, while both original
  `45` occurrences remain visible but faded inside the sum. Persistent amber
  overhead arrows converge from those source occurrences to the new `45`.
- Confirmation: commit `45*(5+9)` as a single mathematical transformation.
  Cancellation: restore the original display and retain selection.

**Visual semantics:** amber = newly proposed occurrence/result of a rule;
faded source = occurrence that will cease to exist at its old location;
faded source **plus a provenance arrow** = movement/convergence into the
proposed occurrence, not unexplained deletion. The selected residual terms
remain visually stable and recognisable. Keep the explanation visible until
confirmation; do not rely on a brief timed animation.

**Layout and interaction invariant:** the preview is modal and must not mutate
the committed tree or history. The original mathematical expression must not
be covered by floating extraction controls. Render the transient addition of
the proposed factor in-context using normal layout/reflow, with overhead SVG
arrows in a non-layout-affecting layer. Avoid a second stacked equation. A
future 2-D renderer must keep provenance graphics separate from layout and
hit-testing. The generic transformation-preview coordinator should own
confirm/cancel, while factorisation-specific presentation describes which
nodes fade and which provenance edges to draw.

This refines, rather than reverses, the 2 November decision to render candidate
expressions with the ordinary renderer: the final proposed tree remains the
source of truth for confirmation, while the **explanatory transient visual**
shows both the sources and the destination before committing.

## 3 November 2026 — Keep explanatory previews separate from candidate trees

**Decision:** Factorisation uses a one-line, modal explanatory DOM composition:
original source factors remain visible but faded; a new amber factor is placed
in normal flow; persistent overhead arrows converge toward it. The mathematical
rule independently produces the correct candidate tree and provenance. The
visual explanation is not itself a valid expression tree and must never be
committed, parsed, evaluated or written to history.

**Rationale:** A preview should explain **what changes and why**, not merely
show the answer. Students need time to compare source and destination. This
recovers the pedagogy of the distribution preview without fixed-position
overlap or changes to ordinary drag hit-testing.

**Module boundary:** `inlineExtractionVisual.js` composes rendered DOM only;
`transformationPreview.js` owns modal confirmation/cancellation and arrows;
`factorisation.js` owns mathematical validity and provenance; `app.js` commits
only the independently stored candidate. Future 2-D operators can use other
visual-composition strategies behind the same preview lifecycle.


## Rearrangement destination ownership (2026-11-03)

**Observed browser regression:** dragging `a` over `b` in `a+b+c` could briefly
show `b+a+c`, then jump back to the original order until the pointer moved
farther. The same symptom occurred with multiplication.

**Cause and fix:** the displayed preview and original expression intentionally
use different geometry snapshots. While an animation runs, the preview has no
settled geometry; original geometry may therefore temporarily propose the
source's original index. `retainInsertionDuringTransition()` keeps the last
requested insertion in that narrow case, rather than treating it as a new
instruction. Once settled, `hitTestVisibleInsertion()` treats the *interior*
of a displayed sibling as belonging to the currently visible destination;
only an actual insertion edge/gap proposes a different destination. This is
**destination ownership, not general hysteresis**. Green numeric evaluation,
amber distribution, deliberate departure from the equation and explicit new
gap targets remain available.

**Module boundaries:** `hitTesting.js` owns these pure geometry decisions;
`rearrangementPreview.js` owns animation and settled geometry;
`dragFeedback.js` exposes animation phase without changing math; `app.js`
coordinates the decisions and commits only valid, settled rearrangements.
No expression nodes or IDs change during drag. The fix adds regression tests
in `tests/interaction.test.js`; real-browser pointer verification is still
required. In particular test slow and fast crossing in `a+b+c` and `a*b*c`.

## 2026-11-03 — No duplicate animation on pointer-reorder commit

**Decision:** A successful drag reorder commits directly to the already-previewed
order without running the generic post-render FLIP animation. Preview animation
and commit rendering are separate responsibilities. This applies to both `Add`
and `Multiply`; it does not alter mathematical validity or history.

## Equality v1: statement roots and document ownership (2026-11-03)

- An expression denotes a value; a relation is a statement. `Equal` accepts exactly two scalar expressions, never statements as arithmetic operands. Syntactic categories and future scalar/matrix/Boolean **value types** must remain distinct.
- `Equal` has named `left`/`right` children. Generic traversal and normalisation explicitly handle these children; arithmetic rules remain independent.
- Truth status is a **derived check**, not persistent mathematical content. Reflexivity and literal numeric comparison have separate justifications; `unknown` is not `false`.
- A Mathematical Document wraps one root object and branch-ready history. History states/events get stable identifiers and edit kinds. Cross-document provenance should refer to immutable historical source states.
- The equality sign is a drag boundary; symmetry is a relation-level rule invoked through a contextual button, not an implicit cross-equals drag.

## 2026-11-03 — Prepare history for event sourcing without replacing snapshots

**Decision for the next refactor:** preserve full tree snapshots as the reliable
restoration path while standardising transformation events for possible replay.
Each event should eventually record a stable event/state ID, parent-state link,
edit kind (`rule-transform` versus `free-edit`), rule ID and version, target IDs,
inputs, generated IDs, provenance, and a schema version. Historical node IDs
must remain stable; source references across documents must include document,
state and node IDs. Events describe *why/how* a state changed; snapshots record
*what* it was. The history manager must not perform mathematical validation.

**Trade-off:** event-only history can save space and improve auditability but
requires deterministic/version-compatible replay, costs time when navigating,
and can fail if a past rule changes. Future hybrid checkpointing limits replay
length; immutable structural sharing is another option but requires careful
handling of in-place tree mutations. Do not adopt either optimization without
profiling and compatibility tests. Branch edges and cross-document provenance
are distinct relationships.

## Hybrid snapshot + event history (implemented foundation)

Keep full snapshots for reliable instant undo/redo and branching. Record a
versioned event with each committed state, including explicit rule metadata
when available, generated IDs, provenance and a deterministic structural patch.
Reconstruct history from **recorded data changes**, not by rerunning potentially
changed mathematical modules. This preserves historical outcomes and supports
future compact persistence, periodic checkpoints and cross-document references.
The core manager lives in `js/core/documentHistory.js`; mathematical validity
remains the responsibility of rule modules. See `EVENT_SOURCED_HISTORY.md`.

## Terminology: Manipulator and presentation boundaries (2026-11-04)

Adopt **Mathematical Manipulator** as the umbrella interactive subsystem, not as a monolithic implementation. The **Gesture Interpreter** proposes intentions from input and hit-test geometry; the **Transformation Coordinator** requests validation from the independent Mathematical Engine and Teaching Policy; the **Mathematical Renderer** lays out AST content; the **Transformation Visualiser** explains proposed changes. The **Mathematical Window** contains a **Mathematical View**, which may be read-only or manipulable. A **Mathematical Editor** specifically denotes free editing, not rule-based manipulation. Keep the Engine independent of DOM/pointer details and record history only on commit. Full glossary: [`TERMINOLOGY.md`](TERMINOLOGY.md).

## Embeddable Engine and Manipulator: architectural guardrails (planned, 2026-11-04)

- Keep mathematical validity, AST operations, and teaching-policy decisions independent of the browser and host website; allow the Engine to run in tests or other applications.
- Treat the Manipulator as a **coordinating subsystem**, not a single oversized file. Separate gesture interpretation, transformation coordination, rendering, and visual explanation.
- A future host should mount a Manipulator into a supplied container, configure it, receive committed-transformation events, read/set its mathematical content, and destroy it cleanly. These APIs are proposals, **not implemented**.
- Scope selection, dragging, event listeners, overlays, styles, and animation cleanup per instance. Multiple independent Manipulators must not interfere on the same page.
- Keep Mathematical Documents and workspace persistence outside the reusable Manipulator, so hosts can provide their own storage. Avoid prematurely freezing public APIs or splitting into packages before actual integration needs justify it.
- Accessibility and teaching clarity take priority over optimising arbitrary metrics. Benchmark representative low-end devices and retain meaningful visual explanations in reduced-motion modes.

## Hitbox visibility is presentation state
A dedicated hover-decoration controller resolves one innermost target, while selection and rule-specific feedback remain independent. The CSS hides ordinary border colours without changing box dimensions or drag geometry. Do not move this concern into mathematical rules. See `HITBOX_VISIBILITY.md`.

## Workspace v1 ownership

Documents own committed AST, variable assignments, history and metadata; the Manipulator owns temporary gesture/preview state. IndexedDB is hidden behind a repository API. One active Manipulator is mounted at a time; document switching discards transient interaction state, never mathematical history. Cross-document selection will be a separate workspace-level interaction model. See `WORKSPACE_V1.md`.

## Identity insertion boundary
Identity introduction is a pure mathematical tree rewrite (`operations/identityInsertion.js`) invoked by a toolbar gesture, with a separate presentation-only candidate overlay (`interaction/identityTool.js`). Operator associativity controls gap insertion. Existing IDs survive; preview never commits. This is the starting point for future typed identities and general structural editing.

## Identity toolbar: stationary hover, deliberate post-drop preview (2026-11-04)
Toolbar dragging displays a pointer-transparent amber ghost, paints only the valid original target, and updates a hint. It must not render a proposed equation during hover, because changing visual geometry while hit-testing can destabilise interactions. A valid drop enters the normal modal explanatory preview; only confirmation commits a tree/history change. `identityDragFeedback.js` owns transient paint, while `identityTool.js` owns post-drop preview.

### Transformations inside statement roots (2026-11-04)

Mathematical rewrite rules must validate the relevant target subtree, not require the document root to be a particular arithmetic operator. An expression may be nested under `Equal` or future logical statement nodes. Keep parent-child replacement generic, preserve unrelated subtrees and IDs, and regression-test confirmation separately from visual preview eligibility.

### Equality-side root rendering (2026-11-04)
A relation's left/right child may be **any valid expression root**, not only `Add`.
Range grouping all operands of an `Add` immediately under `Equal` deliberately
replaces that side with `Group(Add(...))`, preserving the original `Add` and
operand IDs. `domRenderer.renderExpression()` must display the explicit Group
brackets immediately, with the nested operation remaining interactive. Never
silently unwrap such roots or rely on rebuilding from the text input to make
brackets appear. Root rendering is presentation-only; mathematical eligibility
remains in the grouping and operation modules. Regression tests cover both sides.
