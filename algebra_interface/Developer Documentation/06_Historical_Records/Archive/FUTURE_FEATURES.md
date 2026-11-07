# Future features, risks, and prerequisites

**Updated:** 4 November 2026 (status audit; older sections retain their original decision dates)

This list records features not yet implemented, plus follow-up work on implemented features.
A feature being listed here does NOT mean we have agreed on its detailed UI.
Prioritise mathematical correctness, stable IDs, and a clear teaching experience.

| Feature | Why it matters | Main prerequisites / anticipated risks |
| --- | --- | --- |
| **Factorisation: browser QA and refinements** | Narrow left/right extraction with explicit common factors is **implemented**; test pointer UX | Confirm full-result preview and transition, nested selection, scroll/zoom, keyboard accessibility and provenance |
| **Range grouping: browser QA and refinements** | The initial Ctrl/Cmd+click, adjacent-sibling grouping and modal preview are **implemented** | Verify focus, click-through, wrapping and keyboard accessibility; consider Shift+click and more general two-dimensional selection regions |
| **Incremental Edit Expression** | Insert `1*` inside an existing `Group` without regenerating all IDs | Local tree edits, validation, meaningful history changes; clearly separate from full **Build expression** reparse |
| **Hover-only hitbox mode — implemented** | Reduces visual clutter without removing targets | Follow up with keyboard/touch discoverability and optional subtle shading; see `HITBOX_VISIBILITY.md` |
| Fractions, powers and roots | Two-dimensional mathematical layout | Named role-based regions (numerator, denominator, base, exponent); stable hit-testing and insertion previews; explicit precedence rules |
| General functions and trigonometry | Correct `sin(x)`, logs, exp | Symbol/function registry, distinguish products from function application, function-specific arguments and domains |
| Differentiation, integration and sums | Teach calculus and bound variables | Correct scope for bound/dummy variables, assumptions, domains, and provenance |
| Matrices and vectors | Noncommutative products, dimensions and structured selection | Type/dimension checks, row/column/cell selection, operation-specific rendering and previews |
| Domain assumptions | Avoid invalid cancellation and root/log rewrites | Explicit assumption context; rule result may be conditional or require additional assumptions |
| History lineage exploration | Select a factor and trace its mathematical origin | Versioned transformation provenance maps, one-to-many and many-to-one relationships |
| Drag touch and accessibility | Support tablets, keyboard users and screen readers | Pointer capture, selection affordances, touch gesture arbitration, tested keyboard focus |
| Browser-level interaction tests | Detect shifts/flashes not covered by Node unit tests | Local browser automation (e.g. Playwright) and screenshots across viewport sizes |
| Very long expressions | Avoid costly rendering and unreadable overlapping arrows | Localised redraws, progressive previews, stress testing and perhaps virtualization |

## Specific regression cases to keep testing

1. Drag `3` over `(4*5+6)` in `3*(4*5+6)*(7+8)`; no runaway hitbox motion.
2. Drag `a` between `b` and `c` in `a+b+c`; preview **`b+a+c`** with two plus signs.
3. Drag factors in `a*b*c`; preserve the selected multiplication style.
4. Confirm or cancel amber distribution of `a*(b+c+d)`.
5. Green identities in both drag directions: `0+a`, `0*a`, `1*a`.
6. Cancel by Escape or dropping outside; IDs and history unchanged.
7. Reorder nested `Group` expressions, resize/scroll mid-drag, and test long
   expressions that wrap across rows.
8. Toggle noncommutative multiplication: illegal factor reorders must neither
   show the blue preview nor commit.

## Deferred design question: expressive previews for non-linear layouts

The current clone-overlay preview deliberately supports *sequences* of Add or
Multiply siblings. A fraction or exponent has different spatial relationships.
Do not force them into a linear insertion model; instead provide a preview
adapter for named role-based layout regions while reusing the same stable
hit-testing and rule-checking protocols.

## Interaction improvements after visual preview state machine (1 November 2026)

- **Before fractions/roots/powers:** define operation-specific visual preview
  adapters for numerator/denominator, base/exponent and root argument regions.
  Do not reuse the horizontal Add/Multiply clone for two-dimensional layouts.
