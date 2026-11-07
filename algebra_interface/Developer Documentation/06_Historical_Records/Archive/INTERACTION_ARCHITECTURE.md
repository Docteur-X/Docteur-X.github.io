# Drag-and-drop architecture: maintainer guide

**Originally compiled:** 1 November 2026; later addenda extend this record  
**Scope:** Interaction refactor; no changes to addition, multiplication, grouping,
or distribution mathematics.  
**Important:** The Node tests validate the interaction helpers, but no actual
browser pointer run was available during creation. Manually test the checklist
at the end before making further visual changes.

## 1. The central invariant

**The mathematical expression tree is immutable during a pointer gesture.**
In the old implementation, `startDrag()` deleted an operand from its parent's
`operands` array, then `updateDragTarget()` repeatedly called `renderEquation()`
to insert layout-changing drop slots. Cancelling meant reinserting the operand.
This had several opportunities for bugs: moving hitboxes, repeated DOM creation,
accidental changes in node IDs, and a confusing relationship between hover and
mathematical state.

Now a gesture only changes **interaction state and CSS**. The tree is edited
once, on a successful drop. A cancelled drag does not need a reverse operation.

### Example: dragging `3` in `3*(4*5+6)*(7+8)`

1. `pointerdown` finds the `3` node's ID and parent, then stores a `drag` session.
2. The browser calculates each sibling's rectangle once. The original `3` stays
   in the equation; a hidden visual clone is prepared to follow the pointer.
3. After the cursor moves six pixels, the clone becomes visible and the
   original `3` is made translucent. It still occupies exactly the same space.
4. `pointermove` compares the cursor to frozen rectangles. It never reparses,
   renders, normalizes, or mutates any mathematical node.
5. Hover over the whole `(4*5+6)` may glow **green** if a numeric combination
   applies; hover over its `+` may glow **amber** if distribution applies.
6. On `pointerup`, the application verifies the relevant rule, performs one
   committed operation if allowed, and only then redraws and updates history.
7. `Escape`, pointer cancellation, leaving the equation, or loss of focus
   simply discards the drag session and its ghost.

## 2. Module responsibilities

| File | Knows about | Does **not** do |
| --- | --- | --- |
| `js/app.js` | Pointer events, drag session, selection, history, coordinating rule calls | Implement commutativity, identities, or distributive algebra |
| `js/interaction/hitTesting.js` | DOM rectangles, target priority, insertion positions, optional hysteresis | Decide whether an algebraic rewrite is valid, mutate the tree, update CSS |
| `js/interaction/dragFeedback.js` | Green/amber CSS classes, ghost highlighting, fixed-position insertion marker | Measure boxes, parse expressions, rewrite nodes or rebuild the equation |
| `js/rendering/domRenderer.js` | Construct DOM hitboxes from the tree; build confirmed preview DOM | Track the cursor or decide mathematical validity |
| `js/operations/addition.js` | Addition rules (including +0 and commutativity) | Know the cursor position |
| `js/operations/multiplication.js` | Multiplication rules (*0, *1 and commutativity) | Know CSS classes |
| `js/operations/distribution.js` | Whether left/right distribution applies; its new tree and lineage | Draw yellow arrows or read pointer coordinates |
| `js/core/normalization.js` | Consult operation rules when flattening nested structures | Infer algebraic laws from the DOM |

The DOM remains a *view*. The tree remains the mathematical *source of truth*.

## 3. The geometry snapshot

`captureDragGeometry()` records a rectangle for every **direct sibling** in the
moving operand's Add/Multiply parent, plus any eligible nested `+` signs. A
rectangle contains `left`, `right`, `top`, `bottom`, `width`, and `height`.

Every `pointermove` uses these stored rectangles, so adding a green shadow or
an amber background cannot move the hitbox being used as a target. We refresh
these screen coordinates on window resize or scrolling because the page may
move relative to the browser viewport. The snapshot contains references to
existing DOM elements **only to update CSS classes**.

`hitTestDrag()` returns one of:

- `{kind: 'distribution', ...}` for an eligible nested plus sign (highest
  priority). This is a geometry result; the distribution plan was obtained
  earlier from `distribution.js`.
- `{kind: 'combine', ...}` for a compatible sibling hitbox. Compatibility comes
  from `canCombineAddends()` or `canCombineFactors()`.
- `{kind: 'invalid', ...}` for a sibling on which no rule applies.
- `{kind: 'insert', index, marker}` for a sibling gap or thin outer edge. The
  corresponding operation module separately checks if this reorder is legal.
- `{kind: 'none'}` when no target is close enough.

Target priority makes dropping **ON** a factor distinct from moving it **INTO
A GAP**, preserving the user's deliberate gesture. A 9-pixel edge corridor
makes tight gaps easier to reach. Wrapped lines are grouped by screen row
before calculating an insertion index.

## 4. Why insertion feedback is outside the mathematical layout

