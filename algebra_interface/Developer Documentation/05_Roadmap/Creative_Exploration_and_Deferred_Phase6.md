# Creative exploration backlog — Phase 6 deferred

**Status: exploratory, not approved implementation architecture.** This is the authoritative record of recent creative ideas; retain earlier feature-roadmap records as historical or supplementary, not competing decisions.

Current status lives in [Current Status](../00_Current/Status.md). Do not silently start Phase 6. Decisions on layers and teaching policy live in the [architecture blueprint](../02_Architecture/Architecture_Blueprint.md), which takes precedence over the exploratory notes here.

## Idea decision tracker (exploration, not implementation authorization)

| Idea | Current disposition | Important open decisions |
| --- | --- | --- |
| Usable without a pointer; keyboard shortcuts for everyone | **Owner-decided principle; design pending** | Definition of current location, action sequence, keys, conflicts with structure navigation. |
| Natural gestures with adjustable reasoning depth | **Owner-favoured educational direction; exploratory design** | Per-transformation requirements, presets, how reasoning is shown versus required. |
| Cross-equality transposition | **Owner-favoured teaching-policy possibility** | Mathematical scope, inverse-operation steps, assumptions, exact preview/confirmation behaviour. |
| Automatic equality operation cycling | **Owner-preferred exploratory gesture** | Hitbox exit semantics, cycling feedback, keyboard/menu alternatives, accidental boundary crossings, mathematical eligibility. |
| Floating mathematical clipboard | **Exploratory interface concept** | Window/view relationship, sizing, drag ghosts, scroll and focus behaviour. |
| Structural differentials and full substitution | **Exploratory mathematical requirement** | Differential semantics, variable dependencies, bounds and domain/orientation handling. |
| Verified derivation export (LaTeX / Word) | **Exploratory teacher-authoring use case** | History selection, provenance, output formats and verification/completeness labels. |
| Input-independent interaction and enlarged touch targets | **Owner-favoured exploratory accessibility direction** | Separate typography, interactive geometry and assisted input; actual touch/pen/switch testing. |
| Semantic cycling of overlapping targets | **Owner-favoured exploratory interaction** | Initial 2-second dwell proposal, candidate-set stability, cancellation, confirmation, alternate timing. |
| Guided versus exploratory target discovery | **Owner-favoured teaching-policy concept** | Eligible-only vs meaningful-but-ineligible candidates; hint progression and restrictions. |
| Arrow-key takeover of automatic cycling | **Owner-preferred exploratory interaction** | Arrow direction, focus/pointer coordination, stable manual selection, accessible on-screen alternative. |
| Renderer determinism and mandatory grouping | **Owner-endorsed architectural principle; design clarification** | Precedence-sensitive mandatory brackets, preservation of explicit grouping, precise renderer input contract. |
| Teaching-policy-dependent AST strategies | **Owner-endorsed principle; implementation design exploratory** | Which engine-validated strategies are available, source assumptions, provenance, policy configuration. |
| Expandable gesture-level history with justified substeps | **Owner-favoured exploratory feature** | Evidence format, validation of intermediate ASTs, branch navigation, export, versioning. |
| Manual history pruning and resource-aware retention | **Owner-favoured exploratory feature** | Keep-current reset, subtree deletion, history-off semantics, state authority and persistence. |
| Phase 6 Window Manager | **Intentionally deferred** | Window/View/Object model, history ownership, focus, persistence and cross-view invalidation. |
| Guided architecture tour | **Deferred at owner preference** | Resume when requested; no technical blocker. |

**Status vocabulary:** *Owner-favoured* means an expressed design preference, **not approval to implement**. Promote an idea to an approved requirement only after discussing educational intent, examples, constraints, acceptance criteria and architecture. Record decisions and rejected alternatives in this document, then update the authoritative handover and roadmap.

## Educational philosophy: natural gestures, adjustable mathematical reasoning