- **Before complex animations:** use real browser automated pointer tests for
  rapid moves, release during transitions, scroll, zoom, wrapped expressions,
  and reduced-motion settings. Keep the latest-wins queue, avoid competing
  animations, and never sample moving DOM geometry for hit tests.
- **For factorisation and selective distribution:** reuse the implemented range grouping and multi-selection; revisit incremental Edit Expression, preserving existing node IDs and provenance.
- **Deferred:** hysteresis remains disabled until a clearly demonstrated
  target-boundary problem cannot be resolved with stable geometry alone.

## Range grouping follow-ups (after 2026-11-02 implementation)

- **Now implemented:** Ctrl/Cmd+click multi-selection, adjacent-sibling/associativity validation, subtle envelope, modal grouping preview, ID-preserving atomic grouping and provenance. See `RANGE_GROUPING.md`.
- **Factorisation now implemented:** The first narrow rule supports left/right extraction from explicitly grouped products, with many-to-one provenance and a transient amber preview. See `FACTORISATION.md`. Browser testing and richer provenance are next.
- **Incremental Edit Expression:** Changing text in the expression input still reparses and regenerates IDs. Implement local ID-preserving edits when users need to insert terms inside nested groups or perform targeted structural changes.
- **Selection UX:** Consider Shift+click range selection, keyboard navigation between nested hitboxes, and more robust multi-line outlines. For fractions, powers, roots and matrices, use named target regions instead of assuming one horizontal row.
- **Interaction regression testing:** Add real-browser pointer/focus/zoom/scroll tests for the grouping overlay. Automated unit tests do not establish exact visual alignment or pointer feel.

## Future rule API and teacher-defined shortcuts (design note, not implemented)

- **Consistent rule interface:** Prefer operation modules that expose separate
  applicability checks and atomic transformation functions. Transformations
  should return structured results (including source/output node IDs and
  provenance) and be callable programmatically, without depending on the DOM,
  CSS, pointer events, or a particular gesture. This is a direction for future
  refactoring, **not** a claim that all existing rules share one API today.
- **Derived/composite rules:** A teacher-defined shortcut could compose existing
  validated operations (e.g. commute factors, then factorise). Check each step
  under the current algebraic rules; apply the whole sequence to a temporary
  tree and commit only if all steps succeed. Record the constituent steps for
  explanation/history, and use provenance or result bindings to identify nodes
  created by earlier steps.
- **Extensible rule modules:** Advanced developers might register additional
  JavaScript modules behind the same rule contract. Treat external code as
  trusted only when deliberately installed; arbitrary identity verification or
  proof checking is a separate, much larger problem.
- **Priority:** Defer macros and custom rule loading. Narrow left/right factorisation is already implemented; preserve structural matching and noncommutative factor order while expanding rule interfaces.

## Algebraic structure checks and future shortcuts

- Keep associativity and commutativity independent; wrapping an existing
  subtree is different from regrouping operands.
- Before matrix operations, add explicit mathematical types, shape/dimension
  validation, and distinguish scalar `1` from an identity matrix.
- **Implemented:** deliberate `+0` / `×1` identity introduction via toolbar; see `IDENTITY_TOOLBAR.md`. **Deferred:** numerical decomposition (`4 -> 2*2`), equivalent-expression replacement of identities, and general incremental ID-preserving Edit Expression.
- **Deferred:** consistent rule `check/apply` interfaces with structured
  provenance and teacher-defined composite shortcuts built from validated
  rules. Arbitrary user-written JavaScript rules require a separate trust and
  testing policy; arbitrary identity verification is not implemented.

## Recently completed: full-result factorisation preview

The candidate expression now uses the normal renderer in modal preview;
extracted factors no longer float over neighbouring operands. The original
factors briefly fade and arrows converge, then the decorative layer disappears.
This is implemented, but needs real-browser QA. Follow-up opportunities:
local subtree reflow for large/2-D expressions, richer provenance animation,
and accessible extraction affordances when every surrounding region is crowded.
See `TRANSFORMATION_PREVIEW.md`.

