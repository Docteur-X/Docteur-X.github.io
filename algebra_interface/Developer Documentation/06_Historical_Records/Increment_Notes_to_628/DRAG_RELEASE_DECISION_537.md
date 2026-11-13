# Drag release decision extraction — 537-test increment

## Purpose and verified scope

The browser-verified baseline before this increment is the 533-test archive (user-reported Playwright pass). This increment extracts the pure release-region decision into `js/interaction/ordinaryDragReleaseDecision.js` and uses it in `ordinaryDragController.js`. It does **not** change mathematical rule eligibility, candidate ASTs, preview ownership, commit or history.

## Contract

`decideOrdinaryDragRelease({insideEquation, targetKind, insidePreview})` takes measured boolean region flags and a target kind, and returns a frozen `{allowed, reason}`. An equation-region release is allowed; outside the equation, only an insertion target with an active preview-region hit is allowed. Invalid input throws, rather than silently authorising a release. The result describes geometric acceptance, **not mathematical validity**.

The controller checks the authoritative drag identity after the final target refresh, after settlement, after equation hit-testing, and after preview hit-testing. The new intermediate check prevents an invalidated drag from proceeding into preview hit-testing. The final check precedes `finishDrag`.

## Verification

`node scripts/run-node-tests.mjs`: 537/537 passed. `node scripts/check-documentation-links.mjs`: 406/406 passed. Playwright on this increment is pending user verification.

## Remaining architecture work

`app.js` still owns `finishDrag` and effectful preview/commit exits; controller dependencies remain numerous. Next: design a coherent dependency-port map and reduce the existing injection surface without introducing duplicate state, duplicate adapters, or extra public controller APIs. Preserve semantic identity, source freshness, preview exclusivity and atomic history.