**Guiding principle:** Students may express sophisticated mathematical intentions through simple, natural gestures while teachers control which reasoning must be **shown, performed, or justified**. A gesture shortcut need not conceal reasoning, and requiring deeper reasoning should not make the interface needlessly difficult to operate.

A teacher might allow a student to drag `b` across `a+b=c+d`, yet pause at a deliberate preview showing `a+b-b=c+d-b` before arriving at `a=c+d-b`. Other policies could permit direct transposition, require the student to apply subtraction on both sides and cancel explicitly, or ask for a justification. These are *illustrative* approaches, not a committed four-level taxonomy.

Keep three dimensions conceptually independent: (1) **gesture permissiveness**, which intentions can be expressed by which gestures; (2) **required reasoning depth**, what intermediate steps the student must demonstrate; (3) **explanation visibility**, how much reasoning is shown. Consider understandable presets (e.g., explore freely, explain my steps, practise the method, justify) over configurable expectations **per transformation family**. The mathematical engine remains the sole authority on mathematical validity; teaching policy may restrict or require explanation but must not authorize invalid transformations. Avoid assuming a single global difficulty slider suits all topics.

### Cross-equality transposition (exploration)

- Example: drag the `b` occurrence from the left side of `a+b=c+d` to the right side; propose `a=c+d-b`.
- The correct rationale is subtraction of `b` from **both** sides, followed by valid cancellation, not a magical sign flip on crossing `=`.
- Offer a teaching policy permitting direct transposition and an alternative requiring explicit inverse operations. Think separately about subtraction, negative terms, products, division, nonzero conditions, compound terms, and preservation of equivalence.
- A shared mathematical proposal might be invoked by different gestures (clipboard operation or transposition), but this is not approval for a universal gesture or transformation controller.

## Equality-operation discoverability and clipboard

### Automatic in/out operation cycling — preferred exploratory gesture

- Owner imagines dragging a clipboard expression into the **whole-equation hitbox** to preview an operation on both sides; **withdrawing the pointer from the hitbox automatically advances** through `+`, `−`, `×`, `÷`. Re-entering previews the next operation. Rapid repeated in/out movement is an intentional way to browse operations, not merely an accidental-hover case.
- The equality sign should visibly communicate that it can be **armed**, with a concise worded hint explaining the drag-and-cycle gesture. Consider a restrained animated/glowing border and transient operation previews on both sides (for addition, glowing `+(expression)` on each side); respect reduced-motion settings.
- Preserve conventional menu and keyboard-accessible alternatives without cluttering the equation. Investigate spatial hysteresis to avoid boundary jitter and keep the current operation legible and predictable. Exact timing, persistence, wraparound, and drop/confirmation semantics are **unresolved**.
- Distinguish whole-equation operations from substituting using an equality: a clipboard equation `a+b=c` might allow replacement of an occurrence of `c` with `a+b` in another expression. Whole-equation and occurrence-level hitboxes/intent must not be conflated.
- Mathematical caveats: division requires a nonzero divisor; multiplication by zero can preserve truth without being equivalence-preserving; applying a function may be one-way unless injectivity or other conditions hold. Eligibility and assumptions remain engine-owned.

### Future floating mathematical clipboard

- A distinctive **movable, resizable, collapsible, viewport-fixed** clipboard window that remains visible during page scrolling.
- Clipboard expressions rendered as beautiful mathematics; drag ghosts visually consistent with expression hitboxes and original expression scale.
- Clipboard drag can propose equation-wide operations and, where semantically appropriate, substitution. Do not treat visual feedback as mathematical authority.
- This may be a future interaction-affordance concern, **not** a reason to make the Visual Feedback Controller own gestures/actions. Shared semantic targeting and presentation conventions are desirable; introduce a new interaction component only after concrete use cases justify it.

## Accessible mathematical interaction and overlapping-target exploration (new ideas, 8 November 2026)

**Status:** owner-favoured creative exploration; no production implementation, approved technical specification, or classroom usability validation. These proposals arose from considering finger, stylus, keyboard and switch-access use on tablets and large interactive classroom displays. Do not claim the browser tests demonstrate full touch or pen accessibility.

