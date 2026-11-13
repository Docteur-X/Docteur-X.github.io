# Ordinary drag eligibility extraction — 2026-11-10

## Verified baseline and scope

The user reported that all Playwright tests passed for the preceding 515-test drag-completion version. This is user-reported browser verification, not independently reproduced in this container.

This increment introduces `js/interaction/ordinaryDragEligibility.js` and four tests in `tests/ordinary-drag-eligibility.test.js`. Node suite: 519/519 passed. Documentation links: 406/406 passed. Browser verification for this increment is pending.

## Architectural contract

`validateOrdinaryDragTarget({ target, rules })` maps a settled target kind to exactly one injected rule adapter. Supported kinds: `combine`, `distribution`, `negation-compress`, `insert`. The module does not infer mathematical eligibility from geometry or the rendered HTML, and never mutates an AST or opens a preview. It requires an explicit `true` return and fails closed on unknown targets, missing callbacks and thrown exceptions.

`app.js` still constructs the live adapters, using existing mathematical eligibility and proposal APIs. `arbitrateOrdinaryDrop` still enforces session and source validity, and the downstream preview/commit pathways still independently revalidate. This deliberately preserves behavior while removing a rule-dispatch decision from `finishDrag`.

## Known architectural debt

- `finishDrag` remains a large side-effectful function with separate selection, distribution, compression, combination and rearrangement exits.
- Rearrangement tests inspect source text, notably the literal `if (commit && target.kind === "insert")`. Preserve this compatibility until equivalent behavior tests are in place; do not confuse a passing source-text test with functional coverage.
- Callback adapters are still assembled inline in `app.js`; moving them should be considered only when the new boundary materially simplifies ownership.
- Preview exclusivity, stable AST identities, history, exact arithmetic and source freshness remain non-negotiable.

## Next steps

1. Run Playwright on the new ZIP and record the result.
2. Replace brittle rearrangement source-text assertions with behavioral tests, preferably covering drop, preview, commit and cancellation.
3. Separate `finishDrag` side effects behind a cohesive completion executor only after tests establish the expected behavior. Avoid accumulating thin wrappers.
4. Keep `ARCHITECTURE_CURRENT.md` and `HANDOVER_CURRENT.md` authoritative; archive outdated migration narratives before eventual removal.