## Teaching-policy configuration (3 November 2026)

The factorisation scope policy is implemented as a pure module with three modes
(`visible-brackets`, `explicit-group`, `any-add`), but the user interface does
not yet expose a teacher-configurable selector. Later, build a general policy
registry for lesson-specific restrictions while keeping mathematical rules
independent of pedagogy. Avoid making mandatory visual brackets indistinguishable
from a mathematical `Group` in the operation layer.


## Historical design note — explanatory factorisation preview (now implemented)

**Status update (4 November):** The persistent one-line explanatory factorisation preview is implemented; see `FACTORISATION.md` and `TRANSFORMATION_PREVIEW.md`. The following records the original design goals, not outstanding work. Replace the then-current
brief source-to-result animation / settled-result-only preview with a persistent
**single-line** factorisation preview, analogous to distribution. Show faded
original common factors, a new amber extracted factor in its intended position,
and overhead converging amber arrows from old occurrences to the new one.
Preserve original residual terms and show how the rule moves factors rather
than presenting a sudden leap. Clicking the new factor confirms; clicking
elsewhere or Escape cancels and preserves selection. No stacked before/after
view. Avoid collisions with neighbouring factors by preview reflow that is
independent of committed hit-test geometry. Add real-browser visual regression
tests for crowded nested expressions and long or two-dimensional layouts.

## Visual explanation and provenance (3 November 2026)

- Keep one-line, persistent factorisation arrows as the current pedagogical
  baseline; verify in a real browser, including nested and crowded expressions.
- Future 2-D notation may need a different visual composition strategy, but
  the mathematical candidate and its provenance must remain independent.
- Recalculate arrow geometry after scroll/resize if useful, without making
  animation-frame measurements part of mathematical hit-testing.
- Continue developing node-ID provenance tracing through history and incremental
  **Edit Expression** operations without reparsing unaffected subtrees.

## After Equality v1 (2026-11-03)

- Introduce type-aware relations beyond scalar equality (matrix equality/dimensions, inequalities, not-equal, approximate, congruence, set membership). Preserve the distinction between syntactic category and mathematical value type.
- Extend statements with `And`, `Or`, `Not`, and inference rules; zero-product splitting requires suitable domain assumptions (no zero divisors).
- Add deliberate, assumption-aware operations on both sides of an equation and distinguish equivalence-preserving transformations from one-way implications.
- Implement incremental ID-preserving Free Edit and numerical decomposition; deliberate identity insertion is already implemented in the +0 / ×1 toolbar.
- **Workspace v1 implemented:** multiple documents, IndexedDB persistence and JSON import/export. **Still planned:** equality substitution with document/state/node-qualified provenance, workspace-level source selection and multi-window interaction.
- Browser-level regression tests for equality hitboxes, pointer interactions and narrow layouts; low-end hardware performance benchmarks.

## History events and storage efficiency (hybrid implemented; compact export planned)

- **Implemented:** branching snapshots and versioned deterministic patch events, with history-library replay and hydration. Remaining rule call sites may need richer semantic event descriptors; retain snapshot-based undo/redo.
- **Later:** benchmark storage and history navigation on low-end hardware;
  consider periodic snapshots plus event replay, schema migrations and replay
  compatibility tests before reducing stored snapshots.
- **Eventually:** support immutable historical cross-document references and
  optional structural sharing, without making saved work depend on today's
  mathematical rule implementation.

## Follow-up work for event-sourced history

- Finish migrating remaining mathematical rule call sites to explicit, versioned
  operation descriptors with affected IDs and parameters (currently optional).
- **Repository implemented:** IndexedDB and JSON import/export. **Still needed:** deeper untrusted AST/history validation, schema migrations, and stronger interrupted-write recovery testing.
- Benchmark event-only exports versus full snapshots; add periodic checkpoints
  if reconstruction cost warrants it, especially on low-end computers.
- Define document-qualified provenance `{documentId, stateId, nodeId}` for
  cross-document substitution and history tracing.