The old `.drop-slot` nodes were 43 or 58 pixels wide and physically pushed
nearby mathematical terms around as the cursor moved. The NEW DEFAULT is an
expressive visual sequence clone (`rearrangementPreview.js`) that shows the
proposed full ordering while preserving the original DOM layout. If creating
the clone is not possible, `.drag-insertion-marker` is a thin `position: fixed`
**fallback** element appended to the document body. Neither overlay can
displace mathematical hitboxes or become a target itself.

The old `.drop-slot` renderer helpers remain for compatibility, but ordinary
pointer dragging no longer passes insertion state into `renderExpression()`.
Those helpers can be removed later once no other feature uses them.

## 5. Why the CSS must not change hitbox geometry

`dragFeedback.js` applies classes to existing elements instead of recreating
those elements. A class may change **border colour**, **background**, **shadow**
and **opacity**, but must not change width, height, padding, font size, flex
order or CSS transforms used by targeting.

The new override for `.plus--distribution-drop` keeps its normal minimum size;
green targets keep their original border widths. The drag clone itself may
move and scale: it's outside the equation and never participates in hit tests.

Hover feedback and *mathematical rewriting* therefore operate on independent
systems, which will matter for fractions, exponents and matrices.

## 6. Hysteresis is OFF

`HIT_TEST_OPTIONS.hysteresisEnabled` is currently `false`. The hit-testing
function accepts `previous` targets and a configurable `hysteresisPixels`, so
we can later experimentally require a pointer to leave the previous target by
an extra few pixels before it switches. We should **not** enable this until
stable geometry has been verified in a real browser. It must not be used to
mask a layout bug.

## 7. Mathematical IDs and history

A drag session stores references and IDs for the original nodes. Cancelled
movement does not affect either. On a permitted reorder, the operation module
moves the existing child. On a numeric combination, the application removes
the source child **at commit time** before invoking the existing operation.
On a distribution drop, the tree remains unchanged while the amber preview is
visible; confirmation creates new copied factor IDs and records provenance.

History contains only committed mathematical states, not hover states or
partially moved expressions.

**Implemented:** range grouping of consecutive siblings preserves existing operand IDs. **Future reminder:** incremental "Edit Expression" should also preserve existing IDs instead of rebuilding the entire tree, particularly for insertion and structural editing.

## 8. How to extend this when adding fractions or powers

The present geometry collector identifies direct siblings of an Add/Multiply
parent and nested plus-sign targets. Fractions/powers require additional
named *target regions* (numerator, denominator, base, exponent). Extend
`hitTesting.js` to accept such regions without adding any mathematical rules
there. A `Divide` or `Power` operation module should decide whether a proposed
source/target pair is legal. The controller should still commit exactly once.

## 9. Testing and safe development

Run from the project root:

```sh
node --test tests/*.test.js
```

The tests include mathematical rules, nested Group rendering, distribution
and pure drag-geometry tests with a small fake DOM. For a real browser, verify:

1. `3*(4*5+6)*(7+8)`: drag `3` slowly over `(4*5+6)`. It should glow green,
   not move. Hover directly over its plus sign for a yellow distribution cue.
2. `a*(b+c+d)`: drop `a` on `+`; amber copies appear. Click an amber copy to
   confirm. Escape or click elsewhere must cancel without a history entry.
3. `2*3+4*5+6*7`: drag one entire product onto another to evaluate.
4. `a+b+c`, `a*b*c`: drag into gaps or edges to reorder, preserving each ID.
5. `0+a`, `0*a`, `1*a`: combine in both directions. Confirm the result and ID
   of the surviving symbol.
6. Press/release without moving, double-click and Alt+click to test selection
   and Group editing.
7. Resize the browser, zoom in, scroll during a drag, and try a long expression
   that wraps to another visual row.
8. Escape a drag and check that the same tree and history remain. Try a
   noncommutative multiplication setting: an illegal reorder must not be shown
   as a valid gap.

**Not yet verified:** actual browser pointer timing, touch, accessibility
behaviour under screen readers, and all possible responsive CSS layouts.
Those need real-browser testing; Node's mock DOM is not sufficient.

## 10. Expressive reorder previews without unstable geometry (1 Nov 2026)

**Why this was added:** The thin insertion marker was mechanically dependable,
but gave students less feedback than the old layout-shifting previews. A student
moving `a` between `b` and `c` should see **`b + a + c`** before releasing the
mouse, with the familiar plus signs on both sides of the moved term.

**New module:** `js/interaction/rearrangementPreview.js`:

1. `proposedRearrangementOrder(ids, sourceId, destinationIndex)` calculates the
   proposed order without mutating its input.
2. `createRearrangementPreview(document)` manages one visual overlay per drag.
   The overlay is cloned from the existing Add/Multiply container. Each direct
   operand retains its visual hitbox, brackets, and display-style operators.
3. The real container receives a paint-only `is-preview-covered` class.
   It stays in normal layout, so all original hit-test rectangles remain valid.
4. The overlay is fixed-position and inert (`pointer-events:none`,
   `aria-hidden`, `inert`). It cannot become a drag target or keyboard focus.
5. Only the **cloned** operand elements are rearranged and optionally animated.
   Their animation never enters hit-test calculations. Reduced-motion
   preferences disable the animation.