### Separate mathematical appearance from interaction geometry

- **Visual enlargement** (larger mathematical notation), **hit-region enlargement** (more forgiving invisible or outlined activation areas), and **interaction assistance** (pick up/select target/drop without continuous dragging) are distinct options, not one compulsory accessibility mode.
- View preferences can request presentation/targeting assistance; the **renderer** provides occurrence identity and semantic anchors, **node-specific CSS** owns appearance, **semantic targeting** identifies possible occurrences, **interaction policy** disambiguates them, and the **mathematical engine** alone validates transformations. Do not make CSS or the Visual Feedback Controller decide mathematical intent.
- Overlap from enlarged hit regions is expected for nested expressions. Do not blindly enlarge every DOM hitbox or choose whichever DOM node is foremost. Consider semantic proximity regions only after studying actual touch behaviour. The renderer must not own cycling timers.
- For users who cannot sustain a drag, investigate an accessible **pick up → choose mathematical target → preview → confirm/drop** pathway using semantic intent requests, not synthetic mouse-event replay. Keyboard navigation should move among meaningful occurrences, not require pixel-by-pixel virtual cursor motion. Include visible focus, Escape/cancel, tap/pen controls, and switch-access considerations.
- Pointer cancellation, scrolling versus dragging, palm rejection, and hardware-specific stylus behaviour need testing on real devices. Finger input cannot rely on hover without an active drag; the interface must not assume a keyboard is available during a held stylus gesture.

### Semantic Target Cycling for Overlapping Interaction Regions

**Owner proposal:** when a dragged item or assisted selection stays over a coordinate intersecting multiple mathematical hit regions, avoid silently committing to one interpretation. Highlight a candidate for **approximately two seconds**, then automatically highlight the next, looping through the candidates while the overlap interaction remains active. Releasing/confirming chooses the currently indicated candidate, subject to mathematical validation. The 2-second interval is an initial imaginative example, **not a settled default**.

- Candidate identity should be based on semantic mathematical occurrences, not decorative wrappers or arbitrary overlapping DOM nodes. Stable occurrence IDs, view identity and source-state invalidation matter; on rerender, source change, cancellation or candidate-set change, the cycle must be recalculated or cancelled safely.
- Show a clear, accessible indication of which occurrence is currently targeted; highlight and announce candidate names/positions, not colour alone. Consider pointer movement tolerance/hysteresis so small finger movements do not constantly reset the cycle.
- **Guided discovery policy:** cycle only through mathematically eligible targets for the current proposed action, reducing frustrating invalid choices.
- **Exploratory discovery policy (owner-favoured alternative):** also cycle through other *meaningful* mathematical targets, even when the attempted operation is ineligible or disallowed by the current teaching policy. The student may try them to discover why an operation does or does not apply. Never cycle through meaningless layout/decorative DOM nodes; never publish invalid mathematics.
- Failure feedback should distinguish **mathematically invalid**, **valid but prohibited by teaching policy**, and **ambiguous or incomplete gesture**. Offer non-punitive, optionally progressive hints (question → more specific hint → explanation), with reasoning depth independently configurable. This is not a request to make the mathematical engine permissive.

### Manual keyboard takeover during automatic cycling

**Owner preference:** while hovering/dragging over an ambiguous region, **pressing an arrow key immediately interrupts automatic target cycling and hands control to the user**. The currently highlighted candidate stays selected; arrows move backward/forward through the same semantic candidate list. The automatic timer must not override a deliberate manual choice. Do not automatically resume merely because the user pauses; resume explicitly or on a fresh targeting interaction (exact restart policy remains open).

Provide keyboard and potentially on-screen previous/next or switch controls for users whose hardware cannot deliver keyboard input during an active touch/pen drag. Avoid hijacking arrow keys used by existing mathematical structure navigation: define focus/gesture ownership and a visible mode indication before implementation. Escape must cancel safely; leaving the target region, completing a drop, view switching and source invalidation must release any active selection/timer. Screen-reader announcements and reduced-motion preferences should be included in usability exploration.