- Consider finer-grained operand-reorder patches or immutable structural
  sharing only if real measurements justify their added complexity.

## Naming and subsystem boundaries (design guidance)

Preserve the vocabulary in [`TERMINOLOGY.md`](TERMINOLOGY.md) when implementing multiple Mathematical Windows, Documents and Workspaces. The Manipulator is an umbrella subsystem: future gesture interpretation and transformation coordination may move out of `app.js`, but do not rename/split modules merely for terminology. Distinguish free **Editor** operations from justified **Manipulator** transformations. Product name and final descriptive tagline remain open decisions.

## Embeddable JavaScript libraries (long-term, not implemented)

Potential deliverables: (1) a browser-independent **Mathematical Engine** for ASTs, type checks, rules, and transformations; (2) a browser-based **Mathematical Manipulator** for gestures, rendering, and explanatory previews; (3) the complete application for documents, workspaces, and persistence. Suggested staged path: isolate Engine dependencies; extract the Manipulator from global `app.js` assumptions; design a small mount/configure/get/set/events/destroy API; verify multiple independent instances and cleanup; then package/version with examples and integration tests (npm or browser bundle). Keep this evolutionary: do not let hypothetical library consumers override the student-facing pedagogy.

**Performance/accessibility principle:** target usable offline learning on inexpensive hardware; profile actual rendering, hit-testing, history, and memory bottlenecks before optimising. Retain meaningful amber arrows, fading, and mathematical explanations even in reduced-motion or low-performance modes. Consider lazy rendering of inactive Mathematical Windows and guarding against explosive symbolic expansion.

## Workspace follow-up (after v1)

Workspace v1 now supports independent documents, active-window switching, local IndexedDB persistence, and JSON backup. Next: deep imported-AST/history validation, browser-level persistence/gesture tests, workspace-level cross-document selection, and independently mounted Manipulator instances. Keep local transient selection separate from future cross-document source/target references. See `WORKSPACE_V1.md`.

- Identity toolbar follow-ups: type-aware vector/matrix/abstract-algebra identity factories, one-sided identities, keyboard target selection, and equivalent-expression decomposition of 0/1. Verify nested and implicit-multiplication targeting in a browser.

## Following multi-object Documents v2

Implement object/subexpression copying with fresh occurrence IDs and provenance, then cross-object selection and mathematically validated transformations. Multiple simultaneously active Mathematical Windows and document-level activity logs remain future work.

## Transformation Features and explanatory depth (proposed)

Introduce a small explicit Transformation Feature registry only when it meaningfully reduces routing duplication. Later allow rule-specific explanation depth and on-demand inspection of committed transformations using mathematical provenance; do not treat a UI gesture as mathematical justification. See [TRANSFORMATION_FEATURES_AND_EXPLANATION_DEPTH.md](TRANSFORMATION_FEATURES_AND_EXPLANATION_DEPTH.md).


## Consolidated future design priorities (5 November 2026)

For authoritative *current* status see [CURRENT_STATUS.md](CURRENT_STATUS.md); earlier dated notes above may describe completed features as future work. The registry v1 is **implemented**; the following remain proposed:

1. Reconcile compact history export with schema-v2 multi-object documents, preserving old JSON imports and semantic provenance.
2. Copy expressions, subexpressions and statements as independent objects (new occurrence IDs and source references); introduce document-level organisational history distinct from mathematical history.
3. Cross-object application to both equation sides, then equality-based substitution and eventually explicit logical statements.
4. Configurable per-rule confirmation (feature capability, teaching-policy constraint, user preference) and a read-only branching history timeline with inspect/replay/reapply distinctions.
5. Non-mutating annotation and inspection layers for teacher labels, circles and explanations; optional embedded teaching-site API and per-rule explanatory scaffolding.

See [pedagogical vision](PEDAGOGICAL_VISION.md), [history/replay](HISTORY_SEMANTICS_AND_REPLAY.md), and [annotation boundary](ANNOTATIONS_AND_INSPECTION.md). Do not implement these by introducing DOM dependencies into the Engine or by conflating preview events with mathematical history.