6. Switching to green combination, amber distribution, an invalid target, or
   cancelling the drag immediately removes the overlay and reveals the normal
   expression. No mathematical history entry is created for a preview.
7. The old insertion marker remains a fallback if the cloned sequence cannot
   be built (e.g. an unsupported future layout).

`dragFeedback.js` owns the choice of which feedback mechanism to show.
`hitTesting.js` still knows only rectangles and target priority. `app.js` still
asks the mathematical operation module whether a reorder is permitted before
allowing any blue preview or committing a change on pointer release.

**Scope limitation:** This preview works for existing Add/Multiply sequences.
Fractions, indices, roots and matrices will need their own slot-oriented visual
preview strategies. See `FUTURE_FEATURES.md` and ADR-006 in
`ARCHITECTURE_DECISIONS.md`.

**Important testing limitation:** The Node tests verify clone ordering,
nonmutation, operator presence and cleanup, but actual browser animations and
wrapped-line positioning still require manual verification.

## 11. Update: settled-preview targeting and queued transitions

The early expressive overlay could show `b+a+c` while the pointer still had
to aim at a region belonging to the ORIGINAL `a+b+c`. It also disappeared
abruptly when the pointer moved away.

The new implementation separates **original stable rectangles** from a second
snapshot of **settled, visible preview rectangles**. The displayed blue moved
factor can now be targeted directly; changing the proposed index uses only
measurements captured after the current animation ends. During an animation,
new requests are buffered latest-wins rather than cancelling the motion.
Leaving the preview runs a return transition before uncovering the original.

A pointerup commits an insertion only if it matches the preview that is fully
visible. Rapid mouseup while a different destination is queued cancels safely.
The source mathematical tree and its IDs remain unchanged throughout.

See `REARRANGEMENT_TRANSITIONS.md` for states, tests, and detailed ownership.

## 2026-11-02 — Range grouping overlay and modal state

Multiple selection is stored as node IDs by `interaction/selection.js`, independent of the DOM. `operations/grouping.js` validates adjacency and associativity. `interaction/groupingPreview.js` draws fixed-position, edge-clickable outlines from measured hitboxes without inserting layout elements. `app.js` coordinates the normal/preview modes; other mathematical gestures are locked only during preview. The proposal is not a tree mutation. A confirmed grouping revalidates and commits once; cancelled previews do not affect history. See `RANGE_GROUPING.md`.

## Factorisation extraction interaction (2 November 2026)

- `interaction/factorisationPreview.js` owns a fixed, pointer-transparent layer
  with an interactive amber extraction-zone button. It measures the visible
  enclosing `Group` hitbox and positions the zone OUTSIDE it. Decorative SVG
  arrows do not intercept pointer events.
- `operations/factorisation.js` owns eligibility and the atomic tree rewrite.
  Neither `app.js` nor the overlay infers factor equivalence or mathematical
  permission from CSS or pixel positions.
- Ctrl/Cmd multi-selection is general-purpose; only when every selected factor
  satisfies the narrow common-left/right rule does an extraction zone appear.
- The dedicated factor drag uses a ghost and never edits the expression tree.
  It can finish only in the explicit zone; a click on the zone or toolbar
  control is a keyboard-friendly alternative.
- In modal preview, source factors fade and amber arrows converge on a new
  temporary factor button. Clicking elsewhere/Escape cancels and retains the
  selection. Confirmation revalidates the rule, commits one new tree, and
  writes one history record with many-to-one provenance.
- The toolbar reserves a fixed-height row even while hidden so selecting
  factors cannot shift the equation and invalidate cached geometry.
- Browser QA is still required for focus, zoom, scroll, pointer events,
  dark mode and visually complicated factors. The Node tests validate only
  mathematical logic and mock DOM interactions.

## Factorisation modal result preview (updated 2 November 2026)

The extraction zone remains a small non-layout-changing target, but is no
longer the result preview. `factorisationPreview.js` avoids overlapping
neighbouring hitboxes and can omit the floating zone if the toolbar is safer.
After a drop, `transformationPreview.js` displays the *complete proposed tree*
using the normal renderer. This is safe because other drags are locked during
the modal preview. The original mathematical tree/history remain unchanged.

A short-lived clone of the original equation fades with converging amber
arrows to the extracted factor; this graphic is pointer-transparent. The
candidate's actual factor hitbox is the confirmation target. Cancel restores
the saved DOM; Confirm commits the candidate with the same IDs that were
previewed. See `TRANSFORMATION_PREVIEW.md` for lifecycle and tests.


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

## Avoid replaying a completed rearrangement (2026-11-03)

The expressive rearrangement preview already animates operands into the proposed
order *before* the student releases the pointer. After a valid pointer drop,
`finishDrag()` commits the operand order and calls `renderApplication(false)`:
this redraws the committed tree and refreshes the history, but does **not** run
a second FLIP movement from the original arrangement. Otherwise, the same
reordering appears to happen twice. Keyboard moves and unrelated operations
retain their existing animation policy. No mathematical rule or node ID changes
are involved. When adding future preview-first interactions, avoid replaying a
transition at commit if its final position has already been shown.
