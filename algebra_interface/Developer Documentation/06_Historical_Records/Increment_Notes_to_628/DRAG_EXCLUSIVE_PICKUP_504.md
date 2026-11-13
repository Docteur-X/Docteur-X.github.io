# Ordinary drag lifecycle: exclusive pickup (504-test increment)

## Verification

- Node suite: 504/504 passed on 2026-11-10 in the development container.
- Documentation relative links: 406/406 passed.
- Browser Playwright: pending user verification for this increment. Previous 501-test archive passed according to the user.

## Change

`js/interaction/ordinaryDragController.js` composes the pickup guard from two independent conditions: no drag is currently published in the authoritative `state.getDrag()` port, and the application-provided `pickup.canStart()` modal/feature guard explicitly returns `true`. This prevents pickup from overwriting an active ordinary drag even when an application guard is accidentally weakened. No mathematical operation, preview, history or rendering algorithm was modified.

## Tests

`tests/ordinaryDragExclusivePickup.test.js` verifies rejection with an active session, rejection of a second pickup after successful publication, and retention of application modal gating. All checks reject before semantic target lookup.

## Ownership and remaining work

The application still owns the drag state and modal guards. The controller coordinates the lifecycle. The controller's `pickup` and `movement` dependency bags remain verbose, and `app.js` still implements much of the target/feedback integration. Next: audit dependency groups and introduce cohesive interfaces without creating duplicate state or mathematical authority. Retain the previous browser-verified ZIP until the user confirms this version passes Playwright.
