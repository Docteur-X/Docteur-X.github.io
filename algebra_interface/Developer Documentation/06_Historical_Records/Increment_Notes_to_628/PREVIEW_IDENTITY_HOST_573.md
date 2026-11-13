# Preview Host migration: identity insertion (573 Node tests)

## Verified implementation

Identity toolbar dragging remains non-modal: it continues to use the existing pointer-target interpreter, identity candidate coordinator and drag feedback. On an accepted drop, `app.js` calls `identityPreviewHost.open()` with a detached mathematical proposal and a canonical transformation source stamp. The shared host now exclusively owns modal lease acquisition, the single-use commit lifecycle, and terminal cleanup. The identity-specific presentation port retains the existing amber identity rendering and confirmation controls. The identity-specific commit callback still prepares and publishes the atomic history transition.

The former `identityPreviewLease`, `identityPreviewSequence` and `identityCommitLifecycle` are removed. The feature-local `identityPreviewModal` flag remains as a presentation/interaction guard and is **not** a second lease or commit authority. `cancelIdentityTool()` clears transient toolbar state and delegates modal cleanup to the host.

## Verification

- 573/573 Node tests pass, including three new identity-host tests.
- 406/406 documentation links pass.
- `node --check js/app.js` passes.
- Browser Playwright verification remains pending on the user's Windows computer. Check +0 and ×1 toolbar drag, preview, amber-click and button confirmation, Escape/outside-click cancellation, stale-source handling, and interaction exclusivity.

## Known architectural limitations

- `identityPreviewModal` is a duplicated *UI flag* that should eventually derive from host state once all event consumers are audited.
- Identity drag hover and target selection are still feature-specific.
- Other preview families have not been migrated; use the shared ownership registry to avoid conflicts.
- Keep a current browser-verified baseline; do not remove the previous archive until browser tests pass.

## Next increment

Verify this identity migration in Playwright. Then audit and migrate the next preview family as a complete vertical slice, deleting its old modal lease/commit wiring. Avoid multiplying wrapper modules.
