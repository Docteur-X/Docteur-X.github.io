# Ordinary drag controller extraction — 2026-11-10

## Verified status

The production application routes ordinary drag pointer movement, pointer release,
pointer cancellation and window abandonment through
`js/interaction/ordinaryDragController.js`. Four new Node tests cover pointer
isolation, release settlement, cancellation, and session invalidation during
final target refresh. The complete Node suite passed 480/480. Documentation
links passed 406/406. Browser/Playwright verification remains pending.

## Responsibility boundary

The controller owns browser-event sequencing only. It receives the active drag,
final-target update function, feedback settlement, equation containment check,
finish operation and cancel operation as injected dependencies. It does not
interpret AST structure, determine mathematical eligibility, construct previews,
or mutate history. Existing touch selection and factor/identity drag routing
remain in `app.js` pending independent migration.

## Important release invariant

A release must refresh its target at release coordinates, because some devices
omit a final pointermove. If that update clears or replaces the active session,
the controller returns without settling an obsolete target. Only a still-live
session may be passed to finishDrag.

## Next work

1. Run the full Playwright suite locally and manually inspect ordinary dragging,
   distribution, nested and Alt-selected operands, cancellation and preview lock.
2. Extract drag pickup/ghost creation and geometry ownership behind a small
   controller API; avoid copying mathematical eligibility into it.
3. Keep simplifying `app.js` by deleting replaced handlers rather than creating
   parallel pathways.
4. Do not remove the old docs until the authoritative architecture and test
   records have absorbed their still-relevant facts.