### Interaction examples to prototype before committing architecture

1. Drag a factor toward `+` in `a(b+c)` with a finger; enlarged regions overlap the operator, bracketed sum and enclosing product. Guided policy should offer only eligible mathematical interpretations; exploratory policy may let the student inspect meaningful ineligible ones and request hints.
2. Hold a stylus steady over two overlapping eligible occurrences; observe two-second highlighting. Press an arrow key and confirm that cycling stops immediately and the manually selected candidate remains stable. Test the same with on-screen controls when keyboard and pen cannot be combined.
3. Use keyboard-only pick-up/drop to request the *same* mathematical distribution proposal as a pointer drag, with identical validation and commit semantics.
4. Switch Mathematical Objects or rerender while cycling: old candidates, timers and preview state must not survive the source change.

**Open design questions:** actual candidate eligibility API, whether ineligible candidates can be highlighted before a specific operation is chosen, timing defaults and configurability, spatial hysteresis, pointer-up/drop semantics, announcement frequency, manual takeover key bindings, touch scroll/drag arbitration, and whether teachers or students choose the discovery policy. Consult users of touch, pen, keyboard-only and assistive devices before fixing these decisions.

**Architectural principle:** different physical inputs may express the same mathematical intention; presentation and disambiguation must not become a second source of mathematical truth. These are backlog ideas, not Phase 6 implementation authorization.

## Structural differentials and substitution

- Future integration should represent differentials structurally, rather than treating `dx` as an inseparable printed token. Example for `x=sin(u)`: explicitly show `dx=d(sin u)=cos(u)du` and substitute **every relevant occurrence**, including the differential and definite-integral bounds.
- Clarify variable dependencies, differential/derivative semantics, chain-rule assumptions, integration orientation, domains and non-monotone substitutions before implementation. Existing differentiation support (where present) is not by itself proof of a complete differential model.
- Adjustable reasoning policy may decide whether the student must transform the differential, replace occurrences and update bounds individually, or whether these steps are explained automatically.

## Verified derivation export for teachers

- Teachers may construct a mathematically checked derivation through the Manipulator and export selected steps to notes without retyping each equation.
- Potential outputs: editable LaTeX aligned derivations, Word equation-compatible linear input, native editable DOCX/OMML equations, and eventually printable worksheets. Word and LaTeX interchange must be tested, not assumed identical.
- Derivation composer should use **AST and branching history**, not screenshots/DOM. Possible styles: complete, selected concise path, annotated explanations, student worksheet with blanks, teacher solution; optionally preserve exploratory branches.
- Distinguish **validated individual transformations** from a **complete mathematical solution**. Domain restrictions, extraneous solutions, missing branches and unverified imported/manual steps must not be silently certified.
- This is a new potential *mathematical authoring* use case, not implemented export functionality.

## Phase 6 unresolved design questions (no decisions yet)

1. What is a mathematical Window versus a View versus a Mathematical Object? Notebook, comparison workspace, desktop panels, free canvas or hybrid?
2. Can multiple views show the same Mathematical Object? What state is shared versus independent?
3. When one view commits, how do other views invalidate gestures, selections and stale proposals?
4. Is the authoritative history cursor shared, or can views inspect separate history branches (perhaps read-only)?
5. How are focus, keyboard shortcuts, drag targeting, selection and modal leases scoped per view?
6. Which settings belong to document, object, view, window or teaching policy?
7. How should window layout, clipboard, and per-view presentation persist?
8. How do multiple equations, substitution, vectors, matrices, graphs and other mathematical objects coexist?

**Design method:** explore concrete classroom scenarios, visual sketches and prototypes first; only then settle contracts and write a Phase 6 implementation plan. Previous assistant recommendations (one view per window, shared current history, etc.) are **proposals**, not owner-approved decisions.


## New architectural and educational ideas — renderer, teaching strategies and history (8 November 2026)

