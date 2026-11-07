# Transformation preview architecture — developer guide

**Updated:** 3 November 2026  
**Implemented first for:** common-factor extraction.  
**Status:** Node/mock-DOM tests pass; real-browser visual and pointer QA required.

## Why this exists

The first factorisation preview drew a full-size amber extracted factor at a
fixed pixel position just outside the selected Group. In `(b*a+c*a+d*a)*f`,
that button covered the neighbouring `f`. Fixed overlays are appropriate for
arrows and tiny affordances, **not** for displaying an entire new expression.

The modal preview now supports two distinct visual strategies:

1. **One-line explanatory composition (factorisation):** show the original
   scoped addends with the selected common factors faded; insert a temporary
   amber extracted factor into the SAME mathematical line; draw persistent
   converging overhead arrows from old occurrences to the new factor.
2. **Complete candidate rendering (fallback / future rules):** display the
   independent mathematically correct candidate through the normal renderer.

These are *visual* representations, not committed mathematical states. The
actual candidate expression is always built and stored independently by the
mathematical rule. The explanatory composition deliberately contains both the
old and new factors at once, so it is NOT a valid tree to save or evaluate.

**Pedagogical design principle:** A preview should explain *what changes and
why*, not merely show the answer. Amber means a proposed new occurrence;
faded source factors plus converging arrows mean occurrences are being merged
or relocated. The arrows remain visible until the student decides.

## Ownership and lifecycle

| Module | Owns | Does not own |
| --- | --- | --- |
| `operations/factorisation.js` | Validate left/right extraction, produce independent result and provenance | CSS, mouse, layout |
| `interaction/factorisationPreview.js` | Small extraction-zone affordance *before* the preview; collision avoidance and toolbar fallback | The factorised result or arrows |
| `interaction/transformationPreview.js` | Generic modal lifecycle, original DOM restoration, clickable confirmation and persistent SVG provenance arrows | Mathematical rules, node IDs, history |
| `interaction/inlineExtractionVisual.js` | Build a one-line *visual-only* composition from rendered original/candidate hitboxes; insert the new factor into normal layout and fade original occurrences | Mathematical transformations, history, pointer hit-testing |
| `rendering/domRenderer.js` | Normal mathematical layout for both original and proposed trees | Mathematical applicability |
| `app.js` | Preview mode, validated proposal, confirmation, cancellation, one history entry | Fixed pixel positioning of result factors |

**Open preview:**
1. Ctrl/Cmd+select one matching end-factor in every product of an explicitly grouped sum.
2. Drag a selected factor to a valid extraction zone or click **Preview extraction**.
3. `app.js` calls `applyFactorisation` ONCE on a clone of the committed tree,
   normalizes the independent candidate, and stores the candidate and provenance.
4. `transformationPreview.show()` saves the original DOM and asks
   `inlineExtractionVisual.js` to compose a one-line explanation using the
   original hitboxes plus a clone of the candidate's extracted-factor hitbox.
   It inserts the amber factor into a real flex sequence, so neighbouring
   operands make room. It draws persistent SVG arrows from source IDs to the
   new factor ID. If inline composition is impossible, it falls back to the
   normal complete candidate DOM. The original tree and history remain intact.
5. The amber factor is a keyboard-accessible confirmation control. The student
   can inspect the faded factors and arrows for as long as needed.

**Cancel:** Escape, Cancel, or an outside click restores the exact saved DOM,
retains multi-selection and creates no history entry. Decorative overlays and
timers are cleaned up. A later unrelated full render also cancels first.

**Confirm:** Clicking the amber extracted factor or the toolbar Confirm action
rechecks the current mathematical eligibility, then commits the *already
constructed* candidate tree with its exact IDs/provenance. It does not run
`applyFactorisation` again and generate different IDs. One history entry is
recorded. Undo/redo use the stored tree snapshots.

## Why two kinds of geometry remain

During **ordinary dragging**, stable rectangles determine pointer destinations;
we never reflow the equation based on pointer movement. The small extraction
zone is placed beside the group if unobstructed, otherwise above/below it. If
no clear location exists, the toolbar remains available and the floating zone
is omitted. This avoids covering neighbouring operands and supports crowded
future notation without inventing a larger floating control.

During the **modal preview**, dragging is locked. The candidate expression may
reflow naturally. Source-to-result arrows are a persistent, fixed-position,
pointer-transparent layer and never change hit-testing. Scroll/resize removes
the overlay rather than trusting stale coordinates; a future improvement can
recalculate it after layout stabilises. The proposed new factor remains amber
until the student confirms or cancels.

## Future extensions

- Keep the generic preview independent of particular mathematical operators.
  A fraction renderer can grow a numerator or denominator naturally; a matrix
  renderer can resize rows/columns. Do not encode these layouts as pixel offsets
  inside mathematical rule modules.
- Consider an explicit transition-provenance protocol for more complex
  many-to-many transformations and a richer history inspector.
- For large expressions, optimise to re-render the smallest affected subtree
  when justified by profiling. This first version renders the full candidate
  through the existing renderer, preserving correctness and simplicity.
- Do not introduce global hysteresis just to mask hit-testing issues.
- **Incremental Edit Expression** remains future work. Avoid reparsing the
  entire tree when inserting identities or manipulating local structure.

## Testing and manual QA

Run `node --test tests/*.test.js`. The fake-DOM tests cover one-line source/result composition, both extraction directions, grouped-addend wrapping, full-result fallback,
confirmation, cancellation restoring exact DOM objects, arrow-overlay cleanup,
missing-target rejection and collision-aware extraction-zone placement.

**Browser verification is still needed:** try `(b*a+c*a+d*a)*f`,
`x*(a*b+a*c)`, `x+(a*b+a*c)+y`, and compound factors such as
`([a+b]*c+{a+b}*d)`. Verify that the proposed factor does not cover adjacent
terms, arrows are legible, clicking outside cancels, keyboard Enter confirms,
focus behaves sensibly, and resize/scroll/reduced-motion do not leave ghosts.
