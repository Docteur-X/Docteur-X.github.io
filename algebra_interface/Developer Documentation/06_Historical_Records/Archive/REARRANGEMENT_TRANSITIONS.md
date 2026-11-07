# Deliberate rearrangement previews: maintainer guide

**Originally compiled:** 1 November 2026; later addenda extend this record  
**Scope:** Visual drag/hover behaviour only; no mathematical rule changes.

## The educational goal

Students should be able to move `a` in `a+b+c` toward the space between `b`
and `c` and see a complete, readable proposal `b + a + c`, with the moving
`a` outlined in blue. Unlike the previous overlay, the displayed `a` itself
becomes a valid destination when the animation settles. Moving the pointer away
returns the decorative terms to their original positions over a short animation
instead of causing a visual jump.

A drop during an unfinished animation **does not apply a rearrangement that the
student hasn't yet seen**. They can hold the mouse button until the proposal is
fully displayed and then release. This is intentional: understanding the
proposed mathematics matters more than the speed of rapid gestures.

## Invariants (please preserve these)

1. The mathematical expression tree and node IDs do not change during a drag.
2. Ordinary pointer moves do not re-render the equation or recreate hitboxes.
3. Hit-testing never reads a rect from an element MID-ANIMATION.
4. The original expression stays in document layout as the stable reference.
5. The clone is **inert**, inaccessible to pointer events and keyboard focus.
6. Green combination and amber distribution remain distinct from blue reorder.
7. Only a settled, rule-authorised drop can create a history entry.
8. Cancel, lost focus, and Escape clean up immediately, even if animated visual
   return would have been prettier. Never leave a ghost that steals focus.

## Division of labour

| Module | What it owns | What it does not own |
|---|---|---|
| `interaction/hitTesting.js` | Stable original rectangles; geometric candidates; pure `hitTestVisibleInsertion()` | Algebraic legality, animation |
| `interaction/rearrangementPreview.js` | Decorative cloned terms and operator signs; 165 ms move / 195 ms return; latest-wins queue; snapshots of settled visual rectangles | Mathematical tree, history, rule permissions |
| `interaction/dragFeedback.js` | Green / amber / blue paint; turns visual readiness into a committable target | Pointer event listeners, mathematical edits |
| `app.js` | Pointer gestures; source IDs; selected/queued target; final mathematical permission and commit | Measuring animated geometry, layout of the preview |
| `operations/addition.js`, `operations/multiplication.js` | Whether a reorder is legal, e.g. commutativity | Mouse positions or CSS |
| `rendering/domRenderer.js` | Actual persistent expression DOM | Transient hover changes |

## State machine

`idle` -> `transitioning` -> `active` -> `returning` -> `idle`.

- **transitioning**: The preview's clone children move from their *previous*
  visual locations to the proposed order. The system doesn't sample their
  moving rectangles. Any rapid new pointer requests are **queued**, with only
  the *latest* request retained. The current transition is NEVER cancelled
  merely to follow a new pointer location.
- **active**: The transition is complete; the preview takes a frozen snapshot
  of the new visible positions. `hitTestVisibleInsertion()` can now use those
  positions to interpret a pointer over the *displayed* insertion location.
- **returning**: A soft exit was requested. Each copied operand animates back
  toward its original rectangle. The actual expression is made visible only
  after the return completes. Another insertion request can be queued.
- **idle**: No overlay is present. Ordinary original-geometry hit-testing is
  used, including green and amber targets.

`stop()` is a separate hard cleanup, used on pointerup, Escape, blur, dispose,
scroll/resize, and other actions that must not leave a stale interaction.

## Why does the controller track both requested and active targets?

The pointer may request insertion index 2 while the preview is still visibly
showing index 1. `requestedTarget` records what the pointer most recently
asked for; `activeTarget` represents the visual outcome currently authorised
for release. Until the correct preview has **finished** its transition, the
feedback module returns `{kind:'none'}` for committing. This prevents a quick
release from applying a transformation that was still in the animation queue.

A `previewJustSettled` callback rechecks the most recent pointer request even
if the pointer is stationary. It deliberately uses the previously requested
index (rather than reinterpret a stationary pointer against newly moved clone
rectangles), preventing a layout-feedback loop. Subsequent real pointer moves
may use the freshly cached visual rectangles to navigate between destinations.

## Why can't we just put the moved clone into the real equation?

That would shift or replace the elements from which the drag controller
measures hitboxes. Then the pointer could repeatedly switch between targets
simply because displaying a target moved that target. We instead keep two
separate geometries: *immutable mathematical layout* and *settled preview
layout*. Only the latter is used to locate a destination **while visible**.

## Animation configuration

`REARRANGEMENT_MOTION` in `rearrangementPreview.js` defines the two durations
and easing. Respect the operating system's reduced-motion preference. The
Web Animations API operates only on cloned hitboxes, not mathematical nodes.
A browser without it falls back to an instantaneous state transition.

**We have deliberately NOT enabled hysteresis.** There is no reason to rely on
hysteresis while stable original and settled-preview geometry are independent.

## Regression checklist

1. Enter `a+b+c`; drag `a` between `b` and `c`. The blue preview should read
   `b + a + c`, and dropping directly over the **displayed `a`** should reorder.
2. Drag quickly across several gaps and pause. The animation should finish
   each current transition, then show the **last** requested destination.
3. Drag away after the preview is visible. It should animate back smoothly,
   not instantly snap. Escape should always clean up immediately.
4. Release very quickly while a destination is still animating: the unseen
   destination must NOT be committed.
5. Drag `3` in `3*(4*5+6)*(7+8)` onto the group for green evaluation, and
   onto its `+` for amber distribution. These must remain possible when no
   blue preview is active.
6. Check a long expression that wraps onto multiple lines, and scroll/resize
   while dragging. Check keyboard reordering and repeated Group nesting.
7. Check `a*b*c` with multiplication commutativity disabled: an illegal reorder
   must not be previewed as valid.

The automated mock-DOM tests validate the state machine and pure hit-testing,
but NOT pixel-perfect browser layout, pointer capture, touch, or real animation
timing. These require manual testing (or a future headless-browser suite).

## Future work

Before fractions, roots, powers and matrices, replace this module's
single-horizontal-sequence layout assumptions with per-operation preview
adapters and named drop regions. Keep the same separation between geometry,
mathematics and presentation. For selective distribution and factorisation,
consider **range grouping** of consecutive operands and incremental
**Edit Expression** operations that preserve existing node IDs.

**Visible green/amber targets:** Once a blue preview is settled, the targeting
helper also recognises compatible operand hitboxes and eligible plus signs
inside the *displayed clone*. It maps them back to their original DOM nodes,
then requests an animated return before showing green or amber feedback. This
prevents invisible original rectangles from overriding the visible mathematics.
