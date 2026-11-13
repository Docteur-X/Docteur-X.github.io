# Nested Mathematical Hitbox Visual Contract v1

**Status:** adopted incrementally; this is the current design contract, not a claim that every legacy interaction has been migrated. **Baseline:** Transformation Infrastructure v3 + documentation maintenance and design-first guides.

## Why this exists

A mathematical node should be addressable independently of its parent. In particular, `Group(Number(-3))` must offer distinct targets for `(-3)` and `-3`. This lets future negation compression distinguish numerical combination from negating a grouped expression. The interface must remain visually consistent without changing mathematical meaning or layout during feedback.

## Three semantic DOM roles

| Role | Identity | Owner | v1 implementation |
| --- | --- | --- | --- |
| `occurrence` | `data-node-id` (stable AST occurrence ID) | DOM Renderer | Existing operand hitboxes plus nested Group/literal occurrence hitboxes |
| `operator` | `data-operator-owner-id` (owning AST node) | DOM Renderer | Add/Multiply glyphs and equality sign carry semantic metadata; they are not new AST nodes |
| `content` | No AST occurrence identity | DOM Renderer | Group and Add/Multiply layout containers |

A node can have a semantic hitbox without being draggable. Existing sibling drag operations still require an `Add`/`Multiply` parent; a nested leaf inside a `Group` is *not* a sibling operand merely because it has a hitbox. Explicit brackets are part of the Group target. Mandatory precedence brackets do not create a Group node.

### v1 scope boundary

The renderer now exposes separately addressable nested Group and literal children. The existing Add/Multiply sequence renderer still exposes its child operands rather than introducing an extra wrapper hitbox for every nested operation. This is a deliberate compatibility boundary to avoid disturbing distribution, factorisation and rearrangement geometry. Completing full AST-wide occurrence targeting requires a later, tested migration.

## Ownership boundaries

- **Mathematical Engine:** AST and validity. No DOM, pixel coordinates or CSS.
- **Renderer:** notation, brackets, nested DOM, stable geometry and semantic target attributes. No mathematical transformation dispatch or transient eligibility decisions.
- **Hit-testing/Gesture Interpreter:** resolves which target and gesture the student intended, including ancestor targeting. It does not decide mathematical validity.
- **Transformation Coordinator:** obtains rule eligibility/candidates from the Engine.
- **Visual Feedback Controller:** reusable transient decorations by semantic role and owner key. It never mutates the AST or replaces equation children. `createVisualFeedbackController(root)` provides `show(owner, descriptors)`, `clear(owner)`, `clearAll()` and `dispose()`.
- **History/Commit:** only records authorized mathematical transformations; ordinary hover, focus, visual role changes and display preferences do not create history.

The existing deepest-hover controller now delegates its transient hover class to this shared primitive. Other feedback effects remain legacy until migrated. The v1 feedback controller is a **new shared primitive**, not a claim that all legacy preview classes have been removed. Distribution, factorisation, equality and selection styles will migrate gradually, after browser and visual regression checks.

## Visual grammar

Occurrence targets use quiet neutral outlines and stronger focus/selection emphasis. Operator targets have compact geometry and less prominent ordinary styling. Content containers are borderless. Shared semantic feedback roles are `eligible`, `rejected`, `proposed-insertion`, `selected`, and `grouping`; mathematical eligibility/preview feedback takes priority over neutral structural appearance. Use outlines/shadows, not border-width or padding changes on hover. Keep touch and keyboard access, with visible focus and non-colour cues.

## Verification and handover

- `tests/view/nested-hitbox-contract.test.js`: distinct occurrence IDs, content roles, scoped feedback and no AST mutation.
- `e2e/view/nested-hitbox-contract.spec.js`: nested hitboxes, visibility and geometry invariance. Browser verification is required after this increment.
- Existing tests for rearrangement, grouping, factorisation, distribution, equality, touch selection and persistence must remain green.
- Compare light/dark appearance manually; automated role/class assertions cannot establish aesthetic consistency.

**Known follow-up:** route legacy transient highlights through the shared controller incrementally; add operation-level occurrence hitboxes and operator interaction semantics (especially unary `Negate`) when those AST features are designed; verify touch targeting of narrow bracket regions. Do not couple this work to implementing subtraction, division, powers or substitution.

## Interaction refinement v1 (2026-11-06)

**Mouse selection:** Clicking the inner Number/Symbol or an intermediate Group's
bracket area selects that exact `data-node-id`, not its draggable ancestor.
The application must not start an outer Add/Multiply drag when a pointer starts
on `.nested-occurrence`. Touch selection retains the existing tap and
multi-selection controller; keyboard Enter/Space retains its occurrence-level
selection behaviour. Selecting an inner occurrence is *not* permission to move
it out of its mathematical parent.

**Drag geometry:** A floating ghost is a decorative clone with the source's
measured width and height, not an independently sized mathematical window.
Do not apply `scale()` to it or allow `width:max-content` to expand its root.
The real equation remains stationary during drag; source and target geometry
remain owned by the renderer and hit-testing modules. Visual feedback owns
non-layout-changing emphasis only. Never compensate for incorrect renderer
geometry with mathematical-rule exceptions.

**Regression tests:** `e2e/view/nested-hitbox-interaction.spec.js` exercises
intermediate Group/Number selection, history non-mutation, exact ghost size,
and cancellation. Run the full browser suite after this change; these tests
cannot be replaced by source-level class assertions.

**Still deferred:** Full operation-level occurrence hitboxes, reliable touch
selection of extremely narrow nested bracket regions, and resizing/scrolling
of future mathematical windows. No new algebraic rule was introduced.


### Negation v1.2.2: semantic eligibility and hints

A compression drag of a direct `Number(-1)` factor onto an eligible sibling
`Symbol` or explicit `Group` uses the shared `eligible` feedback role,
classified visually as a **numerical-factor combination** (green). The
Visual Feedback Controller accepts an optional nonempty `hint` for eligible
targets; it owns both the transient class and the hint attribute and removes
them when the gesture ends. CSS renders the contextual “Release to negate”
hint using a pointer-transparent pseudo-element. This is not a new AST node,
and it does not change hitbox geometry or mathematical eligibility.

The green drop eligibility must be visible in both hitbox visibility modes.
After release, the green feedback is cleared; the inline preview highlights
only the newly introduced minus operator in amber. The transformation
coordinator and engine continue to validate the operation; the feedback
controller must never decide or commit mathematics. The same distinction
applies to future operations: colour is a semantic operation family, not
merely a generic “valid” flag.
