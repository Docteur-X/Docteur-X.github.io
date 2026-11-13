# Drag release reentrancy hardening (507 tests)

## Status and verification

Implemented in `js/interaction/ordinaryDragController.js`. Node test suite: 507/507 passed locally on 2026-11-10. Documentation link checker: 406/406. Browser/Playwright verification of this increment remains pending; the preceding 504-test release was reported passing by the user.

## Problem

The release path refreshed its target and checked the authoritative drag state, but then called injected feedback and hit-testing collaborators without checking whether those callbacks had invalidated or replaced the active drag. This could lead to a stale release mutating an abandoned drag or invoking `finishDrag` after a view transition.

## Change

The controller now re-reads the authoritative state after `feedback.settleForRelease` and again after equation/preview hit-testing. It exits without committing if the drag reference has changed. No new state store, mathematical rules, DOM contract or history mechanism was introduced.

## Test evidence

`tests/ordinaryDragReleaseReentrancy.test.js` covers invalidation during feedback settlement, invalidation during preview hit-testing and uninterrupted release. All prior tests pass.

## Architectural ownership

`state.getDrag` remains the sole source of truth. The ordinary drag controller owns event sequencing and lifecycle checks. Feedback remains a collaborator; mathematical rules, candidate previews and history remain outside this module.

## Next step

After user Playwright verification, inventory the remaining injected dependencies and design coherent ports before changing their shape. Avoid adding compatibility interfaces that will persist indefinitely. Begin consolidating the current documentation into an authoritative core while preserving historical material until reconciled. Explicitly document all approved and unapproved architectural decisions.
