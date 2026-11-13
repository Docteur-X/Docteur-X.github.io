# Ordinary drag source-stamp contract (next increment)

## Status
Implemented in `js/interaction/ordinaryDragSourceStamp.js`; Node verification is recorded separately. Browser verification is pending.

## Why
The previous pickup-time check compared only the keys present in the original stamp. If a callback returned an additional source revision or object-identity field, pickup could still publish a drag. The comparison now requires the same complete key set and equal primitive values. Invalid or object-valued stamps fail closed.

## Ownership
This pure function validates the source stamp **after** ghost preparation and geometry capture, immediately before publishing a drag. It does not own document state, preview locks, AST transforms, rendering, or history. The controller still checks view identity, render generation, policy, and active-session exclusivity. Drag movement and commit continue to perform independent freshness checks.

## Tests and verification
`tests/ordinaryDragSourceStamp.test.js` covers equal stamps, added or removed keys, changed values, and malformed input. Re-run Node and Playwright tests on the resulting archive. No new mathematical feature is introduced.

## Remaining work
Review the source-stamp producer to define an explicit versioned schema instead of inferring keys. Simplify the remaining `app.js` completion callbacks only after measuring the current coupling and capturing browser regression coverage. Do not delete historical documents until their still-relevant decisions have been reconciled.