**Checkpoint status:** These notes preserve the owner's expressed preferences and discussion. They are not an authorization to change production modules or history schema. The current source remains authoritative.

### Deterministic renderer and AST-faithful grouping

**Owner strongly endorses:** The Renderer should be a predictable, deterministic interpreter of AST structure and explicit presentation instructions. It may understand operator precedence to insert **mandatory brackets** around subtrees where omission would alter mathematical meaning; the nesting of AST nodes should be faithfully reflected by mathematical typography and, where requested, semantic hitboxes. Preserve intentionally explicit grouping represented in the AST. The Renderer must not infer gestures, choose teaching policies, validate transformations, commit history, or change the mathematical AST merely to improve appearance. Distinguish mandatory grouping from optional/explicit brackets. The exact renderer contract and formatting conventions should be inspected against source before any change.

### Teaching policy may choose different engine-justified AST transitions

**Owner correction to an earlier oversimplification:** Teaching policy is not merely a UI permission filter. The *same gesture* may legitimately request different intermediate or final AST states depending on teaching strategy, provided each transformation is justified by mathematical rules in the Engine. For `a+b=c+d` and dragging `b` across `=`, examples include a direct result `a=c+d-b` or a committed intermediate `a+b-b=c+d-b`, with cancellation left to the student. A guided policy might require justification before proceeding. The Engine remains authoritative for validity, assumptions and source-state checks; policy can select among validated strategies and control required reasoning, but must never certify invalid mathematics. The renderer simply renders the resulting AST. **Do not assume one global reasoning-depth scalar**; presets and per-transformation-family settings are preferred exploratory directions. Distinguish gesture permissiveness, explanation visibility, and required student reasoning.

### One advanced gesture, one expandable history entry

**Owner vision:** A sophisticated gesture may appear as **one user-level history entry** while containing a validated, expandable sequence of underlying mathematical justifications. For transposition, the visible edge may be `a+b=c+d` → `a=c+d-b`, while expansion shows subtracting `b` from both sides and cancelling additive inverses. Store enough structured provenance (rule identities, intermediate states or reproducible verified evidence, assumptions and source/result relationships) to explain the steps reliably; never reconstruct or invent a proof solely from the final AST. A teacher's derivation exporter might choose concise gesture-level history or expanded steps. Open questions: whether expanded substeps are inspectable only or navigable as states; what to do when policy changes; how to serialize and migrate provenance; how branching history interacts with the expansion; and whether an intermediate state becomes a separate commit under some policies. **No schema or commit-policy decision is approved yet.**

### History management and resource control

**Owner requests exploration** of manual history deletion/pruning for reused or unwieldy Mathematical Objects and a temporary way to reduce history's resource cost. Distinguish: (1) hide/collapse history UI without stopping recording, (2) clear historical branches while retaining the current AST as a new root/checkpoint, (3) prune a chosen branch and descendants, (4) retention limits/compaction, and (5) a current-state-only or recording-reduced mode. These are not interchangeable. The current branching graph and source-stamped publication may depend on history identities; do **not** simply disable the history recorder or delete arbitrary nodes. Keep source-state validation, exactly-once commit, object identity, current AST and persistence authoritative in every mode. Benchmark memory, rendering and serialization before attributing performance problems to history. Deletion needs explicit consequences, confirmation and potentially backup/export. Exact semantics remain open.

### Cross-cutting design constraints

The mathematical engine, authoritative current state/history and deterministic renderer should remain stable cores. Interaction interpretation, accessibility and educational guidance may evolve around them. However, teaching strategies can influence which **engine-validated** AST transitions are produced; do not claim teaching policy is exclusively presentation-layer configuration. Do not introduce speculative universal managers or a new policy engine before concrete transformation-family examples demonstrate the boundary.

## Engineering constraints and follow-up

Preserve mathematical authority, stable occurrence IDs, single-use source-stamped publication, accessibility, offline use and living documentation. Known concerns live in [Known Issues](Known_Issues.md). Record new decisions here and cross-link the authoritative handover/status; do not create competing 'current' handovers.
